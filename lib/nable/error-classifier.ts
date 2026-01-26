/**
 * NABLE Error Classifier
 * 
 * Distinguishes between Conceptual and Careless errors:
 * - Conceptual: User chose a logically-related but incorrect answer (needs remediation)
 * - Careless: Random or misread, no logical connection (just needs practice)
 * 
 * Enhanced with question normalization support for:
 * - "All of the above" patterns
 * - "None of the above" patterns
 * - Empty/malformed options
 */

import { ErrorType } from './types';
import {
    normalizeQuestion,
    getQuestionTypeModifier,
    isAllOfAbove,
    isNoneOfAbove,
    NormalizedQuestion
} from './question-normalizer';

/**
 * Common conceptual confusion patterns for business/financial literacy
 */
const CONCEPTUAL_PATTERNS: Record<string, string[]> = {
    // Revenue vs Profit confusion
    'revenue': ['profit', 'income', 'earnings', 'sales'],
    'profit': ['revenue', 'margin', 'earnings', 'income'],

    // Cost types
    'fixed-cost': ['variable-cost', 'overhead', 'operating-cost'],
    'variable-cost': ['fixed-cost', 'marginal-cost', 'direct-cost'],

    // Financial concepts
    'asset': ['liability', 'equity', 'capital'],
    'liability': ['asset', 'debt', 'expense'],

    // Business registration
    'sole-proprietorship': ['partnership', 'corporation', 'llc'],
    'partnership': ['sole-proprietorship', 'corporation', 'joint-venture'],

    // Tax concepts
    'gross-income': ['net-income', 'taxable-income', 'adjusted-income'],
    'deduction': ['credit', 'exemption', 'write-off'],

    // Interest/Investment
    'simple-interest': ['compound-interest', 'apr', 'apy'],
    'compound-interest': ['simple-interest', 'principal', 'return'],
};

/**
 * Calculate semantic similarity between two strings
 * Uses word overlap and common prefix/suffix detection
 */
function calculateSimilarity(a: string, b: string): number {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const aNorm = normalize(a);
    const bNorm = normalize(b);

    // Exact match
    if (aNorm === bNorm) return 1.0;

    // Check for substring containment
    if (aNorm.includes(bNorm) || bNorm.includes(aNorm)) {
        return 0.8;
    }

    // Word-level overlap
    const aWords = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const bWords = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));

    let overlap = 0;
    aWords.forEach(word => {
        if (bWords.has(word)) overlap++;
    });

    const unionSize = new Set([...aWords, ...bWords]).size;
    if (unionSize === 0) return 0;

    const jaccardSimilarity = overlap / unionSize;

    // Common prefix bonus
    let prefixLength = 0;
    for (let i = 0; i < Math.min(aNorm.length, bNorm.length); i++) {
        if (aNorm[i] === bNorm[i]) prefixLength++;
        else break;
    }
    const prefixBonus = prefixLength >= 3 ? 0.2 : 0;

    return Math.min(1.0, jaccardSimilarity + prefixBonus);
}

/**
 * Check if selected answer is conceptually related to correct answer
 */
function isConceptuallyRelated(
    selectedText: string,
    correctText: string,
    allOptions: string[]
): boolean {
    // Check known confusion patterns
    const selectedLower = selectedText.toLowerCase();
    const correctLower = correctText.toLowerCase();

    for (const [concept, related] of Object.entries(CONCEPTUAL_PATTERNS)) {
        const conceptInSelected = selectedLower.includes(concept);
        const conceptInCorrect = correctLower.includes(concept);

        // If correct answer contains a concept, check if selected is a known confusion
        if (conceptInCorrect) {
            for (const relatedTerm of related) {
                if (selectedLower.includes(relatedTerm)) {
                    return true;
                }
            }
        }

        // Vice versa
        if (conceptInSelected) {
            for (const relatedTerm of related) {
                if (correctLower.includes(relatedTerm)) {
                    return true;
                }
            }
        }
    }

    // Semantic similarity check
    const similarity = calculateSimilarity(selectedText, correctText);
    if (similarity >= 0.4) {
        return true;
    }

    // Check if selected is more similar to correct than to other wrong options
    const otherOptions = allOptions.filter(opt =>
        opt !== correctText && opt !== selectedText
    );

    const selectedToCorrectSim = calculateSimilarity(selectedText, correctText);
    const avgOtherSim = otherOptions.length > 0
        ? otherOptions.reduce((sum, opt) => sum + calculateSimilarity(selectedText, opt), 0) / otherOptions.length
        : 0;

    // If selected is significantly more similar to correct than to random options,
    // it suggests conceptual confusion rather than random guess
    if (selectedToCorrectSim > avgOtherSim + 0.15) {
        return true;
    }

    return false;
}

/**
 * Classify an error as conceptual or careless
 * 
 * @param selectedAnswer - Index of user's selected answer
 * @param correctAnswer - Index of correct answer
 * @param options - All answer options as strings
 * @returns Error classification
 */
export function classifyError(
    selectedAnswer: number,
    correctAnswer: number,
    options: string[]
): ErrorType {
    // If correct, no error to classify
    if (selectedAnswer === correctAnswer) {
        throw new Error('Cannot classify error when answer is correct');
    }

    // Validate inputs
    if (selectedAnswer < 0 || selectedAnswer >= options.length) {
        return 'careless'; // Invalid selection suggests careless click
    }

    if (correctAnswer < 0 || correctAnswer >= options.length) {
        return 'careless'; // Data error, treat as careless
    }

    const selectedText = options[selectedAnswer];
    const correctText = options[correctAnswer];

    // Check for conceptual relationship
    if (isConceptuallyRelated(selectedText, correctText, options)) {
        return 'conceptual';
    }

    return 'careless';
}

/**
 * Analyze error pattern history to detect consistent conceptual gaps
 */
export function analyzeErrorPatterns(
    errorHistory: ErrorType[]
): {
    conceptualRate: number;
    carelessRate: number;
    trend: 'improving' | 'declining' | 'stable';
    recommendRemediation: boolean;
} {
    if (errorHistory.length === 0) {
        return {
            conceptualRate: 0,
            carelessRate: 0,
            trend: 'stable',
            recommendRemediation: false
        };
    }

    const conceptualCount = errorHistory.filter(e => e === 'conceptual').length;
    const carelessCount = errorHistory.filter(e => e === 'careless').length;
    const total = errorHistory.length;

    const conceptualRate = conceptualCount / total;
    const carelessRate = carelessCount / total;

    // Analyze trend from recent errors (last 5)
    const recentErrors = errorHistory.slice(-5);
    const recentConceptual = recentErrors.filter(e => e === 'conceptual').length;
    const olderErrors = errorHistory.slice(0, -5);
    const olderConceptual = olderErrors.length > 0
        ? olderErrors.filter(e => e === 'conceptual').length / olderErrors.length
        : 0;
    const recentConceptualRate = recentErrors.length > 0
        ? recentConceptual / recentErrors.length
        : 0;

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recentErrors.length >= 3 && olderErrors.length >= 3) {
        if (recentConceptualRate < olderConceptual - 0.2) {
            trend = 'improving';
        } else if (recentConceptualRate > olderConceptual + 0.2) {
            trend = 'declining';
        }
    }

    // Recommend remediation if high conceptual error rate
    const recommendRemediation = conceptualRate >= 0.5 && conceptualCount >= 2;

    return {
        conceptualRate,
        carelessRate,
        trend,
        recommendRemediation
    };
}

/**
 * Get suggested micro-lesson topic based on error analysis
 */
export function suggestRemediationTopic(
    subSkillId: string,
    errorHistory: ErrorType[]
): string | null {
    const analysis = analyzeErrorPatterns(errorHistory);

    if (!analysis.recommendRemediation) {
        return null;
    }

    // Return the sub-skill that needs remediation
    return subSkillId;
}

// =============================================================================
// ENHANCED ERROR CLASSIFICATION (with question normalization)
// =============================================================================

/**
 * Extended error classification result
 */
export interface EnhancedErrorResult {
    errorType: ErrorType;
    isPartiallyCorrect: boolean;
    conceptualHint: string | null;
    questionType: string;
    warnings: string[];
}

/**
 * Enhanced error classification with question normalization support
 * 
 * This version handles edge cases like:
 * - "All of the above" correct answers (user understanding partial concepts)
 * - "None of the above" patterns
 * - Empty/malformed options
 * 
 * @param selectedAnswer - Index of user's selected answer
 * @param correctAnswer - Index of correct answer
 * @param options - All answer options as strings
 * @returns Enhanced error result with additional context
 */
export function classifyErrorEnhanced(
    selectedAnswer: number,
    correctAnswer: number,
    options: string[]
): EnhancedErrorResult {
    // First, normalize the question to detect patterns
    const normalized = normalizeQuestion(options);

    // Get question type modifier for "all of the above" etc.
    const modifier = getQuestionTypeModifier(normalized, selectedAnswer, correctAnswer);

    // If correct, no error to classify
    if (selectedAnswer === correctAnswer) {
        return {
            errorType: 'careless', // Not really an error, but satisfies type
            isPartiallyCorrect: false,
            conceptualHint: null,
            questionType: normalized.questionType,
            warnings: normalized.warnings
        };
    }

    // Validate inputs
    if (selectedAnswer < 0 || selectedAnswer >= options.length) {
        return {
            errorType: 'careless',
            isPartiallyCorrect: false,
            conceptualHint: 'Invalid selection index',
            questionType: normalized.questionType,
            warnings: [...normalized.warnings, 'Invalid selected answer index']
        };
    }

    if (correctAnswer < 0 || correctAnswer >= options.length) {
        return {
            errorType: 'careless',
            isPartiallyCorrect: false,
            conceptualHint: 'Invalid correct answer index',
            questionType: normalized.questionType,
            warnings: [...normalized.warnings, 'Invalid correct answer index']
        };
    }

    // Special case: "All of the above" is correct but user selected individual correct option
    if (modifier.isPartiallyCorrect) {
        return {
            errorType: 'conceptual', // They understood the concept but missed the meta-pattern
            isPartiallyCorrect: true,
            conceptualHint: modifier.conceptualHint,
            questionType: normalized.questionType,
            warnings: normalized.warnings
        };
    }

    // Special case: User selected "None of the above" but individual option was correct
    if (normalized.noneOfAboveIndex === selectedAnswer && correctAnswer !== selectedAnswer) {
        return {
            errorType: 'conceptual',
            isPartiallyCorrect: false,
            conceptualHint: 'User failed to recognize the correct pattern among options',
            questionType: normalized.questionType,
            warnings: normalized.warnings
        };
    }

    // Special case: User selected "All of the above" but individual option was correct
    if (normalized.allOfAboveIndex === selectedAnswer && correctAnswer !== selectedAnswer) {
        return {
            errorType: 'conceptual',
            isPartiallyCorrect: false,
            conceptualHint: 'User thought all options were correct but only one was',
            questionType: normalized.questionType,
            warnings: normalized.warnings
        };
    }

    // Use original logic for standard questions
    const selectedText = normalized.normalizedOptions[selectedAnswer];
    const correctText = normalized.normalizedOptions[correctAnswer];

    // Check for conceptual relationship using original logic
    if (isConceptuallyRelated(selectedText, correctText, normalized.normalizedOptions)) {
        return {
            errorType: 'conceptual',
            isPartiallyCorrect: false,
            conceptualHint: 'Selected answer is conceptually related to correct answer',
            questionType: normalized.questionType,
            warnings: normalized.warnings
        };
    }

    return {
        errorType: 'careless',
        isPartiallyCorrect: false,
        conceptualHint: null,
        questionType: normalized.questionType,
        warnings: normalized.warnings
    };
}

/**
 * Wrapper that uses enhanced classification but returns simple ErrorType
 * for backward compatibility with existing code
 */
export function classifyErrorWithNormalization(
    selectedAnswer: number,
    correctAnswer: number,
    options: string[]
): ErrorType {
    const enhanced = classifyErrorEnhanced(selectedAnswer, correctAnswer, options);
    return enhanced.errorType;
}
