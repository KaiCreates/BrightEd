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
    """Enhanced data class for storing objective information"""
    id: str
    section: str
    subsection: str
    objective: str
    content: str
    specific_objectives: List[str]
    content_items: List[str]
    skills: List[str]  # New: e.g. ["KC", "AK", "AS"]
    difficulty: int
    page_number: int
    keywords: List[str]
    hash: str
    source_file: str
    extraction_date: str

class EnhancedCXCSyllabusParser:
    """Overhauled parser with advanced extraction and noise filtering"""
    
    def __init__(self, output_dir: str = "output", num_workers: Optional[int] = None):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True, parents=True)
        self.num_workers = num_workers or os.cpu_count()
        self.logger = logging.getLogger(__name__)

        
        # Priority patterns
        self.patterns = {
            'section': re.compile(r'(SECTION|MODULE|UNIT)\s+([A-Z0-9]+)[:\-\s]+([A-Z\s\-]{3,})', re.IGNORECASE),
            'subsection': re.compile(r'(?:TOPIC|AREA|THEME)\s+\d*[:\-\s]+([A-Z\s\-]{3,})', re.IGNORECASE),
            'skills': re.compile(r'\b(KC|AK|AS|LI|UK|RE|OR|LI|MK|PS|LI)\b', re.IGNORECASE),
            'objective_number': re.compile(r'^[A-Z]?\d+\.?\d*[a-z]?[\):]?\s+'),
            'bullet_point': re.compile(r'^[\-\•\*]\s+'),
            'noise': re.compile(r'^(TOTAL|SUMMARY|PAGE|TABLE|SECTION|SPECIFIC OBJECTIVES|CONTENT|SKILLS|ADDRESS|EMAIL|FAX|TELEPHONE|WEBSITE|REVISED|AMENDED|CORRIGENDA|APPENDIX)\s*$', re.IGNORECASE)
        }
        
    def extract_keywords(self, text: str) -> List[str]:
        """Extract higher-quality keywords"""
        stopwords = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'their', 'from', 'this', 'that'}
        text = re.sub(r'\(.*?\)', '', text) # Remove marks/skill labels in parens
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        return sorted(list(set([w for w in words if w not in stopwords])))[:12]
    
    def extract_skills(self, text: str) -> List[str]:
        """Extract skill labels (Knowledge, Application, etc)"""
        return sorted(list(set(self.patterns['skills'].findall(text.upper()))))

    def generate_hash(self, text: str) -> str:
        return hashlib.md5(text.encode()).hexdigest()[:10]
    
    def clean_text(self, text: str) -> str:
        if not text: return ""
        text = re.sub(r'\s+', ' ', text)
        # Remove common PDF footers/headers patterns if visible in cells
        text = re.sub(r'CXC\s+\d+/G/SYLL\s+\d+|Page\s+\d+', '', text)
        return text.strip()
    
    def split_into_items(self, text: str) -> List[str]:
        if not text: return []
        # Split on significant separators but preserve context
        items = re.split(r'[;•]|\band\b', text)
        cleaned = []
        for item in items:
            it = self.clean_text(item)
            if len(it) > 4 and not self.patterns['noise'].match(it):
                # Strip leading numbers/bullets
                it = self.patterns['objective_number'].sub('', it)
                it = self.patterns['bullet_point'].sub('', it)
                cleaned.append(it.strip())
        return cleaned

    def extract_from_page(self, page, page_num: int, current_section: str, 
                         current_subsection: str, source_file: str) -> tuple:
        objectives = []
        text = page.extract_text() or ""
        
        # Update section/subsection from page text
        section_matches = self.patterns['section'].findall(text)
        if section_matches:
            # Take the last one found on page as the current context
            last = section_matches[-1]
            current_section = f"{last[0]} {last[1]}: {last[2]}".strip()
        
        subsection_matches = self.patterns['subsection'].findall(text)
        if subsection_matches:
            current_subsection = subsection_matches[-1].strip()
        
        # Enhanced Table Extraction
        table_settings = {
            "vertical_strategy": "lines",
            "horizontal_strategy": "lines",
            "snap_tolerance": 3,
            "join_tolerance": 3,
        }
        
        tables = page.extract_tables(table_settings)
        if not tables:
            # Try without strict lines if no tables found (CSEC sometimes uses text-based columns)
            tables = page.extract_tables({"vertical_strategy": "text", "horizontal_strategy": "text"})

        for table in tables:
            if not table or len(table) < 1: continue
            
            for row in table:
                # Filter out obvious header/footer rows
                row_str = " ".join([str(c) for c in row if c])
                if self.patterns['noise'].match(row_str) or not row_str: continue
                if "SPECIFIC OBJECTIVE" in row_str.upper() or "CONTENT" in row_str.upper(): continue

                # Determine if this row has usable data (usually Objective in col 0, Content in col 1 or 2)
                # We'll look for the first non-empty cell as objective
                cells = [self.clean_text(c) for c in row if c]
                if len(cells) < 2: continue
                
                obj_text = cells[0]
                cont_text = cells[1] if len(cells) > 1 else ""
                
                if len(obj_text) < 20: continue # Likely a partial or noise, objectives are usually longer
                
                # Filter out numbers/noise at start
                if re.match(r'^\d+\.?\s*$', obj_text): continue
                
                # Check for contact info / metadata noise
                if any(kw in obj_text.upper() for kw in ["ADDRESS", "E-MAIL", "TEL:", "FAX:", "WWW.", "HTTP"]): continue
                
                skills = self.extract_skills(obj_text + " " + cont_text)
                specific_objs = self.split_into_items(obj_text)
                content_items = self.split_into_items(cont_text)
                
                combined_text = f"{obj_text} {cont_text}"
                obj = Objective(
                    id="", # Temp ID
                    section=current_section,
                    subsection=current_subsection,
                    objective=obj_text,
                    content=cont_text,
                    specific_objectives=specific_objs,
                    content_items=content_items,
                    skills=skills,
                    difficulty=self.estimate_difficulty(obj_text),
                    page_number=page_num,
                    keywords=self.extract_keywords(combined_text),
                    hash=self.generate_hash(combined_text),
                    source_file=source_file,
                    extraction_date=datetime.now().isoformat()
                )
                objectives.append(obj)
        
        return objectives, current_section, current_subsection
    
    def estimate_difficulty(self, text: str) -> int:
        levels = {
            3: ['analyse', 'evaluate', 'synthesize', 'justify', 'critique', 'design', 'create'],
            2: ['explain', 'describe', 'discuss', 'apply', 'demonstrate', 'calculate', 'interpret'],
            1: ['list', 'state', 'define', 'label', 'identify', 'recall']
        }
        text_lower = text.lower()
        for lvl, keywords in levels.items():
            if any(kw in text_lower for kw in keywords): return lvl
        return 1
    
    def parse_single_pdf(self, pdf_path: Path, force: bool = False) -> Dict:
        # Incremental check
        output_file = self.output_dir / f"{pdf_path.stem}.json"
        if not force and output_file.exists():
            # Check if source is newer
            if pdf_path.stat().st_mtime < output_file.stat().st_mtime:
                self.logger.info(f"Skipping (Up to date): {pdf_path.name}")
                with open(output_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                return {'filename': pdf_path.name, 'objectives': data, 'count': len(data), 'success': True, 'skipped': True}

        extracted_data = []
        current_section = "General"
        current_subsection = "Unknown"
        
        self.logger.info(f"Processing: {pdf_path.name}")
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages, 1):
                    objs, current_section, current_subsection = self.extract_from_page(
                        page, page_num, current_section, current_subsection, pdf_path.name
                    )
                    extracted_data.extend(objs)
            
            # Deduplicate
            unique_data = {}
            for obj in extracted_data:
                if obj.hash not in unique_data:
                    unique_data[obj.hash] = obj
            
            extracted_data = list(unique_data.values())
            
            # Prefix Logic
            prefix = "GEN"
            fname = pdf_path.name.upper()
            mappings = {
                "BIO": "BIO", "CHEM": "CHEM", "PHYS": "PHYS", "MATH": "MATH",
                "ENG": "ENG", "BUSINESS": "POB", "POB": "POB", "ECON": "ECON",
                "IT": "IT", "SOC": "SOC", "GEO": "GEO", "HIST": "HIST", "AGRI": "AGRI"
            }
            for kw, pfx in mappings.items():
                if kw in fname:
                    prefix = pfx
                    break
            
            for idx, obj in enumerate(extracted_data, 1):
                obj.id = f"{prefix}-{idx:05d}"
            
            final_list = [asdict(o) for o in extracted_data]
            
            # Save individual
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(final_list, f, indent=2, ensure_ascii=False)
                
            return {
                'filename': pdf_path.name,
                'objectives': final_list,
                'count': len(final_list),
                'success': True,
                'skipped': False
            }
            
        except Exception as e:
            self.logger.error(f"Error processing {pdf_path.name}: {str(e)}")
            return {'filename': pdf_path.name, 'objectives': [], 'count': 0, 'success': False, 'error': str(e)}
    
    def process_directory(self, directory: str, force: bool = False) -> Dict:
        input_dir = Path(directory)
        pdf_files = list(input_dir.glob("*.pdf"))
        
        if not pdf_files:
            self.logger.warning(f"No PDF files found in '{directory}'")
            return {}
        
        self.logger.info(f"Scanning {len(pdf_files)} PDFs in {directory}...")
        
        results = {}
        all_objectives = []
        
        # Parallel processing
        with ProcessPoolExecutor(max_workers=self.num_workers) as executor:
            futures = {executor.submit(self.parse_single_pdf, pdf, force): pdf for pdf in pdf_files}
            with tqdm(total=len(pdf_files), desc="Parsing Syllabuses") as pbar:
                for future in as_completed(futures):
                    result = future.result()
                    results[result['filename']] = result
                    all_objectives.extend(result['objectives'])
                    pbar.update(1)
        
        # Combined summary metrics
        total_extracted = len(all_objectives)
        
        # Save Combined
        combined_file = self.output_dir / "combined_syllabuses.json"
        with open(combined_file, 'w', encoding='utf-8') as f:
            json.dump(all_objectives, f, indent=2, ensure_ascii=False)
            
        summary = {
            'stats': {
                'total_files': len(pdf_files),
                'processed': sum(1 for r in results.values() if r.get('success') and not r.get('skipped')),
                'skipped': sum(1 for r in results.values() if r.get('skipped')),
                'failed': sum(1 for r in results.values() if not r.get('success')),
                'total_objectives': total_extracted
            },
            'timestamp': datetime.now().isoformat()
        }
        
        with open(self.output_dir / "processing_summary.json", 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2)
            
        self.logger.info(f"Done! Extracted {total_extracted} objectives across {len(pdf_files)} files.")
        return summary

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Overhauled CXC Syllabus Parser")
    parser.add_argument("--input", type=str, default="scripts/Syllabuses", help="Input directory containing PDFs")
    parser.add_argument("--output", type=str, default="syllabuses/output", help="Output directory for JSONs")
    parser.add_argument("--workers", type=int, default=None, help="Number of parallel workers")
    parser.add_argument("--force", action="store_true", help="Force re-processing of all PDFs")
    
    args = parser.parse_args()
    
    parser_instance = EnhancedCXCSyllabusParser(
        output_dir=args.output,
        num_workers=args.workers
    )
    
    parser_instance.process_directory(args.input, force=args.force)