/**
 * Lab Inventory System
 * Handles equipment selection and MM (Manipulation & Measurement) scoring.
 */

export type EquipmentId =
    | 'beaker_50ml'
    | 'beaker_250ml'
    | 'measuring_cylinder_10ml'
    | 'measuring_cylinder_100ml'
    | 'test_tube'
    | 'boiling_tube'
    | 'bunsen_burner'
    | 'tripod_stand'
    | 'gauze_mat'
    | 'water_bath'
    | 'dropper'
    | 'scalpel'
    | 'forceps'
    | 'petri_dish'
    | 'spotting_tile'
    | 'stopwatch'
    | 'thermometer'
    | 'quadrat'
    | 'cork_borer'
    | 'ruler'
    | 'digital_balance';

export interface LabEquipment {
    id: EquipmentId;
    name: string;
    icon: string;
    category: 'glassware' | 'heating' | 'measuring' | 'cutting' | 'other';
    capacity?: number; // ml for containers
    precision?: number; // decimal places for measuring tools
}

export const EQUIPMENT_CATALOG: LabEquipment[] = [
    { id: 'beaker_50ml', name: 'Beaker (50ml)', icon: '🫙', category: 'glassware', capacity: 50 },
    { id: 'beaker_250ml', name: 'Beaker (250ml)', icon: '🫙', category: 'glassware', capacity: 250 },
    { id: 'measuring_cylinder_10ml', name: 'Measuring Cylinder (10ml)', icon: '🧪', category: 'measuring', capacity: 10, precision: 1 },
    { id: 'measuring_cylinder_100ml', name: 'Measuring Cylinder (100ml)', icon: '🧪', category: 'measuring', capacity: 100, precision: 1 },
    { id: 'test_tube', name: 'Test Tube', icon: '🧫', category: 'glassware', capacity: 15 },
    { id: 'boiling_tube', name: 'Boiling Tube', icon: '🧫', category: 'glassware', capacity: 25 },
    { id: 'bunsen_burner', name: 'Bunsen Burner', icon: '🔥', category: 'heating' },
    { id: 'tripod_stand', name: 'Tripod Stand', icon: '🔺', category: 'heating' },
    { id: 'gauze_mat', name: 'Gauze Mat', icon: '🔲', category: 'heating' },
    { id: 'water_bath', name: 'Water Bath', icon: '♨️', category: 'heating' },
    { id: 'dropper', name: 'Dropper', icon: '💧', category: 'other' },
    { id: 'scalpel', name: 'Scalpel', icon: '🔪', category: 'cutting' },
    { id: 'forceps', name: 'Forceps', icon: '🥢', category: 'other' },
    { id: 'petri_dish', name: 'Petri Dish', icon: '🍽️', category: 'glassware' },
    { id: 'spotting_tile', name: 'Spotting Tile', icon: '⬜', category: 'other' },
    { id: 'stopwatch', name: 'Stopwatch', icon: '⏱️', category: 'measuring' },
    { id: 'thermometer', name: 'Thermometer', icon: '🌡️', category: 'measuring', precision: 1 },
    { id: 'quadrat', name: 'Quadrat (1m²)', icon: '🔲', category: 'other' },
    { id: 'cork_borer', name: 'Cork Borer', icon: '⭕', category: 'cutting' },
    { id: 'ruler', name: 'Ruler (30cm)', icon: '📏', category: 'measuring', precision: 1 },
    { id: 'digital_balance', name: 'Digital Balance', icon: '⚖️', category: 'measuring', precision: 2 }
];

export function getEquipment(id: EquipmentId): LabEquipment | undefined {
    return EQUIPMENT_CATALOG.find(e => e.id === id);
}

/**
 * Checks if the selected equipment is appropriate for the task.
 * Returns a score deduction (0 = correct, negative = incorrect).
 */
export function scoreEquipmentChoice(
    taskType: 'measure_volume' | 'cut_specimen' | 'heat_substance' | 'mix_solution',
    selectedEquipment: EquipmentId,
    requiredVolume?: number
): { correct: boolean; deduction: number; feedback: string } {
    const equipment = getEquipment(selectedEquipment);
    if (!equipment) {
        return { correct: false, deduction: -5, feedback: 'Unknown equipment selected.' };
    }

    switch (taskType) {
        case 'measure_volume':
            // Must use a measuring cylinder
            if (!selectedEquipment.includes('measuring_cylinder')) {
                return {
                    correct: false,
                    deduction: -3,
                    feedback: `A ${equipment.name} is not designed for precise volume measurement. Use a Measuring Cylinder.`
                };
            }
            // Check if capacity is appropriate
            if (requiredVolume && equipment.capacity && requiredVolume > equipment.capacity) {
                return {
                    correct: false,
                    deduction: -2,
                    feedback: `The ${equipment.name} is too small for ${requiredVolume}ml. Use a larger cylinder.`
                };
            }
            return { correct: true, deduction: 0, feedback: 'Correct equipment selected.' };

        case 'cut_specimen':
            if (!['scalpel', 'cork_borer'].includes(selectedEquipment)) {
                return {
                    correct: false,
                    deduction: -3,
                    feedback: `A ${equipment.name} is not suitable for cutting. Use a Scalpel or Cork Borer.`
                };
            }
            return { correct: true, deduction: 0, feedback: 'Correct cutting tool selected.' };

        case 'heat_substance':
            if (!['bunsen_burner', 'water_bath'].includes(selectedEquipment)) {
                return {
                    correct: false,
                    deduction: -3,
                    feedback: `A ${equipment.name} cannot provide heat. Use a Bunsen Burner or Water Bath.`
                };
            }
            return { correct: true, deduction: 0, feedback: 'Correct heating apparatus selected.' };

        case 'mix_solution':
            if (!['beaker_50ml', 'beaker_250ml', 'test_tube', 'boiling_tube'].includes(selectedEquipment)) {
                return {
                    correct: false,
                    deduction: -2,
                    feedback: `A ${equipment.name} is not ideal for mixing. Use a beaker or test tube.`
                };
            }
            return { correct: true, deduction: 0, feedback: 'Appropriate container selected.' };

        default:
            return { correct: true, deduction: 0, feedback: '' };
    }
}
