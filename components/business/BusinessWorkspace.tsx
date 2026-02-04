'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system';
import { Order, BusinessType } from '@/lib/economy/economy-types';
import { BCoinIcon } from '@/components/BCoinIcon';
import { getDicebearAvatarUrl } from '@/lib/avatars';

interface BusinessWorkspaceProps {
    order: Order;
    businessType: BusinessType;
    onComplete: (qualityScore: number) => void;
    onCancel: () => void;
}

interface WorkspaceStep {
    id: string;
    title: string;
    description: string;
    type: 'decision' | 'outcome' | 'action';
    options?: {
        label: string;
        qualityImpact: number;
        feedback: string;
        story?: string;
    }[];
}

export default function BusinessWorkspace({ order, businessType, onComplete, onCancel }: BusinessWorkspaceProps) {
    const [currentStepIdx, setCurrentStepIdx] = useState(0);
    const [qualityScore, setQualityScore] = useState(70); // Base quality
    const [steps, setSteps] = useState<WorkspaceStep[]>([]);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Initial Generator (MVP: 3 steps per order)
    useEffect(() => {
        const item = order.items[0]?.productName || 'Order Items';

        const generatedSteps: WorkspaceStep[] = [
            {
                id: 'prep',
                title: 'Reviewing Order Requirements',
                description: `${order.customerName} requested ${order.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}. How do you want to prioritize this fulfillment?`,
                type: 'decision',
                options: [
                    { label: 'Speed First: Rush preparation', qualityImpact: -5, feedback: 'Fast but may sacrifice detail.', story: 'You rush the prep. The clock is ticking!' },
                    { label: 'Quality First: Double check all items', qualityImpact: 10, feedback: 'Higher customer satisfaction ensured.', story: 'You carefully inspect every item for defects.' },
                    { label: 'Standard: Follow normal procedure', qualityImpact: 0, feedback: 'Balance between speed and care.', story: 'You stick to the playbook.' }
                ]
            },
            {
                id: 'execution',
                title: 'Fulfillment Execution',
                description: `A minor issue arose during ${item} preparation. A packaging seal looks slightly weak.`,
                type: 'decision',
                options: [
                    { label: 'Fix it: Use premium packaging', qualityImpact: 15, feedback: 'Customer will love the presentation!', story: 'You upgrade the packaging. It looks professional.' },
                    { label: 'Ship it: It is probably fine', qualityImpact: -15, feedback: 'Customer might notice the defect.', story: 'You decide to risk it to save time.' },
                    { label: 'Patch it: Quick reinforcement', qualityImpact: 5, feedback: 'Reliable enough for transport.', story: 'A quick bit of tape resolves the seal issue.' }
                ]
            },
            {
                id: 'delivery',
                title: 'Delivery & Handover',
                description: `${order.customerName} is a ${order.customerType} customer. Final check?`,
                type: 'decision',
                options: [
                    { label: 'Professional: Include a thank you note', qualityImpact: 10, feedback: 'Personal touches build loyalty!', story: 'A handwritten note goes a long way.' },
                    { label: 'Efficiency: Send out immediately', qualityImpact: 5, feedback: 'Delivery time optimized.', story: 'Package dispatched!' }
                ]
            }
        ];

        setSteps(generatedSteps);
    }, [order]);

    const handleOptionSelect = (idx: number) => {
        if (selectedOption !== null) return;

        setSelectedOption(idx);
        const option = steps[currentStepIdx].options?.[idx];
        if (option) {
            setQualityScore(prev => Math.min(100, Math.max(0, prev + option.qualityImpact)));
        }

        setTimeout(() => {
            if (currentStepIdx < steps.length - 1) {
                setIsTransitioning(true);
                setTimeout(() => {
                    setCurrentStepIdx(prev => prev + 1);
                    setSelectedOption(null);
                    setIsTransitioning(false);
                }, 400);
            } else {
                onComplete(qualityScore);
            }
        }, 1500);
    };

    if (steps.length === 0) return null;

    const currentStep = steps[currentStepIdx];
    const customerAvatarUrl = getDicebearAvatarUrl(order.customerId);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[var(--bg-primary)] flex flex-col pt-20"
        >
            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 h-20 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] flex items-center px-8 justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onCancel} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕ Exit Workspace</button>
                    <div className="h-6 w-px bg-[var(--border-subtle)]" />
                    <div className="flex items-center gap-3">
                        <img
                            src={customerAvatarUrl}
                            alt={order.customerName}
                            className="h-10 w-10 rounded-2xl border border-[var(--border-subtle)] object-cover"
                        />
                        <BrightHeading level={4} className="m-0">Business Workspace: {order.customerName}</BrightHeading>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Quality Forecast</p>
                        <p className={`text-xl font-black ${qualityScore > 80 ? 'text-[var(--state-success)]' : qualityScore > 50 ? 'text-[var(--brand-accent)]' : 'text-[var(--state-error)]'}`}>
                            {qualityScore}%
                        </p>
                    </div>
                </div>
            </div>

            <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 flex flex-col">
                {/* Progress Bar */}
                <div className="w-full h-1 bg-[var(--bg-elevated)] rounded-full mb-12 overflow-hidden">
                    <motion.div
                        className="h-full bg-[var(--brand-primary)]"
                        animate={{ width: `${((currentStepIdx + 1) / steps.length) * 100}%` }}
                    />
                </div>

                <div className="flex-1">
                    <AnimatePresence mode="wait">
                        {!isTransitioning && (
                            <motion.div
                                key={currentStep.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div>
                                    <span className="px-3 py-1 bg-[var(--brand-secondary)]/10 text-[var(--brand-secondary)] rounded-full text-[10px] font-black uppercase tracking-widest border border-[var(--brand-secondary)]/20 mb-4 inline-block">
                                        Step {currentStepIdx + 1}: {currentStep.title}
                                    </span>
                                    <BrightHeading level={2}>{currentStep.description}</BrightHeading>
                                </div>

                                <div className="grid gap-4">
                                    {currentStep.options?.map((opt, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleOptionSelect(i)}
                                            disabled={selectedOption !== null}
                                            className={`
                                                w-full text-left p-6 rounded-2xl border-2 transition-all group
                                                ${selectedOption === i
                                                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                                                    : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--brand-primary)]/50'
                                                }
                                            `}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-lg text-[var(--text-primary)]">{opt.label}</span>
                                                {selectedOption === i && <span className="text-xl">👉</span>}
                                            </div>
                                            <AnimatePresence>
                                                {selectedOption === i && (
                                                    <motion.p
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        className="mt-4 text-[var(--text-secondary)] font-medium"
                                                    >
                                                        {opt.story}
                                                    </motion.p>
                                                )}
                                            </AnimatePresence>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Sidebar summary in Workspace? Not needed for now, keep it clean */}
            </main>

            {/* Footer Order Info */}
            <div className="h-24 bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)] flex items-center px-8">
                <div className="flex gap-8">
                    <div>
                        <p className="text-[10px] font-black uppercase text-[var(--text-muted)] mb-1">Contract Value</p>
                        <p className="font-black flex items-center gap-1 text-[var(--brand-accent)]"><BCoinIcon size={14} /> {order.totalAmount}</p>
                    </div>
                    <div className="h-10 w-px bg-[var(--border-subtle)]" />
                    <div>
                        <p className="text-[10px] font-black uppercase text-[var(--text-muted)] mb-1">Target Quality</p>
                        <p className="font-black text-[var(--text-primary)] capitalize">{order.qualityRequirement}</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
