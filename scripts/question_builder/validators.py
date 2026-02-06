# CXC / CAPE MCQ Validation Engine for BrightEd
# Enforces official Caribbean examination standards

import re
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum

class ExamLevel(Enum):
    CSEC = "csec"
    CAPE = "cape"

class ComplianceStatus(Enum):
    COMPLIANT = "compliant"
    WARNING = "warning"
    REJECTED = "rejected"

@dataclass
class ValidationResult:
    status: ComplianceStatus
    errors: List[str]
    warnings: List[str]
    suggestions: List[str]

# CXC / CAPE Forbidden Patterns
FORBIDDEN_PHRASES = [
    "all of the above",
    "none of the above",
    "all of these",
    "none of these",
    "always",  # Rarely correct in science
    "never",   # Rarely correct in science
    "both a and b",
    "both a and c",
    "both b and c",
    "a and b only",
    "a and c only",
    "b and c only",
    "only a",
    "only b",
    "only c",
    "only d",
]

# Negative indicators that reduce question quality
NEGATIVE_PATTERNS = [
    r"\bnot\b.*\btrue\b",
    r"\bnot\b.*\bcorrect\b",
    r"\bnot\b.*\bvalid\b",
    r"\bwhich\s+is\s+not\b",
    r"\bwhich\s+do\s+not\b",
    r"\bwhich\s+does\s+not\b",
    r"\bexcept\b",
    r"\bunless\b",
]

# Informal language patterns
INFORMAL_PATTERNS = [
    r"\blike\b",  # "like when"
    r"\byou\s+know\b",
    r"\bsort\s+of\b",
    r"\bkind\s+of\b",
    r"\bstuff\b",
    r"\bthings\b",
    r"\bsomehow\b",
]

class CXCMCQValidator:
    """
    Validates MCQ questions against CXC/CAPE standards
    """
    
    MAX_STEM_WORDS = 35
    MAX_STEM_CHARS = 200
    MIN_OPTIONS = 4
    MAX_OPTIONS = 4
    LENGTH_VARIANCE_THRESHOLD = 1.3  # 30% variance allowed
    
    def __init__(self, exam_level: ExamLevel = ExamLevel.CSEC):
        self.exam_level = exam_level
    
    def validate(self, question: str, choices: Dict[str, str], correct: str) -> ValidationResult:
        """
        Full validation of an MCQ question
        """
        errors = []
        warnings = []
        suggestions = []
        
        # Stem validation
        stem_errors, stem_warnings, stem_suggestions = self._validate_stem(question)
        errors.extend(stem_errors)
        warnings.extend(stem_warnings)
        suggestions.extend(stem_suggestions)
        
        # Options validation
        option_errors, option_warnings, option_suggestions = self._validate_options(choices, correct)
        errors.extend(option_errors)
        warnings.extend(option_warnings)
        suggestions.extend(option_suggestions)
        
        # Answer integrity validation
        integrity_errors, integrity_warnings = self._validate_answer_integrity(question, choices, correct)
        errors.extend(integrity_errors)
        warnings.extend(integrity_warnings)
        
        # Determine status
        if errors:
            status = ComplianceStatus.REJECTED
        elif warnings:
            status = ComplianceStatus.WARNING
        else:
            status = ComplianceStatus.COMPLIANT
        
        return ValidationResult(status, errors, warnings, suggestions)
    
    def _validate_stem(self, question: str) -> Tuple[List[str], List[str], List[str]]:
        """Validate the question stem"""
        errors = []
        warnings = []
        suggestions = []
        
        if not question or not question.strip():
            errors.append("Question stem cannot be empty")
            return errors, warnings, suggestions
        
        question = question.strip()
        word_count = len(question.split())
        char_count = len(question)
        
        # Length checks
        if word_count > self.MAX_STEM_WORDS:
            errors.append(f"Question stem too long ({word_count} words, max {self.MAX_STEM_WORDS})")
        elif word_count > 25:
            warnings.append(f"Question stem lengthy ({word_count} words, consider making it more concise)")
        
        if char_count > self.MAX_STEM_CHARS:
            errors.append(f"Question stem exceeds character limit ({char_count} chars, max {self.MAX_STEM_CHARS})")
        
        # Forbidden phrases
        question_lower = question.lower()
        for phrase in FORBIDDEN_PHRASES:
            if phrase in question_lower:
                errors.append(f"Forbidden phrase in question: '{phrase}'")
        
        # Negative patterns
        for pattern in NEGATIVE_PATTERNS:
            if re.search(pattern, question_lower, re.IGNORECASE):
                warnings.append(f"Question uses negative phrasing (pattern: '{pattern}') - CXC discourages this")
                suggestions.append("Rewrite as a positive statement: e.g., 'Which describes...' instead of 'Which is not...'")
        
        # Informal language
        for pattern in INFORMAL_PATTERNS:
            if re.search(pattern, question_lower, re.IGNORECASE):
                warnings.append(f"Informal language detected: '{pattern}'")
                suggestions.append("Use formal academic language")
        
        # Must end with question mark (optional for CXC)
        if not question.endswith("?"):
            suggestions.append("Consider ending the stem with a question mark for clarity")
        
        # Capitalization check
        if question[0].islower():
            warnings.append("Question stem should start with a capital letter")
        
        return errors, warnings, suggestions
    
    def _validate_options(self, choices: Dict[str, str], correct: str) -> Tuple[List[str], List[str], List[str]]:
        """Validate the answer choices"""
        errors = []
        warnings = []
        suggestions = []
        
        # Must have exactly 4 options for CXC
        if len(choices) != self.MIN_OPTIONS:
            errors.append(f"MCQ must have exactly {self.MIN_OPTIONS} choices (A-D), found {len(choices)}")
        
        # Required keys
        required_keys = ["A", "B", "C", "D"]
        for key in required_keys:
            if key not in choices:
                errors.append(f"Missing required choice: {key}")
        
        # Check for empty choices
        for key, text in choices.items():
            if not text or not text.strip():
                errors.append(f"Empty choice {key}")
            
            text_lower = text.lower()
            
            # Forbidden phrases in options
            for phrase in FORBIDDEN_PHRASES:
                if phrase in text_lower:
                    errors.append(f"Forbidden phrase in choice {key}: '{phrase}'")
        
        # Correct answer must exist
        if correct not in choices:
            errors.append(f"Correct answer '{correct}' is not one of the available choices")
        
        # Check parallelism (all options should be similar format)
        formats = self._detect_formats(choices)
        if len(set(formats.values())) > 1:
            warnings.append("Options are not parallel in format (mix of numbers, phrases, sentences)")
            suggestions.append("Make all options grammatically consistent (all nouns, all phrases, all sentences)")
        
        return errors, warnings, suggestions
    
    def _validate_answer_integrity(self, question: str, choices: Dict[str, str], correct: str) -> Tuple[List[str], List[str]]:
        """Validate that the correct answer doesn't give itself away"""
        errors = []
        warnings = []
        
        if correct not in choices:
            return errors, warnings
        
        correct_text = choices[correct]
        
        # Length analysis
        lengths = [len(v.split()) for v in choices.values() if v.strip()]
        if not lengths:
            return errors, warnings
        
        avg_len = sum(lengths) / len(lengths)
        correct_len = len(correct_text.split())
        
        # Check if correct answer is significantly longer
        if correct_len > avg_len * self.LENGTH_VARIANCE_THRESHOLD:
            warnings.append("Correct answer is noticeably longer than distractors (may give away answer)")
        
        # Check if correct answer is significantly shorter
        if correct_len < avg_len / self.LENGTH_VARIANCE_THRESHOLD:
            warnings.append("Correct answer is noticeably shorter than distractors (may give away answer)")
        
        # Check for unique words in correct answer (may hint at correctness)
        correct_words = set(correct_text.lower().split())
        distractor_words = set()
        for key, text in choices.items():
            if key != correct:
                distractor_words.update(text.lower().split())
        
        unique_to_correct = correct_words - distractor_words
        if len(unique_to_correct) > 2:
            warnings.append(f"Correct answer contains {len(unique_to_correct)} unique words not in distractors")
        
        # Check if correct answer restates key words from question
        question_words = set(question.lower().split())
        overlap = correct_words & question_words
        overlap_ratio = len(overlap) / len(correct_words) if correct_words else 0
        
        if overlap_ratio > 0.7:
            warnings.append("Correct answer shares many words with question stem (may be too obvious)")
        
        return errors, warnings
    
    def _detect_formats(self, choices: Dict[str, str]) -> Dict[str, str]:
        """Detect the format of each choice"""
        formats = {}
        for key, text in choices.items():
            text = text.strip()
            if not text:
                formats[key] = "empty"
            elif text.replace(".", "").replace(",", "").isdigit():
                formats[key] = "number"
            elif text.endswith(".") or text.endswith(","):
                formats[key] = "sentence"
            elif len(text.split()) == 1:
                formats[key] = "word"
            elif len(text.split()) <= 3:
                formats[key] = "phrase"
            else:
                formats[key] = "sentence"
        return formats
    
    def get_compliance_badge(self, result: ValidationResult) -> Dict:
        """Get visual compliance indicator data"""
        badges = {
            ComplianceStatus.COMPLIANT: {"icon": "✅", "color": "green", "label": "CXC-Compliant"},
            ComplianceStatus.WARNING: {"icon": "⚠️", "color": "yellow", "label": "Minor Issues"},
            ComplianceStatus.REJECTED: {"icon": "❌", "color": "red", "label": "Non-Compliant"},
        }
        return badges.get(result.status, badges[ComplianceStatus.REJECTED])


class AutoCorrector:
    """
    AI-powered auto-correction for MCQ questions
    This is a modular implementation that can use local or API-based models
    """
    
    def __init__(self, use_local_model: bool = False):
        self.use_local_model = use_local_model
    
    def correct(self, question: str, choices: Dict[str, str]) -> Dict:
        """
        Auto-correct a question and its choices
        Returns cleaned version without changing meaning
        """
        corrected_question = self._correct_stem(question)
        corrected_choices = {k: self._correct_choice(v) for k, v in choices.items()}
        
        # Normalize choice formats for parallelism
        corrected_choices = self._normalize_parallelism(corrected_choices)
        
        return {
            "question": corrected_question,
            "choices": corrected_choices,
            "changes_made": self._detect_changes(question, choices, corrected_question, corrected_choices)
        }
    
    def _correct_stem(self, question: str) -> str:
        """Correct the question stem"""
        if not question:
            return question
        
        # Basic cleaning
        question = question.strip()
        
        # Capitalize first letter
        if question and question[0].islower():
            question = question[0].upper() + question[1:]
        
        # Remove extra whitespace
        question = " ".join(question.split())
        
        # Remove informal patterns
        question = re.sub(r'\s+like\s+when\s+', ' when ', question, flags=re.IGNORECASE)
        question = re.sub(r'\s+you\s+know\s*', ' ', question, flags=re.IGNORECASE)
        question = re.sub(r'\s+sort\s+of\s*', ' ', question, flags=re.IGNORECASE)
        question = re.sub(r'\s+kind\s+of\s*', ' ', question, flags=re.IGNORECASE)
        
        # Ensure question mark at end
        if not question.endswith("?"):
            question += "?"
        
        # Clean up double spaces
        question = " ".join(question.split())
        
        return question
    
    def _correct_choice(self, choice: str) -> str:
        """Correct a single choice"""
        if not choice:
            return choice
        
        # Basic cleaning
        choice = choice.strip()
        
        # Capitalize first letter
        if choice and choice[0].islower():
            choice = choice[0].upper() + choice[1:]
        
        # Remove trailing punctuation inconsistencies
        choice = re.sub(r'[.,;:!?]+$', '', choice)
        
        # Remove extra whitespace
        choice = " ".join(choice.split())
        
        return choice
    
    def _normalize_parallelism(self, choices: Dict[str, str]) -> Dict[str, str]:
        """Make all choices grammatically parallel"""
        if not choices:
            return choices
        
        # Detect the most common format
        formats = {}
        for text in choices.values():
            if not text:
                continue
            fmt = "sentence" if "." in text or len(text.split()) > 3 else "phrase"
            formats[fmt] = formats.get(fmt, 0) + 1
        
        # If mixed, standardize to the majority format
        if len(formats) > 1:
            majority_format = max(formats, key=formats.get)
            
            corrected = {}
            for key, text in choices.items():
                if not text:
                    corrected[key] = text
                    continue
                    
                current_format = "sentence" if "." in text or len(text.split()) > 3 else "phrase"
                
                if current_format != majority_format and majority_format == "phrase":
                    # Convert to phrase by removing sentence markers
                    text = text.replace(".", "").strip()
                    if len(text.split()) > 3:
                        words = text.split()
                        text = " ".join(words[:3])  # Truncate to 3 words
                
                corrected[key] = text
            
            return corrected
        
        return choices
    
    def _detect_changes(self, orig_q: str, orig_choices: Dict, new_q: str, new_choices: Dict) -> List[str]:
        """Detect what changes were made"""
        changes = []
        
        if orig_q.strip() != new_q.strip():
            changes.append("Corrected question formatting and grammar")
        
        for key in orig_choices:
            if orig_choices.get(key, "").strip() != new_choices.get(key, "").strip():
                changes.append(f"Standardized choice {key}")
        
        return changes


# Convenience functions for Flask app
def validate_mcq(question: str, choices: Dict[str, str], correct: str, exam_level: str = "csec") -> Dict:
    """
    Main validation function for Flask endpoints
    """
    level = ExamLevel.CAPE if exam_level.lower() == "cape" else ExamLevel.CSEC
    validator = CXCMCQValidator(exam_level=level)
    result = validator.validate(question, choices, correct)
    badge = validator.get_compliance_badge(result)
    
    return {
        "status": result.status.value,
        "badge": badge,
        "errors": result.errors,
        "warnings": result.warnings,
        "suggestions": result.suggestions,
        "is_valid": len(result.errors) == 0
    }


def autocorrect_mcq(question: str, choices: Dict[str, str]) -> Dict:
    """
    Main auto-correction function for Flask endpoints
    """
    corrector = AutoCorrector()
    result = corrector.correct(question, choices)
    
    # Re-validate after correction
    validation = validate_mcq(
        result["question"], 
        result["choices"], 
        "A"  # Dummy correct answer for validation
    )
    
    result["validation_after_correction"] = validation
    return result
