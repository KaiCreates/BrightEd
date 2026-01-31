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
        if (businessName.trim().length < 3) return;
        setStep('brand');
    };

    const handleConfirm = () => {
        if (selectedType && businessName.trim()) {
            onSelect(selectedType, businessName.trim(), {
                themeColor: themeColor.trim() || '#7c3aed',
                logoUrl: logoUrl || undefined,
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
        <div className="w-full pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">

                {/* Header & Branding */}
                <motion.div
                    className="text-center mb-8 bg-[var(--bg-elevated)]/30 p-6 rounded-[2rem] border border-white/5 shadow-2xl backdrop-blur-sm"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-[var(--brand-primary)] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[var(--brand-primary)]/20">
                            <span className="text-xl font-black">B</span>
                        </div>
                        <span className="text-xl font-black tracking-tight text-[var(--text-primary)]">BrightEd <span className="text-[var(--brand-primary)]">Enterprise</span></span>
                    </div>

                    <BrightHeading level={1} className="text-4xl md:text-5xl mb-3 tracking-tight">
                        Choose Your <span className="text-[var(--brand-primary)] underline decoration-wavy decoration-4 underline-offset-8">Path</span>
                    </BrightHeading>
                    <p className="text-sm md:text-base text-[var(--text-secondary)] font-medium max-w-xl mx-auto opacity-80">
                        Select a business model. Your choice defines your starting capital, daily costs, and success metrics.
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
                            {/* Luka's guidance - Compacted */}
                            <div className="mb-8 scale-90 origin-top">
                                <CharacterDialogue
                                    node={introDialogue}
                                    typewriterSpeed={15}
                                />
                            </div>

                            {/* Business Type Grid - 4 Columns for No Scroll */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {ALL_BUSINESS_TYPES.map((type, idx) => (
                                    <motion.div
                                        key={type.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        <button
                                            onClick={() => handleTypeSelect(type)}
                                            className="w-full text-left group"
                                        >
                                            <BrightLayer
                                                variant="glass"
                                                padding="md"
                                                className={`relative overflow-hidden transition-all h-[340px] flex flex-col justify-between
                          border-b-[6px] border-[var(--border-subtle)] 
                          active:border-b-0 active:translate-y-[6px]
                          hover:bg-white/[0.05] hover:border-b-[var(--brand-primary)]/50
                          ${categoryStyles[type.category].glow}`}
                                            >
                                                {/* Category Label */}
                                                <div className={`
                                                   absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[9px] font-black uppercase tracking-widest text-white shadow-sm
                                                   ${type.category === 'service' ? 'bg-purple-500' :
                                                        type.category === 'retail' ? 'bg-blue-500' :
                                                            type.category === 'food' ? 'bg-orange-500' : 'bg-emerald-500'}
                                                `}>
                                                    {type.category}
                                                </div>

                                                <div className="relative z-10 flex flex-col h-full">
                                                    {/* Visual Section */}
                                                    <div className="flex flex-col items-center text-center mb-4">
                                                        <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center text-5xl mb-3 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                                            {type.emoji}
                                                        </div>
                                                        <h3 className="text-lg font-black text-[var(--text-primary)] leading-tight">
                                                            {type.name}
                                                        </h3>
                                                    </div>

                                                    {/* Body */}
                                                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed font-medium line-clamp-3 mb-4 opacity-70 group-hover:opacity-100 transition-opacity">
                                                        {type.description}
                                                    </p>

                                                    {/* Footer Info */}
                                                    <div className="mt-auto space-y-3">
                                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                                            <span>Starting Capital</span>
                                                            <span className="text-[var(--brand-accent)] text-xs">฿{type.startingCapital.toLocaleString()}</span>
                                                        </div>

                                                        <div className="flex justify-between items-center">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-xs">📦</span>
                                                                <span className="text-[10px] font-bold text-[var(--text-secondary)]">{type.products.length} Items</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-xs">🕒</span>
                                                                <span className="text-[10px] font-bold text-[var(--text-secondary)]">
                                                                    {type.category === 'food' ? 'Lunch' :
                                                                        type.category === 'retail' ? 'Evening' :
                                                                            type.category === 'service' ? 'Afternoon' : 'Day'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="pt-3 border-t border-white/5">
                                                            <div className="text-center py-1.5 rounded-lg bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-[10px] font-black uppercase tracking-widest group-hover:bg-[var(--brand-primary)] group-hover:text-white transition-all">
                                                                Choose Path
                                                            </div>
                                                        </div>
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
                            className="max-w-xl mx-auto px-4"
                        >
                            <BrightLayer variant="elevated" padding="lg" className="text-center border-b-[8px] border-[var(--brand-primary)]">
                                <div className="w-24 h-24 rounded-3xl bg-white/[0.03] flex items-center justify-center text-7xl mx-auto mb-6 shadow-inner animate-bounce-slow">
                                    {selectedType.emoji}
                                </div>
                                <BrightHeading level={2} className="text-3xl mb-3 tracking-tight">
                                    Name Your <span className="text-[var(--brand-primary)]">{selectedType.name}</span>
                                </BrightHeading>
                                <p className="text-[var(--text-secondary)] mb-10 font-medium">
                                    This name will appear on your official charter and credit card.
                                </p>

                                <div className="relative group">
                                    <input
                                        type="text"
                                        value={businessName}
                                        onChange={(e) => setBusinessName(e.target.value)}
                                        placeholder={`e.g., "${selectedType.category === 'food' ? "Mama's Kitchen" :
                                            selectedType.category === 'service' ? "Style Studio" :
                                                selectedType.category === 'retail' ? "Corner Mart" :
                                                    "Creative Design Co."}`}
                                        className="w-full px-8 py-5 text-2xl bg-[var(--bg-elevated)] border-2 border-[var(--border-subtle)] rounded-[2rem] 
                        text-[var(--text-primary)] placeholder:text-[var(--text-muted)] 
                        focus:border-[var(--brand-primary)] focus:outline-none transition-all text-center font-black shadow-inner"
                                        autoFocus
                                        maxLength={40}
                                    />
                                    <div className="absolute inset-0 rounded-[2rem] border-4 border-[var(--brand-primary)]/0 group-focus-within:border-[var(--brand-primary)]/10 pointer-events-none transition-all" />
                                </div>

                                <div className="mt-12 flex flex-col sm:flex-row justify-center gap-4">
                                    <BrightButton
                                        variant="ghost"
                                        onClick={handleBack}
                                        className="order-2 sm:order-1"
                                    >
                                        ← Back
                                    </BrightButton>
                                    <BrightButton
                                        variant="primary"
                                        size="lg"
                                        onClick={handleNameSubmit}
                                        disabled={businessName.trim().length < 3}
                                        className="order-1 sm:order-2 px-12 py-6 text-lg font-black"
                                    >
                                        Next Step →
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
                            className="max-w-6xl mx-auto px-4"
                        >
                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                                {/* Left: Card Preview */}
                                <div className="xl:col-span-5 flex flex-col gap-6">
                                    <div className="relative group">
                                        <div className="absolute inset-x-0 -bottom-8 bg-[var(--brand-primary)]/10 h-10 rounded-[3rem] blur-2xl group-hover:bg-[var(--brand-primary)]/20 transition-all opacity-0 group-hover:opacity-100" />
                                        <BusinessCreditCard
                                            businessName={businessName}
                                            ownerName="Director"
                                            themeColor={themeColor}
                                            logoUrl={logoUrl || undefined}
                                            icon={icon}
                                            cardLabel="BUSINESS CREDIT"
                                            className="transform rotate-0 group-hover:-rotate-1 group-hover:scale-[1.02] transition-all duration-500 shadow-2xl"
                                        />
                                    </div>
                                    <BrightLayer variant="glass" padding="sm" className="bg-white/[0.02] border border-white/5 rounded-2xl text-center">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Live Preview • Legal Identity</p>
                                    </BrightLayer>
                                </div>

                                {/* Right: Controls */}
                                <div className="xl:col-span-7">
                                    <BrightLayer variant="elevated" padding="lg" className="border-b-[8px] border-[var(--border-subtle)] relative overflow-hidden bg-white/[0.02]">
                                        <div className="absolute top-0 right-0 p-8 text-5xl opacity-10 pointer-events-none">🎨</div>

                                        <div className="relative z-10">
                                            <div className="mb-8">
                                                <BrightHeading level={2} className="text-3xl tracking-tight mb-2">Corporate Identity</BrightHeading>
                                                <p className="text-[var(--text-secondary)] font-medium">Define your brand visual assets to differentiate in the market.</p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                {/* Theme Color */}
                                                <div className="space-y-4">
                                                    <div className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)]" /> Theme Color
                                                    </div>
                                                    <div className="flex items-center gap-4 p-2 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] group focus-within:border-[var(--brand-primary)]/50 transition-colors">
                                                        <input
                                                            type="color"
                                                            value={themeColor}
                                                            onChange={(e) => setThemeColor(e.target.value)}
                                                            className="h-12 w-12 rounded-xl border-0 bg-transparent cursor-pointer overflow-hidden p-0"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={themeColor}
                                                            onChange={(e) => setThemeColor(e.target.value)}
                                                            className="flex-1 bg-transparent border-0 text-lg font-black text-[var(--text-primary)] focus:outline-none uppercase"
                                                            placeholder="#7c3aed"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Logo Upload */}
                                                <div className="space-y-4">
                                                    <div className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Logo Upload
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <label className="flex-1 group">
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) handleLogoUpload(file);
                                                                }}
                                                                className="hidden"
                                                            />
                                                            <div className="px-6 py-4 rounded-2xl border-2 border-dashed border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5 transition-all cursor-pointer text-sm font-black text-[var(--text-primary)] text-center shadow-inner">
                                                                {logoUploading ? '⏳ Uploading...' : (logoUrl ? '✅ Replace' : '📁 Upload File')}
                                                            </div>
                                                        </label>
                                                        {logoUrl && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setLogoUrl('')}
                                                                className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-transparent hover:bg-red-500/10 hover:border-red-500/30 transition-all text-sm font-black text-red-500"
                                                            >
                                                                🗑️
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Preset Icon */}
                                                <div className="md:col-span-2 space-y-4">
                                                    <div className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Symbol Pack
                                                    </div>
                                                    <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-10 gap-2 sm:gap-3">
                                                        {presetIcons.map((i) => (
                                                            <button
                                                                key={i}
                                                                type="button"
                                                                onClick={() => setIcon(i)}
                                                                className={`h-11 w-11 sm:h-12 sm:w-12 rounded-2xl border-2 transition-all text-xl active:scale-90 flex items-center justify-center ${icon === i
                                                                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.3)] text-white scale-110 z-10'
                                                                    : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 hover:border-white/20'
                                                                    }`}
                                                            >
                                                                {i}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-12 flex flex-col sm:flex-row justify-between items-center gap-4">
                                                <BrightButton variant="ghost" onClick={handleBack} className="w-full sm:w-auto">
                                                    ← Back
                                                </BrightButton>
                                                <BrightButton
                                                    variant="primary"
                                                    size="lg"
                                                    onClick={() => setStep('confirm')}
                                                    disabled={logoUploading}
                                                    className="w-full sm:w-auto px-12 py-5 text-lg font-black border-b-4 border-black/20"
                                                >
                                                    Finalize Identity →
                                                </BrightButton>
                                            </div>
                                        </div>
                                    </BrightLayer>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 4: Confirm Launch */}
                    {step === 'confirm' && selectedType && (
                        <motion.div
                            key="confirm"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="max-w-2xl mx-auto px-4"
                        >
                            <BrightLayer
                                variant="elevated"
                                padding="lg"
                                className="text-center border-b-[8px] border-[var(--brand-primary)] overflow-hidden relative"
                            >
                                {/* Background flare */}
                                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[var(--brand-primary)] to-transparent opacity-50" />
                                <div className="absolute -top-24 -left-24 w-64 h-64 bg-[var(--brand-primary)] opacity-10 blur-[100px] rounded-full" />

                                <div className="relative z-10">
                                    <div className="w-24 h-24 rounded-full bg-[var(--brand-primary)] text-white text-5xl mx-auto mb-6 flex items-center justify-center shadow-[0_0_30px_rgba(var(--brand-primary-rgb),0.3)] animate-pulse">
                                        🚀
                                    </div>
                                    <BrightHeading level={1} className="text-4xl md:text-5xl mb-2 tracking-tighter">
                                        Ready for <span className="text-[var(--brand-primary)]">Launch?</span>
                                    </BrightHeading>
                                    <p className="text-[var(--text-secondary)] mb-10 font-medium">Final review of your business charter.</p>

                                    <div className="space-y-4 mb-10">
                                        <div className="bg-white/[0.03] rounded-3xl p-6 border border-white/5 flex flex-col sm:flex-row items-center gap-6 text-left">
                                            <div className="w-20 h-20 rounded-2xl bg-white/[0.03] flex items-center justify-center text-5xl shrink-0">
                                                {icon || selectedType.emoji}
                                            </div>
                                            <div>
                                                <h4 className="text-2xl font-black text-[var(--text-primary)] leading-tight mb-1">{businessName}</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    <span className="px-3 py-0.5 rounded-full bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] text-[10px] font-black uppercase tracking-widest">{selectedType.name}</span>
                                                    <span className="px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest">฿{selectedType.startingCapital.toLocaleString()} Capital</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="bg-white/[0.02] rounded-3xl p-5 border border-white/5 text-left h-full">
                                                <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Operational Risks
                                                </div>
                                                <ul className="space-y-2 text-xs text-[var(--text-secondary)] font-medium">
                                                    <li>• Daily operating costs apply</li>
                                                    <li>• System spoilage risk: {selectedType.category === 'food' ? 'High' : 'Medium'}</li>
                                                </ul>
                                            </div>
                                            <div className="bg-white/[0.02] rounded-3xl p-5 border border-white/5 text-left h-full">
                                                <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Success Metrics
                                                </div>
                                                <ul className="space-y-2 text-xs text-[var(--text-secondary)] font-medium">
                                                    <li>• Reputation-based demand</li>
                                                    <li>• Profit margin tracking</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                                        <BrightButton
                                            variant="ghost"
                                            onClick={handleBack}
                                            className="order-2 sm:order-1"
                                        >
                                            ← Adjust Brand
                                        </BrightButton>
                                        <BrightButton
                                            variant="primary"
                                            size="lg"
                                            onClick={handleConfirm}
                                            className="order-1 sm:order-2 px-16 py-6 text-xl font-black border-b-[6px] border-black/20"
                                        >
                                            Launch My Empire 🥂
                                        </BrightButton>
                                    </div>
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
