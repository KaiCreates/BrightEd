import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { calculateXPUpdate, getDayKey } from '@/lib/xp-utils';

// Schema for lab completion XP
const LabCompleteSchema = z.object({
    labId: z.string().min(1),
    xpReward: z.number().min(1).max(500),
    score: z.number().min(0).max(100).optional()
});

export async function POST(request: NextRequest) {
    try {
        const decodedToken = await verifyAuth(request);
        const userId = decodedToken.uid;

        const body = await request.json();
        const result = LabCompleteSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({
                error: 'Invalid request',
                details: result.error.format()
            }, { status: 400 });
        }

        const { labId, xpReward, score } = result.data;
        const todayKey = getDayKey();

        // Fetch user data
        const userRef = adminDb.collection('users').doc(userId);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userData = userSnap.data() || {};

        // Check if lab already completed today
        const completedLabs = userData.completedLabs || {};
        if (completedLabs[labId] === todayKey) {
            return NextResponse.json({
                success: true,
                alreadyCompleted: true,
                message: 'Lab already completed today, no XP awarded',
                xpGain: 0
            });
        }

        // Calculate XP with daily cap
        const { xpGain, xpToday, isCapped, updates } = calculateXPUpdate(userData, xpReward, todayKey);

        // Calculate B-Coins reward (25-45 coins randomized)
        const coinsEarned = Math.floor(Math.random() * (45 - 25 + 1)) + 25;

        // Add lab completion tracking
        updates[`completedLabs.${labId}`] = todayKey;
        updates[`labScores.${labId}`] = {
            score: score || 100,
            completedAt: new Date().toISOString()
        };

        // Update user balances (assuming user model has cashBalance/balance like business)
        // If not, we'll create them or increment them. 
        // Note: FieldValue.increment() works even if field doesn't exist (treats as 0)
        updates['cashBalance'] = FieldValue.increment(coinsEarned);
        updates['balance'] = FieldValue.increment(coinsEarned);

        // Apply updates
        await userRef.update(updates);

        return NextResponse.json({
            success: true,
            xpGain,
            xpToday,
            isCapped,
            coinsEarned,
            newTotal: (userData.xp || 0) + xpGain,
            message: isCapped
                ? `Daily cap reached! Earned ${xpGain} XP & ฿${coinsEarned}`
                : `Earned ${xpGain} XP & ฿${coinsEarned} for completing ${labId}`
        });

    } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        console.error('Lab complete error:', error);
        return NextResponse.json(
            { error: 'Failed to save lab completion' },
            { status: 500 }
        );
    }
}
