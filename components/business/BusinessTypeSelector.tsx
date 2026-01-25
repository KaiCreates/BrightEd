'use client';

/**
 * BrightEd Economy — Business Type Selector
 * Allows players to choose their business type during onboarding.
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrightLayer, BrightButton, BrightHeading } from '@/components/system';
import { CharacterDialogue } from '@/components/cinematic';
import { ALL_BUSINESS_TYPES, BusinessType } from '@/lib/economy';
import { DialogueNode } from '@/lib/cinematic/character-types';
import BusinessCreditCard from '@/components/business/BusinessCreditCard';
import { auth, storage } from '@/lib/firebase';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

interface BusinessTypeSelectorProps {
    onSelect: (
        businessType: BusinessType,
        businessName: string,
        branding?: { themeColor?: string; logoUrl?: string; icon?: string }
    ) => void;
    onBack?: () => void;
}

export function BusinessTypeSelector({ onSelect, onBack }: BusinessTypeSelectorProps) {
    const [selectedType, setSelectedType] = useState<BusinessType | null>(null);
    const [businessName, setBusinessName] = useState('');
    const [step, setStep] = useState<'select' | 'name' | 'brand' | 'confirm'>('select');

    const [themeColor, setThemeColor] = useState<string>('#7c3aed');
    const [icon, setIcon] = useState<string>('🏢');
    const [logoUrl, setLogoUrl] = useState<string>('');
    const [logoUploading, setLogoUploading] = useState(false);
    const [logoError, setLogoError] = useState<string | null>(null);

    const handleTypeSelect = (type: BusinessType) => {
        setSelectedType(type);
        setStep('name');
    };

    const handleNameSubmit = () => {
        if (businessName.trim().length < 2) return;
        setStep('brand');
    };

    const handleConfirm = () => {
        if (selectedType && businessName.trim()) {
            onSelect(selectedType, businessName.trim(), {
                themeColor: themeColor.trim() || '#7c3aed',
                logoUrl: logoUrl || '',
                icon: icon || '🏢',
            });
        }
    };

    const handleBack = () => {
        if (step === 'name') {
            setStep('select');
            setSelectedType(null);
        } else if (step === 'brand') {
            setStep('name');
        } else if (step === 'confirm') {
            setStep('brand');
        } else {
            onBack?.();
        }
    };

    const presetIcons = useMemo(
        () => ['🏢', '🧾', '🧠', '🛍️', '🍽️', '📦', '🧰', '🧪', '🎧', '🧑‍💻', '🚚', '🌐', '🏦', '🧿'],
        []
    );

    const handleLogoUpload = async (file: File) => {
        const user = auth.currentUser;
        if (!user) {
            setLogoError('Please log in again to upload a logo.');
            return;
        }

        setLogoError(null);
        setLogoUploading(true);
        try {
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const path = `business-logos/${user.uid}/${Date.now()}_${safeName}`;
            const objRef = ref(storage, path);
            await uploadBytes(objRef, file);
            const url = await getDownloadURL(objRef);
            setLogoUrl(url);
        } catch (e) {
            setLogoError('Failed to upload logo. Please try again.');
        } finally {
            setLogoUploading(false);
        }
    };

    // Luka's intro dialogue
    const introDialogue: DialogueNode = {
        id: 'business_intro',
        characterId: 'luka',
        text: "Every empire starts with a choice. What kind of business speaks to you? Each path has different challenges and rewards.",
        emotion: 'neutral',
    };

    const categoryStyles: Record<string, { gradient: string; glow: string }> = {
        service: {
            gradient: 'from-purple-500/20 to-pink-500/20',
            glow: 'group-hover:shadow-purple-500/30'
        },
        retail: {
            gradient: 'from-blue-500/20 to-cyan-500/20',
            glow: 'group-hover:shadow-blue-500/30'
        },
        food: {
            gradient: 'from-orange-500/20 to-yellow-500/20',
            glow: 'group-hover:shadow-orange-500/30'
        },
        digital: {
            gradient: 'from-green-500/20 to-teal-500/20',
            glow: 'group-hover:shadow-green-500/30'
        },
    };

    return (
        <div className="w-full">
            <div className="max-w-5xl mx-auto px-2 sm:px-4">

                {/* Header */}
                <motion.div
                    className="text-center mb-10"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <BrightHeading level={1} className="mb-4">
                        Choose Your Path
                    </BrightHeading>
                    <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
                        Your business type determines how you earn money, what challenges you face, and how success is measured.
                    </p>
                </motion.div>

                <AnimatePresence mode="wait">
                    {/* Step 1: Select Business Type */}
                    {step === 'select' && (
                        <motion.div
                            key="select"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                        >
                            {/* Luka's guidance */}
                            <div className="mb-10">
                                <CharacterDialogue
                                    node={introDialogue}
                                    typewriterSpeed={20}
                                />
                            </div>

                            {/* Business Type Grid */}
                            <div className="grid md:grid-cols-2 gap-6">
                                {ALL_BUSINESS_TYPES.map((type, idx) => (
                                    <motion.div
                                        key={type.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                    >
                                        <button
                                            onClick={() => handleTypeSelect(type)}
                                            className="w-full text-left group"
                                        >
                                            <BrightLayer
                                                variant="glass"
                                                padding="lg"
                                                className={`relative overflow-hidden transition-all duration-300 
                          group-hover:border-[var(--brand-primary)]/50 
                          group-hover:shadow-xl ${categoryStyles[type.category].glow}`}
                                            >
                                                {/* Background gradient */}
                                                <div className={`absolute inset-0 bg-gradient-to-br ${categoryStyles[type.category].gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />

                                                <div className="relative z-10">
                                                    {/* Header */}
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-4xl">{type.emoji}</span>
                                                            <div>
                                                                <h3 className="text-xl font-bold text-[var(--text-primary)]">
                                                                    {type.name}
                                                                </h3>
                                                                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                                                    {type.category}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm text-[var(--text-muted)]">Starting Capital</p>
                                                            <p className="text-lg font-bold text-[var(--brand-accent)]">
                                                                ฿{type.startingCapital.toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Description */}
                                                    <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">
                                                        {type.description}
                                                    </p>

                                                    {/* Quick stats */}
                                                    <div className="flex gap-4 text-sm">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[var(--text-muted)]">Products:</span>
                                                            <span className="font-bold text-[var(--text-primary)]">{type.products.length}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[var(--text-muted)]">Peak demand:</span>
                                                            <span className="font-bold text-[var(--text-primary)]">
                                                                {type.category === 'food' ? 'Lunch' :
                                                                    type.category === 'retail' ? 'Evening' :
                                                                        type.category === 'service' ? 'Afternoon' : 'Weekdays'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* CTA */}
                                                    <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex justify-end">
                                                        <span className="text-sm font-bold text-[var(--brand-primary)] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                                            Choose this path <span>→</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </BrightLayer>
                                        </button>
                                    </motion.div>
                                ))}
                            </div>

                            {onBack && (
                                <div className="mt-8 text-center">
                                    <button
                                        onClick={onBack}
                                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                    >
                                        ← Go back
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Step 2: Name Your Business */}
                    {step === 'name' && selectedType && (
                        <motion.div
                            key="name"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="max-w-xl mx-auto"
                        >
                            <BrightLayer variant="glass" padding="lg" className="text-center">
                                <span className="text-6xl mb-4 inline-block">{selectedType.emoji}</span>
                                <BrightHeading level={2} className="mb-2">
                                    Name Your {selectedType.name}
                                </BrightHeading>
                                <p className="text-[var(--text-secondary)] mb-8">
                                    Give your business a name that customers will remember.
                                </p>

                                <input
                                    type="text"
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                    placeholder={`e.g., "${selectedType.category === 'food' ? "Mama's Kitchen" :
                                        selectedType.category === 'service' ? "Style Studio" :
                                            selectedType.category === 'retail' ? "Corner Mart" :
                                                "Creative Design Co."}`}
                                    className="w-full px-6 py-4 text-xl bg-[var(--bg-elevated)] border-2 border-[var(--border-subtle)] rounded-2xl 
                    text-[var(--text-primary)] placeholder:text-[var(--text-muted)] 
                    focus:border-[var(--brand-primary)] focus:outline-none transition-colors text-center"
                                    autoFocus
                                    maxLength={40}
                                />

                                <div className="mt-8 flex justify-center gap-4">
                                    <BrightButton variant="ghost" onClick={handleBack}>
                                        ← Back
                                    </BrightButton>
                                    <BrightButton
                                        variant="primary"
                                        onClick={handleNameSubmit}
                                        disabled={businessName.trim().length < 2}
                                    >
                                        Continue →
                                    </BrightButton>
                                </div>
                            </BrightLayer>
                        </motion.div>
                    )}

                    {/* Step 3: Brand Your Business */}
                    {step === 'brand' && selectedType && (
                        <motion.div
                            key="brand"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="max-w-5xl mx-auto"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                                <div className="lg:col-span-5">
                                    <BusinessCreditCard
                                        businessName={businessName}
                                        ownerName="Director"
                                        themeColor={themeColor}
                                        logoUrl={logoUrl || undefined}
                                        icon={icon}
                                        cardLabel="BUSINESS CREDIT"
                                    />
                                </div>

                                <div className="lg:col-span-7">
                                    <BrightLayer variant="glass" padding="lg" className="border-2 border-[var(--border-subtle)]">
                                        <div className="flex items-start justify-between gap-4 mb-8">
                                            <div>
                                                <BrightHeading level={2} className="mb-2">Branding</BrightHeading>
                                                <p className="text-[var(--text-secondary)]">Choose a logo, icon, and theme color. This will style your business card.</p>
                                            </div>
                                            <div className="text-3xl">🎨</div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Theme Color</div>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="color"
                                                        value={themeColor}
                                                        onChange={(e) => setThemeColor(e.target.value)}
                                                        className="h-10 w-14 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={themeColor}
                                                        onChange={(e) => setThemeColor(e.target.value)}
                                                        className="flex-1 px-4 py-3 text-sm bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)] focus:outline-none"
                                                        placeholder="#7c3aed"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Logo Upload</div>
                                                <div className="flex items-center gap-3">
                                                    <label className="flex-1">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) handleLogoUpload(file);
                                                            }}
                                                            className="hidden"
                                                        />
                                                        <div className="px-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 hover:border-[var(--brand-primary)]/40 transition-colors cursor-pointer text-sm font-bold text-[var(--text-primary)]">
                                                            {logoUploading ? 'Uploading...' : (logoUrl ? 'Replace Logo' : 'Upload Logo')}
                                                        </div>
                                                    </label>
                                                    {logoUrl && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setLogoUrl('')}
                                                            className="px-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-transparent hover:bg-[var(--bg-elevated)]/40 transition-colors text-sm font-bold text-[var(--text-muted)]"
                                                        >
                                                            Clear
                                                        </button>
                                                    )}
                                                </div>
                                                {logoError && (
                                                    <div className="text-sm font-bold text-[var(--state-error)]">{logoError}</div>
                                                )}
                                            </div>

                                            <div className="md:col-span-2 space-y-3">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Preset Icon</div>
                                                <div className="grid grid-cols-7 sm:grid-cols-10 gap-2">
                                                    {presetIcons.map((i) => (
                                                        <button
                                                            key={i}
                                                            type="button"
                                                            onClick={() => setIcon(i)}
                                                            className={`h-11 w-11 rounded-xl border transition-all text-lg active:scale-95 ${icon === i
                                                                    ? 'border-white/10 bg-[var(--brand-primary)]/20 shadow-lg'
                                                                    : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 hover:border-[var(--brand-primary)]/40'
                                                                }`}
                                                        >
                                                            {i}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-10 flex justify-between items-center gap-4">
                                            <BrightButton variant="ghost" onClick={handleBack}>
                                                ← Back
                                            </BrightButton>
                                            <BrightButton
                                                variant="primary"
                                                size="lg"
                                                onClick={() => setStep('confirm')}
                                                disabled={logoUploading}
                                            >
                                                Continue →
                                            </BrightButton>
                                        </div>
                                    </BrightLayer>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 4: Confirm */}
                    {step === 'confirm' && selectedType && (
                        <motion.div
                            key="confirm"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="max-w-xl mx-auto"
                        >
                            <BrightLayer
                                variant="glass"
                                padding="lg"
                                className="text-center border-2 border-[var(--brand-primary)]/30"
                            >
                                <span className="text-6xl mb-4 inline-block">{logoUrl ? '✅' : icon}</span>
                                <BrightHeading level={2} className="mb-2">
                                    {businessName}
                                </BrightHeading>
                                <p className="text-[var(--text-secondary)] mb-6">
                                    {selectedType.name} • Starting with ฿{selectedType.startingCapital.toLocaleString()}
                                </p>

                                <div className="bg-[var(--bg-elevated)]/50 rounded-xl p-4 mb-8 text-left">
                                    <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                                        What you&apos;ll face:
                                    </h4>
                                    <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                                        <li className="flex items-start gap-2">
                                            <span className="text-[var(--state-warning)]">⚡</span>
                                            Daily operating costs (rent, utilities, staff)
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-[var(--state-info)]">📦</span>
                                            {selectedType.category === 'food'
                                                ? 'Ingredient spoilage and waste management'
                                                : selectedType.category === 'retail'
                                                    ? 'Inventory management and stock levels'
                                                    : selectedType.category === 'service'
                                                        ? 'Appointment scheduling and quality'
                                                        : 'Deadlines and client expectations'}
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-[var(--state-success)]">⭐</span>
                                            Reputation affects your order volume
                                        </li>
                                    </ul>
                                </div>

                                <div className="flex justify-center gap-4">
                                    <BrightButton variant="ghost" onClick={handleBack}>
                                        ← Change
                                    </BrightButton>
                                    <BrightButton variant="primary" size="lg" onClick={handleConfirm}>
                                        Launch My Business 🚀
                                    </BrightButton>
                                </div>
                            </BrightLayer>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default BusinessTypeSelector;
