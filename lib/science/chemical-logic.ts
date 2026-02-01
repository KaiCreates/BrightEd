/**
 * Chemical Logic System
 * Simulates chemical reactions with real conditions and consequences.
 */

export type ChemicalId =
    | 'iodine'
    | 'benedicts'
    | 'biuret_a' // NaOH
    | 'biuret_b' // CuSO4
    | 'ethanol'
    | 'water'
    | 'salt_solution'
    | 'distilled_water'
    | 'starch_solution'
    | 'amylase'
    | 'catalase'
    | 'hydrogen_peroxide';

export type SubstanceId =
    | 'leaf_green'
    | 'leaf_variegated'
    | 'leaf_decolorized'
    | 'potato_strip'
    | 'reducing_sugar_sample'
    | 'protein_sample'
    | 'starch_sample';

export interface ReactionConditions {
    chemical: ChemicalId;
    targetSubstance: SubstanceId | ChemicalId;
    temperature?: number; // in Celsius
    duration?: number; // in seconds
    heatingMethod?: 'direct_flame' | 'water_bath' | 'none';
}

export interface ReactionResult {
    success: boolean;
    resultColor: string;
    resultTexture: 'liquid' | 'precipitate' | 'gas' | 'solid' | 'no_change';
    observation: string;
    scientificExplanation: string;
}

/**
 * Simulates a chemical reaction based on input conditions.
 */
export function simulateReaction(conditions: ReactionConditions): ReactionResult {
    const { chemical, targetSubstance, temperature = 25, heatingMethod = 'none' } = conditions;

    // --- IODINE TEST FOR STARCH ---
    if (chemical === 'iodine') {
        if (targetSubstance === 'starch_sample' || targetSubstance === 'leaf_decolorized') {
            // Starch is present
            return {
                success: true,
                resultColor: 'Blue-Black',
                resultTexture: 'liquid',
                observation: 'The solution turned a deep blue-black color.',
                scientificExplanation: 'Iodine molecules are trapped in the helical structure of starch (amylose), forming a starch-iodine complex that absorbs light differently.'
            };
        }
        // No starch
        return {
            success: true,
            resultColor: 'Yellow-Brown',
            resultTexture: 'liquid',
            observation: 'The solution remained yellow-brown.',
            scientificExplanation: 'No starch was present, so the iodine did not form a complex and retained its original color.'
        };
    }

    // --- BENEDICT'S TEST FOR REDUCING SUGARS ---
    if (chemical === 'benedicts') {
        if (targetSubstance === 'reducing_sugar_sample') {
            if (temperature >= 80 && heatingMethod !== 'none') {
                // Positive result
                return {
                    success: true,
                    resultColor: 'Brick Red',
                    resultTexture: 'precipitate',
                    observation: 'A brick-red precipitate formed after heating.',
                    scientificExplanation: 'Reducing sugars (like glucose) reduce the copper(II) ions in Benedict\'s reagent to copper(I) oxide, forming the characteristic precipitate.'
                };
            }
            // Not heated enough
            return {
                success: false,
                resultColor: 'Blue',
                resultTexture: 'liquid',
                observation: 'The solution remained blue. No reaction occurred.',
                scientificExplanation: 'The reaction requires heat (water bath at 80°C+) to provide the activation energy for the reduction of copper ions.'
            };
        }
        // No reducing sugar
        return {
            success: true,
            resultColor: 'Blue',
            resultTexture: 'liquid',
            observation: 'No color change; the solution stayed blue.',
            scientificExplanation: 'No reducing sugars were present to react with the Benedict\'s solution.'
        };
    }

    // --- BIURET TEST FOR PROTEIN ---
    if (chemical === 'biuret_b' && targetSubstance === 'protein_sample') {
        return {
            success: true,
            resultColor: 'Purple/Violet',
            resultTexture: 'liquid',
            observation: 'The solution turned purple/violet.',
            scientificExplanation: 'The copper(II) ions in Biuret reagent form a complex with the peptide bonds in protein, producing the violet color.'
        };
    }

    // --- ENZYME REACTIONS (Amylase + Starch) ---
    if (chemical === 'amylase' && targetSubstance === 'starch_solution') {
        // Temperature-dependent enzyme activity
        if (temperature >= 90) {
            // Enzyme denatured
            return {
                success: false,
                resultColor: 'No Change',
                resultTexture: 'no_change',
                observation: 'No reaction occurred. The starch remained unbroken.',
                scientificExplanation: 'At temperatures above 40°C, the enzyme amylase begins to denature. At 90°C+, it is completely inactive and cannot break down starch.'
            };
        }
        if (temperature >= 30 && temperature <= 40) {
            // Optimum temperature
            return {
                success: true,
                resultColor: 'Yellow-Brown (Iodine test)',
                resultTexture: 'liquid',
                observation: 'Starch rapidly converted to maltose. Iodine test shows yellow-brown.',
                scientificExplanation: 'At the optimum temperature (35-40°C), enzyme activity is fastest due to increased kinetic energy and more enzyme-substrate collisions.'
            };
        }
        if (temperature < 10) {
            // Too cold
            return {
                success: true,
                resultColor: 'Slow Reaction',
                resultTexture: 'liquid',
                observation: 'Reaction is very slow. Iodine test may still show blue-black after several minutes.',
                scientificExplanation: 'At low temperatures, molecules have less kinetic energy, resulting in fewer collisions and slower enzyme activity.'
            };
        }
        // Moderate temperature
        return {
            success: true,
            resultColor: 'Moderate Reaction',
            resultTexture: 'liquid',
            observation: 'Starch is being converted, but not at optimum speed.',
            scientificExplanation: 'The reaction proceeds at a moderate rate.'
        };
    }

    // --- CATALASE + HYDROGEN PEROXIDE ---
    if (chemical === 'catalase' && targetSubstance === 'hydrogen_peroxide') {
        return {
            success: true,
            resultColor: 'Colorless',
            resultTexture: 'gas',
            observation: 'Vigorous bubbling observed as oxygen gas is released.',
            scientificExplanation: 'Catalase breaks down hydrogen peroxide (H₂O₂) into water (H₂O) and oxygen (O₂). The rate of bubbling indicates enzyme activity.'
        };
    }

    // Default: No specific reaction defined
    return {
        success: false,
        resultColor: 'No Change',
        resultTexture: 'no_change',
        observation: 'No observable reaction.',
        scientificExplanation: 'The combination did not produce a defined reaction under these conditions.'
    };
}

/**
 * Simulates osmosis in a potato strip.
 */
export function simulateOsmosis(
    solutionConcentration: 'hypotonic' | 'isotonic' | 'hypertonic',
    initialLength: number,
    durationMinutes: number
): { finalLength: number; texture: 'turgid' | 'normal' | 'flaccid'; explanation: string } {
    const timeMultiplier = Math.min(durationMinutes / 45, 1); // Max effect at 45 mins

    switch (solutionConcentration) {
        case 'hypotonic': // Distilled water
            return {
                finalLength: +(initialLength * (1 + 0.08 * timeMultiplier)).toFixed(1),
                texture: 'turgid',
                explanation: 'Water moved INTO the potato cells by osmosis (from high water potential to low). The cells became turgid.'
            };
        case 'hypertonic': // Concentrated salt
            return {
                finalLength: +(initialLength * (1 - 0.12 * timeMultiplier)).toFixed(1),
                texture: 'flaccid',
                explanation: 'Water moved OUT OF the potato cells by osmosis (to the higher solute concentration). The cells became flaccid/plasmolysed.'
            };
        case 'isotonic':
        default:
            return {
                finalLength: initialLength,
                texture: 'normal',
                explanation: 'Net movement of water was zero as the water potential inside and outside the cells was equal.'
            };
    }
}
