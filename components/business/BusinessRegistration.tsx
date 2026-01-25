'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { BrightHeading } from '@/components/system';
import { BusinessTypeSelector } from '@/components/business/BusinessTypeSelector';
import { createEconomyBusiness } from '@/lib/economy';
import { BusinessType } from '@/lib/economy/economy-types';
import { auth } from '@/lib/firebase';

interface BusinessRegistrationProps {
    onComplete: (name: string) => void;
}

export default function BusinessRegistration({ onComplete }: BusinessRegistrationProps) {
    const router = useRouter();
    const [step, setStep] = useState<'select' | 'processing' | 'success'>('select');
    const [error, setError] = useState<string | null>(null);
    const [registeredName, setRegisteredName] = useState('');

    const handleRegistration = async (
        type: BusinessType,
        name: string,
        branding?: { themeColor?: string; logoUrl?: string; icon?: string }
    ) => {
        const user = auth.currentUser;
        if (!user) {
            setError('Please log in again to register.');
            return;
        }

        setStep('processing');
        setError(null);

        try {
            // Create economy business directly via Firebase
            await createEconomyBusiness(user.uid, name, type, branding);

            setRegisteredName(name);

            // Short feedback delay to keep the UI feeling responsive
            await new Promise((resolve) => setTimeout(resolve, 700));

            setStep('success');

            // Complete shortly after success to avoid a sluggish feel
            setTimeout(() => {
                onComplete(name);
                router.refresh();
            }, 900);

        } catch (err: any) {
            console.error('Registration failed:', err);
            setError(err.message || 'Failed to register business. Please try again.');
            setStep('select');
        }
    };

    return (
        <div className="w-full">
            <AnimatePresence mode="wait">
                {step === 'select' && (
                    <motion.div
                        key="select"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                    >
                        {error && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-200 text-center font-bold">
                                {error}
                            </div>
                        )}
                        <BusinessTypeSelector onSelect={handleRegistration} />
                    </motion.div>
                )}

                {step === 'processing' && (
                    <motion.div
                        key="processing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center py-14"
                    >
                        <BrightHeading level={2} className="mb-4">Registering Enterprise</BrightHeading>
                        <div className="relative w-24 h-24 mx-auto mb-8">
                            <div className="absolute inset-0 border-4 border-[var(--bg-elevated)] rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-[var(--brand-primary)] rounded-full border-t-transparent animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center text-2xl">📝</div>
                        </div>
                        <p className="text-[var(--text-secondary)]">Filing legal documents...</p>
                    </motion.div>
                )}

                {step === 'success' && (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-14"
                    >
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-emerald-500 text-white text-5xl mb-6 shadow-lg shadow-emerald-500/20">
                            ✓
                        </div>
                        <BrightHeading level={1} className="text-emerald-500 mb-2">
                            Approved!
                        </BrightHeading>
                        <p className="text-xl text-[var(--text-primary)] font-medium">
                            {registeredName} is now a registered legal entity.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
