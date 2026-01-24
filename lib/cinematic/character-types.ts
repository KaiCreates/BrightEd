/**
 * BrightEd Cinematic UI — Character Type Definitions
 * Core interfaces for the character-driven story delivery system.
 */

// ============================================================================
// CHARACTER IDENTITY
// ============================================================================

export type CharacterRole =
    | 'mentor'        // Luka - wise owl guide
    | 'bank_officer'  // Marcus - loans, interest, formal
    | 'tax_officer'   // Diana - deadlines, compliance
    | 'supplier'      // Andre - contracts, pricing
    | 'employee'      // Various - ethics, morale
    | 'customer'      // Various - sales, reputation
    | 'regulator';    // Government official

export type CharacterPersonality =
    | 'warm'          // Friendly, encouraging
    | 'stern'         // Strict, no-nonsense
    | 'nervous'       // Anxious, uncertain
    | 'professional'  // By-the-book, formal
    | 'shrewd';       // Business-savvy, calculating

export interface Character {
    id: string;
    name: string;
    role: CharacterRole;
    avatar: string;           // Asset path to character image
    emoji: string;            // Fallback/quick representation
    personality: CharacterPersonality;
    voiceTone: string;        // Description for dialogue styling
    colorAccent: string;      // CSS variable or hex for character theme
    description: string;      // Brief character background
}

// ============================================================================
// CHARACTER STATE (Runtime)
// ============================================================================

export type CharacterEmotion =
    | 'neutral'
    | 'happy'
    | 'concerned'
    | 'urgent'
    | 'disappointed'
    | 'impressed'
    | 'suspicious';

export type CharacterPosition = 'left' | 'center' | 'right' | 'offscreen';

export type CharacterAnimation =
    | 'idle'
    | 'enter-left'
    | 'enter-right'
    | 'exit-left'
    | 'exit-right'
    | 'gesture'
    | 'thinking'
    | 'celebrate';

export interface CharacterState {
    characterId: string;
    emotion: CharacterEmotion;
    position: CharacterPosition;
    animation: CharacterAnimation;
    isSpeaking: boolean;
}

// ============================================================================
// DIALOGUE SYSTEM
// ============================================================================

export interface DialogueChoice {
    id: string;
    text: string;
    consequence?: string;     // Consequence ID to trigger
    nextNodeId?: string;      // Next dialogue node
    tone: 'polite' | 'neutral' | 'aggressive';
    disabled?: boolean;
    disabledReason?: string;
}

export interface DialogueNode {
    id: string;
    characterId: string;
    text: string;
    emotion?: CharacterEmotion;
    choices?: DialogueChoice[];
    nextNodeId?: string;      // Auto-advance if no choices
    delay?: number;           // Ms before auto-advance
    animation?: CharacterAnimation;
    onEnter?: () => void;     // Callback when node becomes active
}

export interface DialogueSession {
    sceneId: string;
    currentNodeId: string;
    history: string[];        // Node IDs visited
    decisions: Record<string, string>; // Node ID -> Choice ID
}

// ============================================================================
// CHARACTER MEMORY (Persistent)
// ============================================================================

export interface CharacterMemory {
    characterId: string;
    userId: string;
    interactions: CharacterInteraction[];
    sentiment: number;        // -1 to 1
    trustLevel: number;       // 0 to 100
    lastInteractionAt: string;
}

export interface CharacterInteraction {
    at: string;
    action: string;
    outcome: 'positive' | 'neutral' | 'negative';
    tone: 'polite' | 'neutral' | 'aggressive';
    sceneId?: string;
}

// ============================================================================
// EMOTION MAPPING (for visual expression)
// ============================================================================

export const EMOTION_VISUALS: Record<CharacterEmotion, {
    eyeStyle: string;
    mouthStyle: string;
    glowColor?: string;
    particleEffect?: string;
}> = {
    neutral: { eyeStyle: 'relaxed', mouthStyle: 'neutral' },
    happy: { eyeStyle: 'bright', mouthStyle: 'smile', glowColor: 'var(--state-success)', particleEffect: 'sparkle' },
    concerned: { eyeStyle: 'worried', mouthStyle: 'frown', glowColor: 'var(--state-warning)' },
    urgent: { eyeStyle: 'wide', mouthStyle: 'tense', glowColor: 'var(--state-error)', particleEffect: 'pulse' },
    disappointed: { eyeStyle: 'downcast', mouthStyle: 'frown' },
    impressed: { eyeStyle: 'wide', mouthStyle: 'smile', glowColor: 'var(--brand-accent)', particleEffect: 'sparkle' },
    suspicious: { eyeStyle: 'narrowed', mouthStyle: 'tight' },
};

// ============================================================================
// ANIMATION CONFIGS
// ============================================================================

export const ANIMATION_DURATIONS: Record<CharacterAnimation, number> = {
    'idle': 0,
    'enter-left': 600,
    'enter-right': 600,
    'exit-left': 400,
    'exit-right': 400,
    'gesture': 800,
    'thinking': 1200,
    'celebrate': 1500,
};

export const POSITION_COORDS: Record<CharacterPosition, { x: string; opacity: number }> = {
    'left': { x: '10%', opacity: 1 },
    'center': { x: '50%', opacity: 1 },
    'right': { x: '90%', opacity: 1 },
    'offscreen': { x: '-20%', opacity: 0 },
};
