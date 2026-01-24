'use client';

/**
 * BrightEd Economy — Business Type Selector
 * Allows players to choose their business type during onboarding.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrightLayer, BrightButton, BrightHeading } from '@/components/system';
import { CharacterDialogue } from '@/components/cinematic';
import { ALL_BUSINESS_TYPES, BusinessType } from '@/lib/economy';
import { DialogueNode } from '@/lib/cinematic/character-types';

interface BusinessTypeSelectorProps {
    onSelect: (businessType: BusinessType, businessName: string) => void;
    onBack?: () => void;
}

export function BusinessTypeSelector({ onSelect, onBack }: BusinessTypeSelectorProps) {
    const [selectedType, setSelectedType] = useState<BusinessType | null>(null);
    const [businessName, setBusinessName] = useState('');
    const [step, setStep] = useState<'select' | 'name' | 'confirm'>('select');

    const handleTypeSelect = (type: BusinessType) => {
        setSelectedType(type);
        setStep('name');
    };

    const handleNameSubmit = () => {
        if (businessName.trim().length < 2) return;
        setStep('confirm');
    };

    const handleConfirm = () => {
        if (selectedType && businessName.trim()) {
            onSelect(selectedType, businessName.trim());
        }
    };

    const handleBack = () => {
        if (step === 'name') {
            setStep('select');
            setSelectedType(null);
        } else if (step === 'confirm') {
            setStep('name');
        } else {
            onBack?.();
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
        <div className="min-h-screen bg-[var(--bg-primary)] py-12 px-4">
            <div className="max-w-5xl mx-auto">

                {/* Header */}
                <motion.div
                    className="text-center mb-12"
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
                                        transition={{ delay: idx * 0.1 }}
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

                    {/* Step 3: Confirm */}
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
                                <span className="text-6xl mb-4 inline-block">{selectedType.emoji}</span>
                                <BrightHeading level={2} className="mb-2">
                                    {businessName}
                                </BrightHeading>
                                <p className="text-[var(--text-secondary)] mb-6">
                                    {selectedType.name} • Starting with ฿{selectedType.startingCapital.toLocaleString()}
                                </p>

                                <div className="bg-[var(--bg-elevated)]/50 rounded-xl p-4 mb-8 text-left">
                                    <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                                        What you'll face:
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
