/**
 * BrightEd Cinematic UI — Scene Type Definitions
 * Scenes are the containers for character interactions and narrative moments.
 */

import { CharacterEmotion, CharacterAnimation, DialogueNode } from './character-types';

// ============================================================================
// SCENE CONFIGURATION
// ============================================================================

export type SceneAmbience =
    | 'calm'          // Normal operations, green/blue tones
    | 'tense'         // Pressure building, amber tones
    | 'urgent'        // Critical situation, red tones
    | 'celebratory'   // Achievement, gold/green tones
    | 'neutral';      // Information delivery, muted tones

export type SceneBackground =
    | 'office'            // Player's business office
    | 'bank'              // First Caribbean Commercial Bank
    | 'government'        // Tax/Registration office
    | 'market'            // Bustling marketplace
    | 'night_shop'        // Late-night at the shop (stress)
    | 'meeting_room'      // Formal meeting setting
    | 'outdoor'           // Street/outdoor Caribbean setting
    | 'abstract';         // Minimal backdrop for tutorials

export interface SceneCharacter {
    characterId: string;
    initialPosition: 'left' | 'center' | 'right';
    initialEmotion: CharacterEmotion;
    entranceDelay?: number;  // Ms delay before character appears
    entranceAnimation?: CharacterAnimation;
}

export interface Scene {
    id: string;
    name: string;
    description?: string;

    // Visual setup
    background: SceneBackground;
    ambience: SceneAmbience;
    backgroundAsset?: string;   // Custom background path

    // Characters
    characters: SceneCharacter[];

    // Dialogue flow
    dialogue: DialogueNode[];
    startNodeId: string;

    // Timing & flow
    autoStart?: boolean;        // Start dialogue immediately
    canSkip?: boolean;          // Allow skipping dialogue
    pauseGameTime?: boolean;    // Freeze game clock during scene

    // Triggers
    triggerCondition?: SceneTriggerCondition;
    priority?: number;          // Higher = show first if multiple triggered

    // Effects
    music?: string;             // Future: audio cue
    screenEffect?: 'vignette' | 'blur-edges' | 'darken' | 'none';

    // Callbacks
    onComplete?: string;        // Event to emit on completion
}

// ============================================================================
// SCENE TRIGGERS
// ============================================================================

export type SceneTriggerType =
    | 'state_change'      // Business state crosses threshold
    | 'time_event'        // Scheduled time (deadline, etc.)
    | 'decision_made'     // After a specific decision
    | 'consequence'       // Consequence resolved
    | 'first_time'        // First time doing something
    | 'manual';           // Triggered by code

export interface SceneTriggerCondition {
    type: SceneTriggerType;

    // For state_change
    stateKey?: string;
    operator?: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'ne';
    threshold?: number;

    // For time_event
    eventId?: string;

    // For decision_made / consequence
    referenceId?: string;

    // For first_time
    firstTimeKey?: string;

    // General
    cooldownMs?: number;        // Min time between triggers
    maxTriggers?: number;       // Max times this can trigger
}

// ============================================================================
// SCENE STATE (Runtime)
// ============================================================================

export interface SceneState {
    sceneId: string;
    isActive: boolean;
    currentNodeId: string;
    visitedNodes: string[];
    characterStates: Record<string, {
        emotion: CharacterEmotion;
        position: 'left' | 'center' | 'right' | 'offscreen';
        isSpeaking: boolean;
    }>;
    startedAt: number;
    pausedAt?: number;
}

export interface SceneHistoryEntry {
    sceneId: string;
    completedAt: string;
    decisions: Record<string, string>;
    duration: number;
}

// ============================================================================
// SCENE TRANSITION
// ============================================================================

export type SceneTransitionType =
    | 'fade'
    | 'slide-left'
    | 'slide-right'
    | 'zoom-in'
    | 'zoom-out'
    | 'dissolve'
    | 'instant';

export interface SceneTransition {
    type: SceneTransitionType;
    duration: number;
    easing?: string;
}

export const DEFAULT_TRANSITIONS: Record<string, SceneTransition> = {
    enter: { type: 'fade', duration: 500 },
    exit: { type: 'fade', duration: 400 },
    characterEnter: { type: 'slide-right', duration: 600, easing: 'ease-out' },
    characterExit: { type: 'slide-left', duration: 400, easing: 'ease-in' },
    urgent: { type: 'zoom-in', duration: 300, easing: 'ease-out' },
};

// ============================================================================
// BACKGROUND CONFIGS
// ============================================================================

export const BACKGROUND_ASSETS: Record<SceneBackground, {
    light: string;
    dark: string;
    fallbackColor: string;
}> = {
    office: {
        light: '/scenes/office-light.png',
        dark: '/scenes/office-dark.png',
        fallbackColor: 'var(--bg-secondary)',
    },
    bank: {
        light: '/scenes/bank-light.png',
        dark: '/scenes/bank-dark.png',
        fallbackColor: '#1a365d',
    },
    government: {
        light: '/scenes/government-light.png',
        dark: '/scenes/government-dark.png',
        fallbackColor: '#2d3748',
    },
    market: {
        light: '/scenes/market-light.png',
        dark: '/scenes/market-dark.png',
        fallbackColor: '#744210',
    },
    night_shop: {
        light: '/scenes/night-shop.png',
        dark: '/scenes/night-shop.png',
        fallbackColor: '#1a202c',
    },
    meeting_room: {
        light: '/scenes/meeting-light.png',
        dark: '/scenes/meeting-dark.png',
        fallbackColor: 'var(--bg-elevated)',
    },
    outdoor: {
        light: '/scenes/outdoor-light.png',
        dark: '/scenes/outdoor-dark.png',
        fallbackColor: '#2c5282',
    },
    abstract: {
        light: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)',
        dark: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)',
        fallbackColor: 'var(--bg-primary)',
    },
};

// ============================================================================
// AMBIENCE EFFECTS
// ============================================================================

export const AMBIENCE_STYLES: Record<SceneAmbience, {
    overlayGradient: string;
    particleColor?: string;
    vignetteIntensity: number;
    pulseSpeed?: number;
}> = {
    calm: {
        overlayGradient: 'linear-gradient(to bottom, transparent, rgba(16, 185, 129, 0.05))',
        vignetteIntensity: 0,
    },
    tense: {
        overlayGradient: 'linear-gradient(to bottom, transparent, rgba(245, 158, 11, 0.1))',
        vignetteIntensity: 0.2,
        pulseSpeed: 3000,
    },
    urgent: {
        overlayGradient: 'linear-gradient(to bottom, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.15))',
        particleColor: 'rgba(239, 68, 68, 0.3)',
        vignetteIntensity: 0.4,
        pulseSpeed: 1500,
    },
    celebratory: {
        overlayGradient: 'linear-gradient(to bottom, transparent, rgba(16, 185, 129, 0.1))',
        particleColor: 'rgba(250, 204, 21, 0.5)',
        vignetteIntensity: 0,
    },
    neutral: {
        overlayGradient: 'transparent',
        vignetteIntensity: 0.1,
    },
};
