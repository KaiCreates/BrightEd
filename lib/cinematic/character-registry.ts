/**
 * BrightEd Cinematic UI — Character Registry
 * Persistent character definitions and lookup utilities.
 * Links to NPC memory system for cross-system continuity.
 */

import { Character, CharacterRole } from './character-types';
import { getDicebearAvatarUrl } from '../avatars';

// ============================================================================
// CORE CHARACTERS
// ============================================================================

export const CHARACTERS: Record<string, Character> = {
    // -------------------------------------------------------------------------
    // LUKA — The Business Mentor (Primary Guide)
    // -------------------------------------------------------------------------
    luka: {
        id: 'luka',
        name: 'Luka',
        role: 'mentor',
        avatar: getDicebearAvatarUrl('luka'),
        emoji: '🦉',
        personality: 'warm',
        voiceTone: 'Wise, encouraging, patient. Speaks in calm, measured sentences with occasional humor.',
        colorAccent: 'var(--brand-accent)',
        description: 'A wise owl who guides new entrepreneurs through the complexities of business. Former serial entrepreneur who now mentors the next generation.',
    },

    // -------------------------------------------------------------------------
    // MARCUS CHEN — Bank Officer
    // -------------------------------------------------------------------------
    marcus: {
        id: 'marcus',
        name: 'Marcus Chen',
        role: 'bank_officer',
        avatar: getDicebearAvatarUrl('marcus-chen'),
        emoji: '🧑🏽‍💼',
        personality: 'professional',
        voiceTone: 'Formal, measured. Uses financial terminology naturally. Rarely shows emotion.',
        colorAccent: 'var(--brand-secondary)',
        description: 'Senior Loans Officer at First Caribbean Commercial Bank. 15 years experience. By-the-book but not unkind.',
    },

    // -------------------------------------------------------------------------
    // DIANA BAPTISTE — Tax Officer
    // -------------------------------------------------------------------------
    diana: {
        id: 'diana',
        name: 'Diana Baptiste',
        role: 'tax_officer',
        avatar: getDicebearAvatarUrl('diana-baptiste'),
        emoji: '🧾',
        personality: 'stern',
        voiceTone: 'Precise, deadline-focused. Quotes regulations. Surprisingly helpful when you comply.',
        colorAccent: 'var(--state-warning)',
        description: 'Senior Tax Compliance Officer at the Inland Revenue Department. Takes her job very seriously.',
    },

    // -------------------------------------------------------------------------
    // ANDRE WILLIAMS — Supplier
    // -------------------------------------------------------------------------
    andre: {
        id: 'andre',
        name: 'Andre Williams',
        role: 'supplier',
        avatar: getDicebearAvatarUrl('andre-williams'),
        emoji: '🧑🏽‍🍳',
        personality: 'shrewd',
        voiceTone: 'Friendly but business-savvy. Always calculating. Respects good negotiators.',
        colorAccent: 'var(--brand-primary)',
        description: 'Owner of Williams Wholesale. Fair prices, but drives a hard bargain. Values long-term relationships.',
    },

    // -------------------------------------------------------------------------
    // KEISHA THOMPSON — Employee (Ethics scenarios)
    // -------------------------------------------------------------------------
    keisha: {
        id: 'keisha',
        name: 'Keisha Thompson',
        role: 'employee',
        avatar: getDicebearAvatarUrl('keisha-thompson'),
        emoji: '👩🏽‍💼',
        personality: 'warm',
        voiceTone: 'Direct, hardworking. Values fairness. Will speak up when something is wrong.',
        colorAccent: 'var(--state-info)',
        description: 'Your first and most loyal employee. Works hard, expects to be treated fairly.',
    },

    // -------------------------------------------------------------------------
    // MR. RAMJOHN — Regulator
    // -------------------------------------------------------------------------
    ramjohn: {
        id: 'ramjohn',
        name: 'Mr. Ramjohn',
        role: 'regulator',
        avatar: getDicebearAvatarUrl('mr-ramjohn'),
        emoji: '👔',
        personality: 'stern',
        voiceTone: 'Bureaucratic, process-oriented. Quotes form numbers. Thorough but slow.',
        colorAccent: 'var(--text-muted)',
        description: 'Senior Registration Officer at the Companies Registry. Has seen every shortcut and excuse.',
    },

    // -------------------------------------------------------------------------
    // MENDY — Secondary Mascot (Fun moments)
    // -------------------------------------------------------------------------
    mendy: {
        id: 'mendy',
        name: 'Mendy',
        role: 'mentor',
        avatar: getDicebearAvatarUrl('mendy'),
        emoji: '🦊',
        personality: 'warm',
        voiceTone: 'Playful, encouraging. Celebrates wins enthusiastically. Good for lighter moments.',
        colorAccent: 'var(--state-success)',
        description: 'A friendly fox who pops in to celebrate your achievements and keep spirits high.',
    },
};

// ============================================================================
// LOOKUP UTILITIES
// ============================================================================

/**
 * Get a character by ID, with fallback to Luka
 */
export function getCharacter(id: string): Character {
    return CHARACTERS[id] || CHARACTERS.luka;
}

/**
 * Get all characters with a specific role
 */
export function getCharactersByRole(role: CharacterRole): Character[] {
    return Object.values(CHARACTERS).filter(c => c.role === role);
}

/**
 * Get character ID for a specific business context
 */
export function getCharacterForContext(context:
    | 'loan_warning'
    | 'tax_deadline'
    | 'registration_pending'
    | 'ethical_dilemma'
    | 'low_cash'
    | 'success_celebration'
    | 'tutorial'
): string {
    const contextMap: Record<string, string> = {
        'loan_warning': 'marcus',
        'tax_deadline': 'diana',
        'registration_pending': 'ramjohn',
        'ethical_dilemma': 'keisha',
        'low_cash': 'marcus',
        'success_celebration': 'mendy',
        'tutorial': 'luka',
    };
    return contextMap[context] || 'luka';
}

/**
 * Get all character IDs
 */
export function getAllCharacterIds(): string[] {
    return Object.keys(CHARACTERS);
}

/**
 * Check if a character exists
 */
export function characterExists(id: string): boolean {
    return id in CHARACTERS;
}

// ============================================================================
// CHARACTER GROUPS (for scene composition)
// ============================================================================

export const CHARACTER_GROUPS = {
    financial: ['marcus', 'diana'],
    operations: ['andre', 'keisha'],
    guides: ['luka', 'mendy'],
    authority: ['ramjohn', 'diana', 'marcus'],
} as const;
