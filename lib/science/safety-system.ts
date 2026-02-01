/**
 * Safety System
 * Detects hazardous actions and triggers appropriate fail states.
 */

export type HazardType =
    | 'ethanol_direct_flame'
    | 'acid_splash'
    | 'broken_glass'
    | 'improper_heating'
    | 'chemical_mix_dangerous';

export interface SafetyViolation {
    hazardType: HazardType;
    severity: 'warning' | 'critical' | 'game_over';
    message: string;
    lesson: string;
    animationTrigger?: 'fire' | 'smoke' | 'spill' | 'explosion';
}

export interface LabAction {
    action: 'heat' | 'pour' | 'mix' | 'cut' | 'drop';
    substance?: string;
    equipment?: string;
    heatingMethod?: 'direct_flame' | 'water_bath';
}

/**
 * Checks if an action triggers a safety violation.
 */
export function checkSafetyViolation(labAction: LabAction): SafetyViolation | null {
    const { action, substance, heatingMethod } = labAction;

    // --- CRITICAL: Heating Ethanol with Direct Flame ---
    if (action === 'heat' && substance === 'ethanol' && heatingMethod === 'direct_flame') {
        return {
            hazardType: 'ethanol_direct_flame',
            severity: 'game_over',
            message: '🔥 LABORATORY FIRE! Ethanol is highly flammable and must NEVER be heated with a direct flame.',
            lesson: 'To safely heat ethanol, place the container in a water bath. The water is heated instead, which indirectly warms the ethanol without risk of ignition.',
            animationTrigger: 'fire'
        };
    }

    // --- WARNING: Improper Bunsen Burner Use ---
    if (action === 'heat' && heatingMethod === 'direct_flame') {
        // Check if tripod and gauze are being used for beakers
        // (This would require more context about the setup, simplified here)
    }

    // --- WARNING: Pouring without eye protection (generic) ---
    if (action === 'pour' && ['acid', 'alkali', 'iodine'].includes(substance || '')) {
        // Could issue a warning if "safety_goggles" not in player inventory
        // Returning null for now as this requires inventory context
    }

    // --- CRITICAL: Mixing certain chemicals ---
    if (action === 'mix') {
        // Example: Mixing bleach and ammonia (not in CSEC, but placeholder logic)
    }

    return null; // No violation
}

/**
 * Returns the appropriate safety lesson for a given hazard.
 */
export function getSafetyLesson(hazardType: HazardType): string {
    const lessons: Record<HazardType, string> = {
        ethanol_direct_flame:
            'Ethanol (alcohol) has a low flash point (~13°C), meaning it can ignite easily. Always use a water bath: heat water with the Bunsen burner, then place your ethanol container in the hot water.',
        acid_splash:
            'Always add acid to water, never water to acid. This prevents violent exothermic reactions. Wear safety goggles at all times.',
        broken_glass:
            'Never force glassware. If it breaks, do not touch it with bare hands. Use a dustpan and brush, and dispose of it in a sharps container.',
        improper_heating:
            'When heating liquids in a test tube, angle the tube away from yourself and others to prevent "bumping" (sudden boiling over).',
        chemical_mix_dangerous:
            'Some chemicals react violently when mixed. Always follow the procedure and never combine chemicals without instruction.'
    };
    return lessons[hazardType] || 'Always follow standard laboratory safety protocols.';
}

/**
 * Safety equipment checklist for a given lab.
 */
export const SAFETY_EQUIPMENT = [
    { id: 'goggles', name: 'Safety Goggles', icon: '🥽', required: true },
    { id: 'lab_coat', name: 'Lab Coat', icon: '🥼', required: true },
    { id: 'gloves', name: 'Disposable Gloves', icon: '🧤', required: false },
    { id: 'fire_extinguisher', name: 'Fire Extinguisher', icon: '🧯', required: true }
];
