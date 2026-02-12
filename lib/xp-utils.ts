import * as admin from 'firebase-admin';

/**
 * Daily XP Cap and Reward Utility
 */
export const DAILY_XP_CAP = 500;
export const XP_MODIFIER = 0.5; // Reduce all XP rewards by 50% to encourage grinding

export function getDayKey(d: Date = new Date()) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export interface XPUpdateResult {
    xpGain: number;
    xpToday: number;
    isCapped: boolean;
    updates: Record<string, unknown>;
}

/**
 * Basic calculation logic, SDK agnostic
 */
export function calculateXPGain(
    userData: Record<string, unknown>,
    rawGain: number,
    todayKey: string = getDayKey()
): { xpGain: number; isNewDay: boolean; isCapped: boolean; currentXpToday: number } {
    const lastLearningDay = userData.lastLearningDay || '';
    const isNewDay = lastLearningDay !== todayKey;

    // Apply global modifier
    const initialGain = Math.max(1, Math.round(rawGain * XP_MODIFIER));

    const currentXpToday = isNewDay ? 0 : ((userData['xp_today'] as number) || 0);
    let finalGain = initialGain;
    let isCapped = false;

    if (currentXpToday >= DAILY_XP_CAP) {
        finalGain = 0;
        isCapped = true;
    } else if (currentXpToday + initialGain > DAILY_XP_CAP) {
        finalGain = DAILY_XP_CAP - currentXpToday;
        isCapped = true;
    }

    return { xpGain: finalGain, isNewDay, isCapped, currentXpToday };
}

/**
 * Calculates XP gain with daily cap and reset logic using Admin SDK increments
 */
export function calculateXPUpdate(
    userData: Record<string, unknown>,
    rawGain: number,
    todayKey: string = getDayKey()
): XPUpdateResult {
    const { xpGain, isNewDay, isCapped, currentXpToday } = calculateXPGain(userData, rawGain, todayKey);

    const updates: Record<string, unknown> = {
        xp: admin.firestore.FieldValue.increment(xpGain),
        xp_today: isNewDay ? xpGain : admin.firestore.FieldValue.increment(xpGain),
        lastLearningDay: todayKey,
        lastLearningAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: new Date().toISOString()
    };

    return {
        xpGain,
        xpToday: currentXpToday + xpGain,
        isCapped,
        updates
    };
}
