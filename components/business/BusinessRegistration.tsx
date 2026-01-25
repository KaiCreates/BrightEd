'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { BrightHeading } from '@/components/system';
import { BusinessTypeSelector } from '@/components/business/BusinessTypeSelector';
import { BusinessType } from '@/lib/economy/economy-types';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { BrightButton, BrightLayer } from '@/components/system';

interface BusinessRegistrationProps {
    onComplete: (name: string) => void;
}

export default function BusinessRegistration({ onComplete }: BusinessRegistrationProps) {
    const router = useRouter();
    const { userData, loading } = useAuth();
    const [step, setStep] = useState<'select' | 'processing' | 'success'>('select');
    const [error, setError] = useState<string | null>(null);
    const [registeredName, setRegisteredName] = useState('');

    if (!loading && userData?.hasBusiness) {
        return (
            <BrightLayer variant="glass" padding="lg" className="border border-white/10 bg-white/[0.03] rounded-[1.5rem]">
                <div className="text-center">
                    <div className="text-5xl mb-4">🏢</div>
                    <BrightHeading level={2} className="mb-2">Business Registered</BrightHeading>
                    <p className="text-[var(--text-secondary)] mb-8">
                        You can only register <span className="font-semibold text-[var(--text-primary)]">1 business per account</span>.
                        More business slots and expansions are coming soon.
                    </p>
                    <div className="flex flex-col gap-3">
                        <Link href="/stories/business/operations">
                            <BrightButton variant="primary" className="w-full">
                                Go to Operations
                            </BrightButton>
                        </Link>
                        <BrightButton
                            variant="ghost"
                            className="w-full opacity-60 cursor-not-allowed"
                            disabled
                        >
                            Register Another Business (Coming Soon)
                        </BrightButton>
                    </div>
                </div>
            </BrightLayer>
        );
    }

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
            const token = await user.getIdToken();

            const cleanBranding = branding
                ? Object.fromEntries(
                    Object.entries(branding).filter(([k, v]) => {
                        if (v === undefined) return false;
                        if (k === 'logoUrl' && (!v || typeof v !== 'string' || !v.startsWith('http'))) return false;
                        return true;
                    })
                )
                : undefined;

            const res = await fetch('/api/business/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name,
                    businessTypeId: type.id,
                    branding: cleanBranding,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                const msg = typeof data?.error === 'string' ? data.error : 'Failed to register business. Please try again.';
                setError(msg);
                setStep('select');
                return;
            }

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
            setError('Failed to register business. Please try again.');
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
