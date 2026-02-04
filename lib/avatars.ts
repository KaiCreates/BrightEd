const DICEBEAR_STYLE = 'avataaars';
const DEFAULT_BACKGROUND = 'b6e3f4,c0aede,d1d4f9';

export interface DicebearAvatarOptions {
    backgroundColor?: string;
    backgroundType?: 'solid' | 'gradientLinear' | 'gradientRadial';
    flip?: boolean;
}

export function getDicebearAvatarUrl(seed: string, options: DicebearAvatarOptions = {}) {
    const params = new URLSearchParams({
        seed,
        backgroundType: options.backgroundType ?? 'solid',
        backgroundColor: options.backgroundColor ?? DEFAULT_BACKGROUND,
    });

    if (options.flip) {
        params.set('flip', 'true');
    }

    return `https://api.dicebear.com/9.x/${DICEBEAR_STYLE}/svg?${params.toString()}`;
}

export const DEFAULT_DICEBEAR_BACKGROUND = DEFAULT_BACKGROUND;
