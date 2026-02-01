'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';

// --- OPTIONS DATA ---

const CHARACTER_PRESETS = [
    {
        id: 'scholar',
        name: 'The Scholar',
        description: 'Focused',
        icon: '🎓',
        params: { top: 'shortFlat', hairColor: '2c1b18', clothing: 'blazerAndShirt', accessories: 'prescription01', eyes: 'default', mouth: 'smile', skinColor: 'ffdbb4' }
    },
    {
        id: 'entrepreneur',
        name: 'The Founder',
        description: 'Bold',
        icon: '💼',
        params: { top: 'shavedSides', hairColor: '4a312c', clothing: 'graphicShirt', accessories: 'blank', eyes: 'wink', mouth: 'smile', skinColor: 'edb98a' }
    },
    {
        id: 'visionary',
        name: 'The Visionary',
        description: 'Creative',
        icon: '✨',
        params: { top: 'curly', hairColor: 'b58143', clothing: 'hoodie', accessories: 'round', eyes: 'happy', mouth: 'smile', skinColor: 'f8d25c' }
    },
    {
        id: 'strategist',
        name: 'The Strategist',
        description: 'Logical',
        icon: '🛡️',
        params: { top: 'dreads01', hairColor: '2c1b18', clothing: 'overall', accessories: 'blank', eyes: 'default', mouth: 'serious', skinColor: 'ae5d29' }
    },
    {
        id: 'hacker',
        name: 'The Tech Wiz',
        description: 'Agile',
        icon: '💻',
        params: { top: 'frizzle', hairColor: '2c1b18', clothing: 'hoodie', accessories: 'wayfarers', eyes: 'default', mouth: 'smile', skinColor: '614335' }
    },
    {
        id: 'artist',
        name: 'The Artist',
        description: 'Expressive',
        icon: '🎨',
        params: { top: 'longButNotTooLong', hairColor: '724133', clothing: 'overall', accessories: 'blank', eyes: 'happy', mouth: 'smile', skinColor: 'ffdbb4' }
    }
];

const TOPS = {
    masculine: [
        'shortFlat', 'shavedSides', 'dreads01', 'frizzle', 'theCaesar', 'shortCurly', 'shortRound', 'shortWaved', 'sides', 'theCaesarAndSidePart', 'shaggy', 'bob'
    ],
    feminine: [
        'curly', 'longButNotTooLong', 'straight02', 'straight01', 'straightAndStrand', 'curvy', 'dreads02', 'frida', 'fro', 'froBand', 'miaWallace', 'shaggyMullet'
    ],
    hats: ['hat', 'hijab', 'turban', 'winterHat1', 'winterHat02', 'winterHat03', 'winterHat04']
};

const HAIR_COLORS = ['a55728', '2c1b18', 'b58143', 'd6b370', '724133', '4a312c', 'f59797', 'ecdcbf', 'c93305', 'e8e1e1'];

const EYES = ['default', 'closed', 'cry', 'eyeRoll', 'happy', 'hearts', 'side', 'squint', 'surprised', 'wink', 'winkWacky', 'xDizzy'];

const MOUTHS = ['smile', 'concerned', 'default', 'disbelief', 'eating', 'grimace', 'sad', 'screamOpen', 'serious', 'tongue', 'twinkle', 'vomit'];

const CLOTHING = {
    masculine: ['blazerAndShirt', 'blazerAndSweater', 'collarAndSweater', 'graphicShirt', 'hoodie', 'shirtCrewNeck', 'shirtVNeck'],
    feminine: ['shirtScoopNeck', 'overall', 'hoodie', 'graphicShirt', 'collarAndSweater', 'blazerAndSweater']
};

const CLOTHES_COLORS = ['262e33', '65c9ff', '5199e4', '25557c', 'e6e6e6', '929598', '3c4f5c', 'b1e2ff', 'a7ffc4', 'ffdeb5', 'ffafb9', 'ffffb1', 'ff488e', 'ff5c5c', 'ffffff'];

const ACCESSORIES = ['blank', 'prescription01', 'prescription02', 'round', 'sunglasses', 'wayfarers', 'eyepatch'];

const FACIAL_HAIR = ['blank', 'beardLight', 'beardMajestic', 'beardMedium', 'moustacheFancy', 'moustacheMagnum'];

const SKIN_COLORS = ['614335', 'd08b5b', 'ae5d29', 'edb98a', 'ffdbb4', 'fd9841', 'f8d25c'];

const BACKGROUND_COLORS = [
    { name: 'Coral', value: 'FF8A8A' },
    { name: 'Emerald', value: '8AFF8A' },
    { name: 'Azure', value: '8A8AFF' },
    { name: 'Lemon', value: 'FFFFA1' },
    { name: 'Lavender', value: 'FFA1FF' },
    { name: 'Ice', value: 'A1FFF4' },
    { name: 'Midnight', value: '2C3E50' },
    { name: 'Gold', value: 'F1C40F' }
];

type Category = 'Presets' | 'Hair' | 'Face' | 'Clothing' | 'Extras';

export default function AvatarCustomizationPage() {
    const params = useParams();
    const router = useRouter();
    const { user, userData, loading: authLoading } = useAuth();
    const [saving, setSaving] = useState(false);
    const [activeCategory, setActiveCategory] = useState<Category>('Presets');
    const [sex, setSex] = useState<'masculine' | 'feminine'>('masculine');

    // Granular States
    const [config, setConfig] = useState<any>({
        top: 'shortFlat',
        hairColor: '2c1b18',
        eyes: 'default',
        mouth: 'smile',
        clothing: 'blazerAndShirt',
        clothingColor: '262e33',
        accessories: 'blank',
        facialHair: 'blank',
        skinColor: 'ffdbb4',
        backgroundColor: 'FF8A8A'
    });

    const [hasInitialized, setHasInitialized] = useState(false);

    useEffect(() => {
        if (userData?.avatarCustomization && !hasInitialized) {
            const saved = userData.avatarCustomization;
            // Handle legacy clothesColor if it exists
            const { clothesColor, ...rest } = saved as any;
            const normalizedSaved = {
                ...rest,
                clothingColor: saved.clothingColor || clothesColor || '262e33'
            };
            setConfig((prev: any) => ({ ...prev, ...normalizedSaved }));
            setHasInitialized(true);
        }
    }, [userData, hasInitialized]);

    const username = params?.username as string;

    const constructLocalSvg = React.useCallback((c: any) => {
        const avatar = createAvatar(avataaars, {
            seed: username,
            backgroundColor: [c.backgroundColor],
            top: [c.top],
            hairColor: [c.hairColor],
            clothing: [c.clothing],
            clothesColor: [c.clothingColor],
            accessories: [c.accessories],
            eyes: [c.eyes],
            mouth: [c.mouth],
            skinColor: [c.skinColor],
            facialHair: [c.facialHair],
            backgroundType: ['solid']
        });
        return avatar.toString();
    }, [username]);

    const getCloudUrl = (c: any) => {
        const seedValue = encodeURIComponent(username);
        return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seedValue}&backgroundType=solid&backgroundColor=${c.backgroundColor}&top=${c.top}&hairColor=${c.hairColor}&clothing=${c.clothing}&clothingColor=${c.clothingColor}&accessories=${c.accessories}&eyes=${c.eyes}&mouth=${c.mouth}&skinColor=${c.skinColor}&facialHair=${c.facialHair}`;
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            const url = getCloudUrl(config);
            await updateDoc(doc(db, 'users', user.uid), {
                avatarCustomization: config,
                avatarUrl: url
            });
            router.push(`/profile/${username}`);
        } catch (error) {
            console.error("Error saving avatar:", error);
        }
        setSaving(false);
    };

    const applyPreset = (preset: any) => {
        setConfig((prev: any) => ({ ...prev, ...preset.params }));
    };

    const updateField = (field: string, value: string) => {
        setConfig((prev: any) => ({ ...prev, [field]: value }));
    };

    const previewSvg = React.useMemo(() => constructLocalSvg(config), [config, constructLocalSvg]);

    if (authLoading) return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)]" />
        </div>
    );

    const categories: Category[] = ['Presets', 'Hair', 'Face', 'Clothing', 'Extras'];

    return (
        <div className="h-screen bg-[var(--bg-primary)] overflow-hidden flex flex-col relative">
            <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col gap-4 px-4 py-4 md:py-6">

                {/* Compact Header */}
                <div className="flex items-center justify-between">
                    <button onClick={() => router.back()} className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-white transition-colors font-black uppercase text-[10px] tracking-widest">
                        <span>←</span> Back
                    </button>
                    <BrightHeading level={1} className="text-xl md:text-3xl tracking-tight text-center flex-1">
                        Character <span className="text-[var(--brand-primary)]">Editor</span>
                    </BrightHeading>
                    <BrightButton variant="primary" size="sm" onClick={handleSave} isLoading={saving} className="px-6 py-2 text-xs">
                        Done
                    </BrightButton>
                </div>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 min-h-0 overflow-hidden">

                    {/* Preview Area */}
                    <div className="flex flex-col items-center justify-center bg-[var(--bg-glass)] backdrop-blur-3xl rounded-[2.5rem] border border-white/5 relative overflow-hidden group shadow-xl h-full">
                        <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-primary)]/5 to-transparent pointer-events-none" />

                        {/* Sex Toggle */}
                        <div className="absolute top-6 left-6 z-20 flex bg-white/5 p-1 rounded-2xl border border-white/10">
                            <button
                                onClick={() => setSex('masculine')}
                                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sex === 'masculine' ? 'bg-[var(--brand-primary)] text-white' : 'text-white/40 hover:text-white'}`}
                            >
                                M
                            </button>
                            <button
                                onClick={() => setSex('feminine')}
                                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sex === 'feminine' ? 'bg-[var(--brand-primary)] text-white' : 'text-white/40 hover:text-white'}`}
                            >
                                F
                            </button>
                        </div>

                        <motion.div
                            key={previewSvg}
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="relative z-10 w-48 h-48 md:w-80 md:h-80 flex items-center justify-center p-4 bg-white/5 rounded-full border border-white/5 shadow-2xl overflow-hidden"
                            dangerouslySetInnerHTML={{ __html: previewSvg }}
                        />

                        <div className="mt-4 flex flex-col items-center gap-1">
                            <div className="px-6 py-2 bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-[var(--brand-primary)]/30">
                                Live Designer
                            </div>
                        </div>
                    </div>

                    {/* Editor Panel */}
                    <div className="flex flex-col min-h-0 bg-[var(--bg-glass)] backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-xl relative overflow-hidden">

                        {/* Tab Navigation */}
                        <div className="flex p-2 gap-1 border-b border-white/5 bg-white/[0.02]">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`flex-1 py-3 px-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-white/10 text-white border border-white/10' : 'text-[var(--text-muted)] hover:text-white'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 md:p-8 custom-scrollbar">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeCategory}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-8"
                                >
                                    {activeCategory === 'Presets' && (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {CHARACTER_PRESETS.map((preset) => (
                                                <button
                                                    key={preset.id}
                                                    onClick={() => applyPreset(preset)}
                                                    className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group relative overflow-hidden ${config.presetId === preset.id ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 shadow-lg' : 'border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10'}`}
                                                >
                                                    <div className="text-2xl group-hover:scale-110 transition-transform">{preset.icon}</div>
                                                    <div className="text-center min-w-0">
                                                        <div className="font-black text-[10px] tracking-tight">{preset.name}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {activeCategory === 'Hair' && (
                                        <>
                                            <div className="space-y-4">
                                                <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Styles</h3>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {[...TOPS[sex], ...TOPS.hats].map(t => (
                                                        <OptionButton
                                                            key={t}
                                                            active={config.top === t}
                                                            onClick={() => updateField('top', t)}
                                                            label={t}
                                                            type="top"
                                                            config={{ ...config, top: t }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Colors</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {HAIR_COLORS.map(c => (
                                                        <ColorCircle
                                                            key={c}
                                                            color={c}
                                                            active={config.hairColor === c}
                                                            onClick={() => updateField('hairColor', c)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {activeCategory === 'Face' && (
                                        <>
                                            <div className="space-y-4">
                                                <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Skin Tone</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {SKIN_COLORS.map(c => (
                                                        <ColorCircle
                                                            key={c}
                                                            color={c}
                                                            active={config.skinColor === c}
                                                            onClick={() => updateField('skinColor', c)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Eyes</h3>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {EYES.map(e => (
                                                            <OptionButton key={e} active={config.eyes === e} onClick={() => updateField('eyes', e)} label={e} type="face" config={{ ...config, eyes: e }} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Mouth</h3>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {MOUTHS.map(m => (
                                                            <OptionButton key={m} active={config.mouth === m} onClick={() => updateField('mouth', m)} label={m} type="face" config={{ ...config, mouth: m }} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {activeCategory === 'Clothing' && (
                                        <>
                                            <div className="space-y-4">
                                                <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Outfits</h3>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {CLOTHING[sex].map(c => (
                                                        <OptionButton key={c} active={config.clothing === c} onClick={() => updateField('clothing', c)} label={c} type="clothing" config={{ ...config, clothing: c }} />
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Colors</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {CLOTHES_COLORS.map(c => (
                                                        <ColorCircle key={c} color={c} active={config.clothingColor === c} onClick={() => updateField('clothingColor', c)} />
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {activeCategory === 'Extras' && (
                                        <>
                                            <div className="space-y-4">
                                                <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Accessories</h3>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {ACCESSORIES.map(a => (
                                                        <OptionButton key={a} active={config.accessories === a} onClick={() => updateField('accessories', a)} label={a} type="extras" config={{ ...config, accessories: a }} />
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Facial Hair</h3>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {FACIAL_HAIR.map(f => (
                                                        <OptionButton key={f} active={config.facialHair === f} onClick={() => updateField('facialHair', f)} label={f} type="extras" config={{ ...config, facialHair: f }} />
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Scene Background</h3>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {BACKGROUND_COLORS.map(c => (
                                                        <button key={c.value} onClick={() => updateField('backgroundColor', c.value)} className={`aspect-square rounded-xl border-2 transition-all group relative overflow-hidden ${config.backgroundColor === c.value ? 'border-[var(--brand-primary)] scale-105 shadow-md' : 'border-white/5 hover:border-white/20'}`}>
                                                            <div className="absolute inset-0" style={{ backgroundColor: `#${c.value}` }} />
                                                            {config.backgroundColor === c.value && <div className="absolute inset-0 flex items-center justify-center text-white text-[10px] drop-shadow-md">✓</div>}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Minimal Footer */}
                        <div className="p-4 border-t border-white/5 flex items-center justify-between opacity-30 px-8">
                            <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Dicebear Avataaars v9</span>
                            <span className="text-[8px] font-bold text-white tracking-widest uppercase">Deep Custom v2.0</span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

function OptionButton({ active, onClick, label, type, config }: { active: boolean, onClick: () => void, label: string, type: string, config: any }) {
    const params = useParams();
    const username = (params?.username as string) || 'test';

    const svg = React.useMemo(() => {
        const avatar = createAvatar(avataaars, {
            seed: 'test',
            top: [config.top],
            clothing: [config.clothing],
            accessories: [config.accessories],
            eyes: [config.eyes],
            mouth: [config.mouth],
            skinColor: [config.skinColor],
            facialHair: [config.facialHair],
            hairColor: [config.hairColor],
            clothesColor: [config.clothingColor],
        });
        return avatar.toString();
    }, [config]);

    return (
        <button
            onClick={onClick}
            className={`aspect-square rounded-2xl border-2 transition-all overflow-hidden bg-white/5 flex flex-col items-center justify-center p-1 group relative ${active ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10' : 'border-white/5 hover:border-white/10'}`}
        >
            <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                <div
                    className={`w-[200%] h-[200%] absolute ${type === 'face' ? '-top-12' : type === 'top' ? '-top-4' : type === 'clothing' ? '-top-28' : '-top-10'}`}
                    dangerouslySetInnerHTML={{ __html: svg }}
                />
            </div>
            {active && <div className="absolute top-1 right-1 text-[var(--brand-primary)] text-[8px]">✓</div>}
        </button>
    );
}

function ColorCircle({ color, active, onClick }: { color: string, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`w-8 h-8 rounded-full border-2 transition-all p-0.5 ${active ? 'border-[var(--brand-primary)] scale-110 shadow-lg' : 'border-white/5 hover:border-white/20'}`}
        >
            <div className="w-full h-full rounded-full" style={{ backgroundColor: `#${color}` }} />
        </button>
    );
}
