/**
 * NABLE Question Normalizer
 * 
 * Production-ready question preprocessing to handle edge cases:
 * - Empty/null options
 * - Options with "marks" text
 * - Letter-only options (a, b, c, d)
 * - "All of the above" / "None of the above" patterns
 * - Invalid/malformed options
 */

// =============================================================================
// TYPES
// =============================================================================

export interface NormalizedQuestion {
    originalOptions: string[];
    normalizedOptions: string[];
    hasAllOfAbove: boolean;
    hasNoneOfAbove: boolean;
    allOfAboveIndex: number | null;
    noneOfAboveIndex: number | null;
    emptyOptionIndices: number[];
    letterOnlyIndices: number[];
    marksOnlyIndices: number[];
    isValid: boolean;
    warnings: string[];
    questionType: 'standard' | 'all-above' | 'none-above' | 'composite';
}

export interface AnswerValidation {
    isValid: boolean;
    isAllOfAboveCorrect: boolean;
    actualCorrectOptions: number[];
    warning: string | null;
}

// =============================================================================
// PATTERNS
// =============================================================================

// Regex patterns for "All of the above" variations
const ALL_OF_ABOVE_PATTERNS = [
    /^all\s*(of\s*)?(the\s*)?(above|options?|answers?)\.?$/i,
    /^both\s+[a-d]\s*(and|&)\s+[a-d]\.?$/i,
    /^all\s+(correct|are\s+correct|apply)\.?$/i,
    /^a,?\s*b,?\s*(and|&)?\s*c,?\s*(and|&)?\s*d\.?$/i,
    /^options?\s+[a-d],?\s*[a-d],?\s*(and|&)?\s*[a-d]\.?$/i,
];

// Regex patterns for "None of the above" variations
const NONE_OF_ABOVE_PATTERNS = [
    /^none\s*(of\s*)?(the\s*)?(above|options?|answers?)\.?$/i,
    /^neither\s*(of\s*)?(the\s*)?(above|options?)\.?$/i,
    /^not\s+any\s*(of\s*)?(the\s*)?(above|options?)\.?$/i,
    /^no\s+correct\s+(answer|option)\.?$/i,
];

// Patterns for "marks" text (common in exam papers)
const MARKS_PATTERNS = [
    /^\d+\s*marks?$/i,
    /^marks?$/i,
    /^\(\d+\s*marks?\)$/i,
    /^\[\d+\s*marks?\]$/i,
    /^mark[s]?\s*:\s*\d+$/i,
];

// Patterns for letter-only options
const LETTER_ONLY_PATTERNS = [
    /^[a-d]\.?$/i,                    // Single letter: "a", "A", "a.", "A."
    /^\([a-d]\)$/i,                   // Parentheses: "(a)", "(A)"
    /^option\s+[a-d]\.?$/i,           // "Option A", "option a"
];

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Check if an option matches any "All of the above" pattern
 */
export function isAllOfAbove(option: string): boolean {
    const trimmed = (option || '').trim();
    return ALL_OF_ABOVE_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Check if an option matches any "None of the above" pattern
 */
export function isNoneOfAbove(option: string): boolean {
    const trimmed = (option || '').trim();
    return NONE_OF_ABOVE_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Check if an option is just "marks" text
 */
export function isMarksOnly(option: string): boolean {
    const trimmed = (option || '').trim();
    return MARKS_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Check if an option is just a letter (a, b, c, d)
 */
export function isLetterOnly(option: string): boolean {
    const trimmed = (option || '').trim();
    return LETTER_ONLY_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Check if an option is empty or effectively empty
 */
export function isEmptyOption(option: string | null | undefined): boolean {
    if (option === null || option === undefined) return true;
    const trimmed = String(option).trim();
    if (trimmed === '') return true;
    if (trimmed === '-' || trimmed === '_' || trimmed === '.') return true;
    if (trimmed === 'N/A' || trimmed === 'n/a') return true;
    return false;
}

/**
 * Normalize a single option string
 */
export function normalizeOption(option: string | null | undefined, index: number): string {
    // Handle null/undefined
    if (option === null || option === undefined) {
        return `[Option ${String.fromCharCode(65 + index)} - No content]`;
    }

    let normalized = String(option).trim();

    // Handle empty strings
    if (normalized === '' || normalized === '-' || normalized === '_') {
        return `[Option ${String.fromCharCode(65 + index)} - No content]`;
    }

    // Handle "marks" only text - replace with placeholder
    if (isMarksOnly(normalized)) {
        return `[Option ${String.fromCharCode(65 + index)} - Score indicator]`;
    }

    // Handle letter-only - keep as is but note it
    // These are usually the actual answer text in poorly formatted questions

    // Remove excess whitespace
    normalized = normalized.replace(/\s+/g, ' ');

    return normalized;
}

/**
 * Main normalization function - process a complete question
 */
export function normalizeQuestion(
    options: (string | null | undefined)[],
    questionText?: string
): NormalizedQuestion {
    const warnings: string[] = [];
    const emptyOptionIndices: number[] = [];
    const letterOnlyIndices: number[] = [];
    const marksOnlyIndices: number[] = [];
    let allOfAboveIndex: number | null = null;
    let noneOfAboveIndex: number | null = null;

    // Ensure we have an array
    const safeOptions = Array.isArray(options) ? options : [];

    // Check minimum option count
    if (safeOptions.length < 2) {
        warnings.push(`Question has only ${safeOptions.length} options (expected 4)`);
    }

    // Process each option
    const normalizedOptions = safeOptions.map((opt, idx) => {
        const optStr = String(opt || '');

        // Track empty options
        if (isEmptyOption(opt)) {
            emptyOptionIndices.push(idx);
            warnings.push(`Option ${String.fromCharCode(65 + idx)} is empty`);
        }

        // Track marks-only options
        if (isMarksOnly(optStr)) {
            marksOnlyIndices.push(idx);
            warnings.push(`Option ${String.fromCharCode(65 + idx)} contains only marks text`);
        }

        // Track letter-only options
        if (isLetterOnly(optStr)) {
            letterOnlyIndices.push(idx);
            warnings.push(`Option ${String.fromCharCode(65 + idx)} is letter-only`);
        }

        // Track "All of the above"
        if (isAllOfAbove(optStr)) {
            allOfAboveIndex = idx;
        }

        // Track "None of the above"
        if (isNoneOfAbove(optStr)) {
            noneOfAboveIndex = idx;
        }

        return normalizeOption(opt, idx);
    });

    // Determine question type
    let questionType: NormalizedQuestion['questionType'] = 'standard';
    if (allOfAboveIndex !== null && noneOfAboveIndex !== null) {
        questionType = 'composite';
    } else if (allOfAboveIndex !== null) {
        questionType = 'all-above';
    } else if (noneOfAboveIndex !== null) {
        questionType = 'none-above';
    }

    // Determine validity
    const validOptionCount = normalizedOptions.filter((_, i) =>
        !emptyOptionIndices.includes(i) && !marksOnlyIndices.includes(i)
    ).length;
    const isValid = validOptionCount >= 2;

    if (!isValid) {
        warnings.push('Question has fewer than 2 valid options');
    }

    return {
        originalOptions: safeOptions.map(o => String(o || '')),
        normalizedOptions,
        hasAllOfAbove: allOfAboveIndex !== null,
        hasNoneOfAbove: noneOfAboveIndex !== null,
        allOfAboveIndex,
        noneOfAboveIndex,
        emptyOptionIndices,
        letterOnlyIndices,
        marksOnlyIndices,
        isValid,
        warnings,
        questionType
    };
}

/**
 * Validate answer against normalized question
 * Handles "All of the above" as correct answer specially
 */
export function validateAnswer(
    normalized: NormalizedQuestion,
    selectedAnswer: number,
    correctAnswer: number
): AnswerValidation {
    const isCorrect = selectedAnswer === correctAnswer;

    // Special case: "All of the above" is the correct answer
    const isAllOfAboveCorrect = normalized.allOfAboveIndex === correctAnswer;

    // If "All of the above" is correct, all non-meta options are technically correct
    let actualCorrectOptions: number[] = [correctAnswer];
    if (isAllOfAboveCorrect) {
        // All options except "All of the above" and "None of the above" are correct
        actualCorrectOptions = normalized.normalizedOptions
            .map((_, idx) => idx)
            .filter(idx =>
                idx !== normalized.allOfAboveIndex &&
                idx !== normalized.noneOfAboveIndex &&
                !normalized.emptyOptionIndices.includes(idx)
            );
        actualCorrectOptions.push(correctAnswer); // Also include "All of the above" itself
    }

    // Warning for edge cases
    let warning: string | null = null;
    if (isAllOfAboveCorrect && !isCorrect) {
        // User selected a technically correct individual option instead of "All of the above"
        if (actualCorrectOptions.includes(selectedAnswer) && selectedAnswer !== correctAnswer) {
            warning = 'User selected a correct individual option but not "All of the above"';
        }
    }

    return {
        isValid: true,
        isAllOfAboveCorrect,
        actualCorrectOptions,
        warning
    };
}

/**
 * Determine error type with awareness of "All of the above" patterns
 * Returns a modifier for the base error classification
 */
export function getQuestionTypeModifier(
    normalized: NormalizedQuestion,
    selectedAnswer: number,
    correctAnswer: number
): {
    isPartiallyCorrect: boolean;
    conceptualHint: string | null;
} {
    // If the correct answer is "All of the above" and user picked one correct individual option
    if (normalized.allOfAboveIndex === correctAnswer) {
        const individualOptions = normalized.normalizedOptions
            .map((_, idx) => idx)
            .filter(idx =>
                idx !== normalized.allOfAboveIndex &&
                idx !== normalized.noneOfAboveIndex
            );

        if (individualOptions.includes(selectedAnswer)) {
            return {
                isPartiallyCorrect: true,
                conceptualHint: 'User understood a component but missed that ALL options apply'
            };
        }
    }

    // If "None of the above" was selected but another answer is correct
    if (normalized.noneOfAboveIndex === selectedAnswer && correctAnswer !== selectedAnswer) {
        return {
            isPartiallyCorrect: false,
            conceptualHint: 'User may not have recognized the correct pattern'
        };
    }

    return {
        isPartiallyCorrect: false,
        conceptualHint: null
    };
}

/**
 * Utility: Pad options array to ensure minimum of 4 options
 */
export function padOptions(options: string[], minCount: number = 4): string[] {
    const result = [...options];
    while (result.length < minCount) {
        result.push(`[Option ${String.fromCharCode(65 + result.length)} - Not provided]`);
    }
    return result;
}

/**
 * Utility: Clean option text for comparison
 */
export function cleanOptionForComparison(option: string): string {
    return (option || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Utility: Check if two options are semantically similar
 */
export function areOptionsSimilar(opt1: string, opt2: string): boolean {
    const clean1 = cleanOptionForComparison(opt1);
    const clean2 = cleanOptionForComparison(opt2);

    if (clean1 === clean2) return true;

    // Check for significant word overlap
    const words1 = new Set(clean1.split(' ').filter(w => w.length > 2));
    const words2 = new Set(clean2.split(' ').filter(w => w.length > 2));

    if (words1.size === 0 || words2.size === 0) return false;

    let overlap = 0;
    words1.forEach(w => { if (words2.has(w)) overlap++; });

    const overlapRatio = overlap / Math.min(words1.size, words2.size);
    return overlapRatio > 0.7;
}
