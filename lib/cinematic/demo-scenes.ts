/**
 * BrightEd Cinematic UI — Demo Scenes
 * Pre-built scenes for common business simulation moments.
 * These serve as examples and are triggered by business state conditions.
 */

import { Scene } from './scene-types';

// ============================================================================
// BANK OFFICER WARNING — Low Cash Scene
// ============================================================================

export const SCENE_BANK_WARNING: Scene = {
    id: 'bank_warning_low_cash',
    name: 'A Word from the Bank',
    description: 'Marcus Chen appears when your cash balance is critically low.',

    background: 'bank',
    ambience: 'tense',

    characters: [
        {
            characterId: 'marcus',
            initialPosition: 'center',
            initialEmotion: 'concerned',
            entranceDelay: 500,
        },
    ],

    dialogue: [
        {
            id: 'bank_1',
            characterId: 'marcus',
            text: "I have been reviewing your account. Your cash position has dropped significantly.",
            emotion: 'concerned',
            nextNodeId: 'bank_2',
            delay: 2000,
        },
        {
            id: 'bank_2',
            characterId: 'marcus',
            text: 'At this rate, you may struggle to meet your upcoming obligations. We need to discuss your options.',
            emotion: 'neutral',
            choices: [
                {
                    id: 'loan',
                    text: 'I would like to discuss a short-term loan.',
                    tone: 'polite',
                    nextNodeId: 'bank_loan',
                },
                {
                    id: 'explain',
                    text: 'I have a plan to turn things around.',
                    tone: 'neutral',
                    nextNodeId: 'bank_explain',
                },
                {
                    id: 'dismiss',
                    text: 'I will handle it. Is there anything else?',
                    tone: 'aggressive',
                    nextNodeId: 'bank_dismiss',
                },
            ],
        },
        {
            id: 'bank_loan',
            characterId: 'marcus',
            text: "That is prudent. We can offer you an emergency credit line, but the interest rate will reflect the risk. Come by my office when you are ready.",
            emotion: 'neutral',
        },
        {
            id: 'bank_explain',
            characterId: 'marcus',
            text: "I appreciate the confidence. I will be watching. If your position improves in the next week, we can revisit your credit terms.",
            emotion: 'impressed',
        },
        {
            id: 'bank_dismiss',
            characterId: 'marcus',
            text: "Very well. But understand — the bank's patience has limits. Do not let this slip further.",
            emotion: 'suspicious',
        },
    ],

    startNodeId: 'bank_1',
    canSkip: false,
    pauseGameTime: true,

    triggerCondition: {
        type: 'state_change',
        stateKey: 'cashBalance',
        operator: 'lt',
        threshold: 500,
        cooldownMs: 1000 * 60 * 30, // 30 minutes between triggers
        maxTriggers: 3,
    },

    priority: 80,
    screenEffect: 'vignette',
};

// ============================================================================
// TAX DEADLINE — Diana Baptiste Warning
// ============================================================================

export const SCENE_TAX_DEADLINE: Scene = {
    id: 'tax_deadline_warning',
    name: 'Tax Season',
    description: 'Diana Baptiste reminds you of an approaching tax deadline.',

    background: 'government',
    ambience: 'neutral',

    characters: [
        {
            characterId: 'diana',
            initialPosition: 'center',
            initialEmotion: 'neutral',
            entranceDelay: 300,
        },
    ],

    dialogue: [
        {
            id: 'tax_1',
            characterId: 'diana',
            text: 'Good day. This is a courtesy reminder regarding your upcoming tax obligation.',
            emotion: 'neutral',
            nextNodeId: 'tax_2',
        },
        {
            id: 'tax_2',
            characterId: 'diana',
            text: 'Your quarterly VAT filing is due in 48 hours. Failure to submit will result in penalties.',
            emotion: 'concerned',
            choices: [
                {
                    id: 'understood',
                    text: 'Thank you for the reminder. I will file today.',
                    tone: 'polite',
                    nextNodeId: 'tax_polite',
                },
                {
                    id: 'extension',
                    text: 'Is there any possibility of an extension?',
                    tone: 'neutral',
                    nextNodeId: 'tax_extension',
                },
            ],
        },
        {
            id: 'tax_polite',
            characterId: 'diana',
            text: 'I appreciate your compliance. The office is open until 4 PM if you need assistance with the forms.',
            emotion: 'happy',
        },
        {
            id: 'tax_extension',
            characterId: 'diana',
            text: 'Extensions are only granted for documented emergencies. If you have a valid reason, submit Form TR-7 before the deadline. Otherwise, the fee is 5% per day late.',
            emotion: 'neutral',
        },
    ],

    startNodeId: 'tax_1',
    canSkip: true,
    pauseGameTime: false,

    triggerCondition: {
        type: 'time_event',
        eventId: 'tax_deadline_approaching',
        cooldownMs: 1000 * 60 * 60 * 24, // Once per day
    },

    priority: 70,
};

// ============================================================================
// BUSINESS REGISTRATION APPROVED — Mentor Celebration
// ============================================================================

export const SCENE_REGISTRATION_APPROVED: Scene = {
    id: 'registration_approved',
    name: 'Official Business!',
    description: 'Luka celebrates your business registration approval.',

    background: 'office',
    ambience: 'celebratory',

    characters: [
        {
            characterId: 'luka',
            initialPosition: 'center',
            initialEmotion: 'happy',
            entranceDelay: 0,
        },
    ],

    dialogue: [
        {
            id: 'reg_1',
            characterId: 'luka',
            text: 'Congratulations! Your business is now officially registered.',
            emotion: 'happy',
            animation: 'celebrate',
            nextNodeId: 'reg_2',
        },
        {
            id: 'reg_2',
            characterId: 'luka',
            text: 'This is a real milestone. You are now a legitimate entity in the eyes of the law. New doors are opening.',
            emotion: 'impressed',
            nextNodeId: 'reg_3',
        },
        {
            id: 'reg_3',
            characterId: 'luka',
            text: 'Now the real work begins. Keep your finances in order, treat your employees well, and never stop learning.',
            emotion: 'neutral',
        },
    ],

    startNodeId: 'reg_1',
    canSkip: true,
    pauseGameTime: false,

    triggerCondition: {
        type: 'state_change',
        stateKey: 'registrationStatus',
        operator: 'eq',
        threshold: 1, // 1 = approved
        maxTriggers: 1,
    },

    priority: 90,
};

// ============================================================================
// ETHICAL DILEMMA — Employee Confrontation
// ============================================================================

export const SCENE_ETHICAL_DILEMMA: Scene = {
    id: 'ethical_dilemma_underpay',
    name: 'A Difficult Conversation',
    description: 'Keisha confronts you about unfair wages.',

    background: 'office',
    ambience: 'tense',

    characters: [
        {
            characterId: 'keisha',
            initialPosition: 'center',
            initialEmotion: 'concerned',
            entranceDelay: 300,
        },
    ],

    dialogue: [
        {
            id: 'eth_1',
            characterId: 'keisha',
            text: 'Boss, I need to talk to you about something important.',
            emotion: 'concerned',
            nextNodeId: 'eth_2',
        },
        {
            id: 'eth_2',
            characterId: 'keisha',
            text: "I have been here from the start. The hours are long, and frankly, the pay does not reflect what I bring to this business.",
            emotion: 'disappointed',
            choices: [
                {
                    id: 'raise',
                    text: 'You are right. Let us discuss a fair raise.',
                    tone: 'polite',
                    nextNodeId: 'eth_raise',
                    consequence: 'morale_boost',
                },
                {
                    id: 'delay',
                    text: 'I hear you. Once profits improve, we will talk.',
                    tone: 'neutral',
                    nextNodeId: 'eth_delay',
                },
                {
                    id: 'dismiss',
                    text: 'Everyone is struggling. If you are unhappy, that is your choice.',
                    tone: 'aggressive',
                    nextNodeId: 'eth_dismiss',
                    consequence: 'morale_drop',
                },
            ],
        },
        {
            id: 'eth_raise',
            characterId: 'keisha',
            text: 'Thank you. That means a lot. I will keep giving you my best.',
            emotion: 'happy',
        },
        {
            id: 'eth_delay',
            characterId: 'keisha',
            text: 'Okay. I will hold you to that. But do not make me wait too long.',
            emotion: 'concerned',
        },
        {
            id: 'eth_dismiss',
            characterId: 'keisha',
            text: 'I see. Well, I hope you will not regret that attitude when you need someone you can count on.',
            emotion: 'disappointed',
        },
    ],

    startNodeId: 'eth_1',
    canSkip: false,
    pauseGameTime: true,

    triggerCondition: {
        type: 'state_change',
        stateKey: 'avgWageFairness',
        operator: 'lt',
        threshold: 0.6, // Below 60% fair wage
        cooldownMs: 1000 * 60 * 60 * 24 * 7, // Weekly at most
        maxTriggers: 2,
    },

    priority: 75,
    screenEffect: 'vignette',
};

// ============================================================================
// SCENE REGISTRY
// ============================================================================

export const DEMO_SCENES: Record<string, Scene> = {
    [SCENE_BANK_WARNING.id]: SCENE_BANK_WARNING,
    [SCENE_TAX_DEADLINE.id]: SCENE_TAX_DEADLINE,
    [SCENE_REGISTRATION_APPROVED.id]: SCENE_REGISTRATION_APPROVED,
    [SCENE_ETHICAL_DILEMMA.id]: SCENE_ETHICAL_DILEMMA,
};

export function getSceneById(id: string): Scene | undefined {
    return DEMO_SCENES[id];
}

export function getAllScenes(): Scene[] {
    return Object.values(DEMO_SCENES);
}
