'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';

interface LabCompletionResult {
    success: boolean;
    xpGain: number;
    xpToday: number;
    isCapped: boolean;
    alreadyCompleted?: boolean;
    message: string;
    error?: string;
}

export function useLabCompletion() {
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<LabCompletionResult | null>(null);

    const completeLab = useCallback(async (
        labId: string,
        xpReward: number,
        score?: number
    ): Promise<LabCompletionResult | null> => {
        if (!user) {
            setResult({
                success: false,
                xpGain: 0,
                xpToday: 0,
                isCapped: false,
                message: 'Must be logged in to earn XP',
                error: 'Not authenticated'
            });
            return null;
        }

        setIsSubmitting(true);

        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/labs/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ labId, xpReward, score })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to complete lab');
            }

            const completionResult: LabCompletionResult = {
                success: true,
                xpGain: data.xpGain || 0,
                xpToday: data.xpToday || 0,
                isCapped: data.isCapped || false,
                alreadyCompleted: data.alreadyCompleted,
                message: data.message || `Earned ${data.xpGain} XP!`
            };

            setResult(completionResult);
            return completionResult;
        } catch (error: any) {
            const errorResult: LabCompletionResult = {
                success: false,
                xpGain: 0,
                xpToday: 0,
                isCapped: false,
                message: 'Failed to save progress',
                error: error.message
            };
            setResult(errorResult);
            return errorResult;
        } finally {
            setIsSubmitting(false);
        }
    }, [user]);

    return {
        completeLab,
        isSubmitting,
        result
    };
}
