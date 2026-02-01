/**
 * Virtual Lab Engine - Core Types
 * "The Juice" Protocol - Making labs feel alive
 */

// ==========================================
// REACTION SYSTEM
// ==========================================

export type InteractionType = 'combine' | 'heat' | 'cut' | 'measure' | 'examine' | 'pour';

export interface ReactionRule {
    id: string;
    sourceId: string;       // The item being dragged (e.g., "iodine_dropper")
    targetId: string;       // The item being dropped on (e.g., "boiled_leaf")
    interactionType: InteractionType;
    requiredState?: {       // Conditions required for reaction
        temperature?: number; // e.g., Must be > 80 degrees
        minTemperature?: number;
        maxTemperature?: number;
        isBoiled?: boolean;
        isDecolorized?: boolean;
        contains?: string[];
    };
    result: {
        outcomeId: string;    // The new item ID (e.g., "blue_black_leaf")
        visualEffect: 'color_change' | 'fizz' | 'explosion' | 'pour' | 'dissolve' | 'grow' | 'shrink';
        particleColor?: string;
        soundEffect?: string;
        xpReward: number;
        professorComment: string;
        professorMood: ProfessorMood;
    };
    failResult?: {
        visualEffect: 'shake' | 'flash_red' | 'smoke';
        professorComment: string;
        professorMood: ProfessorMood;
        scoreDeduction: number;
    };
}

// ==========================================
// LAB ITEM SYSTEM
// ==========================================

export type ItemType = 'tool' | 'specimen' | 'container' | 'solution' | 'equipment';
export type ItemState = 'solid' | 'liquid' | 'gas' | 'mixed';

export interface LabItem {
    id: string;
    name: string;
    type: ItemType;
    icon: string;           // Emoji or icon class
    assetUrl?: string;      // High-res asset for workbench

    // Physical Properties
    properties: {
        color: string;
        temperature: number;
        volume?: number;
        state: ItemState;
        contains?: string[];  // IDs of items inside this container
        isHeated?: boolean;
        isBoiled?: boolean;
        isDecolorized?: boolean;
    };

    // UI State
    isDraggable: boolean;
    isDropTarget: boolean;
    isInteractable: boolean;

    // Position on workbench (if placed)
    position?: { x: number; y: number };
    zone?: 'shelf' | 'workbench' | 'notebook';
}

// ==========================================
// PROFESSOR BRIGHT COMPANION
// ==========================================

export type ProfessorMood = 'idle' | 'happy' | 'thinking' | 'worried' | 'celebrating' | 'shocked' | 'hint';

export interface ProfessorState {
    isVisible: boolean;
    mood: ProfessorMood;
    message: string;
    position: 'bottom-right' | 'center' | 'top-right';
    animationVariant: 'bounce' | 'shake' | 'float' | 'pulse';
}

export interface ProfessorDialogue {
    trigger: 'idle' | 'success' | 'failure' | 'safety_violation' | 'hint' | 'complete';
    mood: ProfessorMood;
    messages: string[];
    duration?: number;
}

// ==========================================
// LAB SESSION STATE
// ==========================================

export interface LabSession {
    labId: string;
    currentStep: number;
    totalSteps: number;
    score: number;
    xpEarned: number;

    // Inventory & Workbench
    inventory: LabItem[];
    workbenchItems: LabItem[];

    // Professor
    professor: ProfessorState;

    // Log
    actionLog: LabLogEntry[];

    // Completion
    objectives: LabObjective[];
    isComplete: boolean;
}

export interface LabLogEntry {
    timestamp: Date;
    action: string;
    success: boolean;
    details?: string;
}

export interface LabObjective {
    id: string;
    description: string;
    completed: boolean;
    xpReward: number;
}

// ==========================================
// ANIMATION VARIANTS (Framer Motion)
// ==========================================

export const itemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { type: "spring", stiffness: 300, damping: 20 }
    },
    hover: {
        scale: 1.05,
        boxShadow: "0 0 20px rgba(16, 185, 129, 0.4)",
        transition: { duration: 0.2 }
    },
    dragging: {
        scale: 1.15,
        zIndex: 100,
        opacity: 0.9,
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
    },
    drop: {
        scale: [1.2, 0.9, 1],
        transition: { type: "spring", stiffness: 500, damping: 15 }
    }
};

export const feedbackVariants = {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 }
};

export const shakeVariants = {
    shake: {
        x: [0, -10, 10, -10, 10, 0],
        transition: { duration: 0.4 }
    }
};

export const successVariants = {
    success: {
        scale: [1, 1.2, 1],
        boxShadow: [
            "0 0 0 rgba(16, 185, 129, 0)",
            "0 0 30px rgba(16, 185, 129, 0.8)",
            "0 0 0 rgba(16, 185, 129, 0)"
        ],
        transition: { duration: 0.6 }
    }
};

export const professorVariants = {
    idle: {
        y: [0, -5, 0],
        transition: { repeat: Infinity, duration: 2 }
    },
    bounce: {
        y: [0, -20, 0],
        transition: { type: "spring", stiffness: 400 }
    },
    shake: {
        x: [0, -5, 5, -5, 5, 0],
        transition: { duration: 0.3 }
    }
};

// ==========================================
// PARTICLE SYSTEM
// ==========================================

export interface Particle {
    id: string;
    x: number;
    y: number;
    color: string;
    size: number;
    velocity: { x: number; y: number };
    life: number;
}

export function createParticles(
    originX: number,
    originY: number,
    count: number,
    color: string
): Particle[] {
    return Array.from({ length: count }, (_, i) => ({
        id: `particle-${i}-${Date.now()}`,
        x: originX,
        y: originY,
        color,
        size: 4 + Math.random() * 8,
        velocity: {
            x: (Math.random() - 0.5) * 200,
            y: (Math.random() - 0.5) * 200 - 100 // Bias upward
        },
        life: 1
    }));
}
