/**
 * NABLE Quality Control (Weird Question Detector)
 * 
 * Automatically flags and archives questions that show abnormal behavioral patterns:
 * - Extremely low success rates (ambiguity/error)
 * - Extremely long answer times (missing context/diagrams)
 * - Inconsistency between mastery and performance
 */

import {
    ContentItem,
    InteractionMetrics,
    NABLE_CONSTANTS
} from './types';

export interface QCResult {
    isFlagged: boolean;
    reason: string | null;
    shouldArchive: boolean;
}
export function calculateDynamicExpectedTime(
    question: string,
    options: string[] = []
): number {
    const totalChars = question.length + options.join(' ').length;
    const timeForReading = totalChars / 15; // 15 chars per second (avg adult reading speed)
    const baseBuffer = 10; // 10s for cognitive processing

    return Math.max(15, Math.min(120, Math.round(timeForReading + baseBuffer)));
}

/**
 * Analyze user interaction to detect if a question is "weird"
 * 
 * @param question - The content item being tested
 * @param metrics - Current interaction metrics
 * @param questionText - Optional question text for dynamic time estimation
 * @returns QC analysis result
 */
export function detectWeirdQuestion(
    question: ContentItem,
    metrics: InteractionMetrics,
    questionText?: string
): QCResult {
    const reasons: string[] = [];
    let shouldArchive = false;

    // Use dynamic time if expectedTime is missing or suspiciously low
    const expectedTime = (question.expectedTime && question.expectedTime >= 5)
        ? question.expectedTime
        : (questionText ? calculateDynamicExpectedTime(questionText) : 30);

    // 1. Check for extreme duration (User might be looking for a missing diagram/passage)
    const timeFactor = metrics.timeToAnswer / expectedTime;
    if (timeFactor > NABLE_CONSTANTS.QC_TIME_FACTOR_THRESHOLD) {
        reasons.push(`Extreme answer duration (${Math.round(timeFactor)}x expected)`);
    }

    // 2. Population-level metrics (if available in question object)
    if (question.successRate !== undefined && (question.flagCount || 0) > 0) {
        if (question.successRate < NABLE_CONSTANTS.QC_FAIL_RATE_THRESHOLD) {
            reasons.push('Consistently low success rate across population');
        }
    }

    // 3. Automated Archive Check
    if ((question.flagCount || 0) >= NABLE_CONSTANTS.QC_AUTO_ARCHIVE_FLAGS) {
        shouldArchive = true;
    }

    return {
        isFlagged: reasons.length > 0,
        reason: reasons.length > 0 ? reasons.join(', ') : null,
        shouldArchive
    };
}

/**
 * Process a user-initiated flag
 */
export function processManualFlag(
    question: ContentItem,
    userReason: string
): ContentItem {
    const updated = { ...question };
    updated.flagCount = (updated.flagCount || 0) + 1;
    updated.flagReasons = [...(updated.flagReasons || []), userReason];

    if (updated.flagCount >= NABLE_CONSTANTS.QC_AUTO_ARCHIVE_FLAGS) {
        updated.isArchived = true;
    }

    return updated;
}

/**
 * Filter a content pool to remove archived or flagged questions
 */
export function filterContentPool(
    pool: ContentItem[],
    excludeFlagged: boolean = true
): ContentItem[] {
    return pool.filter(q => {
        if (q.isArchived) return false;
        if (excludeFlagged && (q.flagCount || 0) >= 3) return false; // Soft-exclude questions with 3+ flags
        return true;
    });
}
