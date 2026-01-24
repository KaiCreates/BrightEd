import pdfplumber
import json
import re
import os
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional
from datetime import datetime
import hashlib
from tqdm import tqdm
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('syllabus_parser.log'),
        logging.StreamHandler()
    ]
)

@dataclass
class Objective:
    """Data class for storing objective information"""
    id: str
    section: str
    subsection: str
    objective: str
    content: str
    specific_objectives: List[str]
    content_items: List[str]
    difficulty: int
    page_number: int
    keywords: List[str]
    hash: str
    source_file: str
    extraction_date: str

class EnhancedCXCSyllabusParser:
    """Enhanced parser with parallel processing and advanced features"""
    
    def __init__(self, output_dir: str = "output", num_workers: Optional[int] = None):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        self.num_workers = num_workers or os.cpu_count()
        self.logger = logging.getLogger(__name__)
        
        # Enhanced regex patterns
        self.patterns = {
            'section': re.compile(r'(SECTION|MODULE|UNIT)\s+([A-Z0-9]+)[:\-\s]+([A-Z\s\-]+)', re.IGNORECASE),
            'subsection': re.compile(r'(?:TOPIC|AREA|THEME)\s+\d+[:\-]\s+([A-Z\s]+)', re.IGNORECASE),
            'objective_number': re.compile(r'^[A-Z]?\d+\.?\d*[a-z]?[\):]?\s+'),
            'bullet_point': re.compile(r'^[\-\•\*]\s+'),
        }
        
    def extract_keywords(self, text: str) -> List[str]:
        """Extract important keywords from text"""
        # Remove common words and extract meaningful terms
        stopwords = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
        words = re.findall(r'\b[A-Za-z]{4,}\b', text.lower())
        return list(set([w for w in words if w not in stopwords]))[:10]
    
    def generate_hash(self, text: str) -> str:
        """Generate unique hash for deduplication"""
        return hashlib.md5(text.encode()).hexdigest()[:8]
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize extracted text"""
        if not text:
            return ""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove page numbers
        text = re.sub(r'\b\d+\s*$', '', text)
        return text.strip()
    
    def split_into_items(self, text: str) -> List[str]:
        """Split text into individual items based on separators"""
        if not text:
            return []
        
        # Split on common separators
        items = re.split(r'[;,]|\band\b|\bor\b', text)
        items = [self.clean_text(item) for item in items if item.strip()]
        
        # Also split on bullet points or numbers
        all_items = []
        for item in items:
            if self.patterns['bullet_point'].search(item):
                all_items.append(self.patterns['bullet_point'].sub('', item).strip())
            elif self.patterns['objective_number'].search(item):
                all_items.append(self.patterns['objective_number'].sub('', item).strip())
            else:
                all_items.append(item)
        
        return [item for item in all_items if len(item) > 3]
    
    def extract_from_page(self, page, page_num: int, current_section: str, 
                         current_subsection: str, source_file: str) -> tuple:
        """Extract data from a single page"""
        objectives = []
        text = page.extract_text()
        
        if not text:
            return objectives, current_section, current_subsection
        
        # Update section/subsection if found
        section_match = self.patterns['section'].search(text)
        if section_match:
            current_section = section_match.group(0).strip()
        
        subsection_match = self.patterns['subsection'].search(text)
        if subsection_match:
            current_subsection = subsection_match.group(1).strip()
        
        # Extract tables
        tables = page.extract_tables()
        
        for table in tables:
            if not table or len(table) < 2:
                continue
                
            for row_idx, row in enumerate(table):
                if not row or len(row) < 2:
                    continue
                
                objective_text = self.clean_text(row[0]) if row[0] else ""
                content_text = self.clean_text(row[1]) if row[1] else ""
                
                # Skip headers and empty rows
                if (not objective_text or 
                    "OBJECTIVES" in objective_text.upper() or
                    "SPECIFIC" in objective_text.upper() or
                    len(objective_text) < 10):
                    continue
                
                # Split into specific items
                specific_objs = self.split_into_items(objective_text)
                content_items = self.split_into_items(content_text)
                
                # Create combined text for keyword extraction
                combined_text = f"{objective_text} {content_text}"
                keywords = self.extract_keywords(combined_text)
                
                obj = Objective(
                    id=f"OBJ-{len(objectives) + 1:05d}",
                    section=current_section,
                    subsection=current_subsection,
                    objective=objective_text,
                    content=content_text,
                    specific_objectives=specific_objs,
                    content_items=content_items,
                    difficulty=self.estimate_difficulty(objective_text),
                    page_number=page_num,
                    keywords=keywords,
                    hash=self.generate_hash(combined_text),
                    source_file=source_file,
                    extraction_date=datetime.now().isoformat()
                )
                objectives.append(obj)
        
        return objectives, current_section, current_subsection
    
    def estimate_difficulty(self, text: str) -> int:
        """Estimate difficulty level based on text complexity"""
        # Simple heuristic based on keywords
        advanced_keywords = ['analyse', 'evaluate', 'synthesize', 'compare', 
                            'contrast', 'justify', 'critique', 'assess']
        intermediate_keywords = ['explain', 'describe', 'discuss', 'apply', 
                               'demonstrate', 'calculate']
        
        text_lower = text.lower()
        
        if any(kw in text_lower for kw in advanced_keywords):
            return 3
        elif any(kw in text_lower for kw in intermediate_keywords):
            return 2
        else:
            return 1
    
    def parse_single_pdf(self, pdf_path: Path) -> Dict:
        """Parse a single PDF file"""
        extracted_data = []
        current_section = "Unknown"
        current_subsection = "Unknown"
        
        self.logger.info(f"Processing: {pdf_path.name}")
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages, 1):
                    objs, current_section, current_subsection = self.extract_from_page(
                        page, page_num, current_section, current_subsection, 
                        pdf_path.name
                    )
                    extracted_data.extend(objs)
            
            # Deduplicate based on hash
            unique_data = {}
            for obj in extracted_data:
                if obj.hash not in unique_data:
                    unique_data[obj.hash] = obj
            
            extracted_data = list(unique_data.values())
            
            # Re-number IDs
            for idx, obj in enumerate(extracted_data, 1):
                # Generate prefix from filename
                prefix = "GEN"
                fname_upper = pdf_path.name.upper()
                if "MATH" in fname_upper: prefix = "MATH"
                elif "ENG" in fname_upper: prefix = "ENG"
                elif "BUSINESS" in fname_upper or "POB" in fname_upper: prefix = "POB"
                elif "ECON" in fname_upper: prefix = "ECON"
                elif "BIO" in fname_upper: prefix = "BIO"
                elif "CHEM" in fname_upper: prefix = "CHEM"
                elif "PHYS" in fname_upper: prefix = "PHYS"
                elif "IT" in fname_upper or "TECH" in fname_upper: prefix = "IT"
                elif "SOC" in fname_upper: prefix = "SOC"
                elif "GEO" in fname_upper: prefix = "GEO"
                elif "HIST" in fname_upper: prefix = "HIST"
                
                obj.id = f"{prefix}-{idx:05d}"
            
            return {
                'filename': pdf_path.name,
                'objectives': [asdict(obj) for obj in extracted_data],
                'count': len(extracted_data),
                'success': True
            }
            
        except Exception as e:
            self.logger.error(f"Error processing {pdf_path.name}: {str(e)}")
            return {
                'filename': pdf_path.name,
                'objectives': [],
                'count': 0,
                'success': False,
                'error': str(e)
            }
    
    def process_directory(self, directory: str, recursive: bool = False) -> Dict:
        """Process all PDFs in directory with parallel processing"""
        input_dir = Path(directory)
        
        if not input_dir.is_dir():
            self.logger.error(f"'{directory}' is not a valid directory")
            return {}
        
        # Find all PDFs
        if recursive:
            pdf_files = list(input_dir.rglob("*.pdf"))
        else:
            pdf_files = list(input_dir.glob("*.pdf"))
        
        if not pdf_files:
            self.logger.warning(f"No PDF files found in '{directory}'")
            return {}
        
        self.logger.info(f"Found {len(pdf_files)} PDF files. Processing with {self.num_workers} workers...")
        
        results = {}
        all_objectives = []
        
        # Process PDFs in parallel with progress bar
        with ProcessPoolExecutor(max_workers=self.num_workers) as executor:
            futures = {executor.submit(self.parse_single_pdf, pdf): pdf for pdf in pdf_files}
            
            with tqdm(total=len(pdf_files), desc="Processing PDFs") as pbar:
                for future in as_completed(futures):
                    result = future.result()
                    results[result['filename']] = result
                    all_objectives.extend(result['objectives'])
                    pbar.update(1)
        
        # Save individual JSON files
        for filename, result in results.items():
            if result['success']:
                output_file = self.output_dir / f"{Path(filename).stem}.json"
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(result['objectives'], f, indent=2, ensure_ascii=False)
        
        # Save combined output
        combined_output = self.output_dir / "combined_syllabuses.json"
        with open(combined_output, 'w', encoding='utf-8') as f:
            json.dump(all_objectives, f, indent=2, ensure_ascii=False)
        
        # Save summary report
        summary = {
            'total_files': len(pdf_files),
            'successful': sum(1 for r in results.values() if r['success']),
            'failed': sum(1 for r in results.values() if not r['success']),
            'total_objectives': len(all_objectives),
            'processing_date': datetime.now().isoformat(),
            'files': results
        }
        
        summary_file = self.output_dir / "processing_summary.json"
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2)
        
        self.logger.info(f"\n{'='*60}")
        self.logger.info(f"Processing Complete!")
        self.logger.info(f"Total files: {summary['total_files']}")
        self.logger.info(f"Successful: {summary['successful']}")
        self.logger.info(f"Failed: {summary['failed']}")
        self.logger.info(f"Total objectives extracted: {summary['total_objectives']}")
        self.logger.info(f"Output directory: {self.output_dir.absolute()}")
        self.logger.info(f"{'='*60}")
        
        return summary

# --- USAGE EXAMPLES ---
if __name__ == "__main__":
    # Basic usage
    parser = EnhancedCXCSyllabusParser(
        output_dir="syllabuses/output",
        num_workers=None  # Uses all available CPU cores
    )
    
    # Process all PDFs in a directory
    summary = parser.process_directory("syllabuses", recursive=False)
    
    # For subdirectories too, set recursive=True
    # summary = parser.process_directory("syllabuses", recursive=True)