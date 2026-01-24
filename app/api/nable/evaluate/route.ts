import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth-server';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { rateLimit, handleRateLimit } from '@/lib/rate-limit';
import {
    evaluate,
    loadState,
    NABLEState,
    createInitialState,
    NABLEEvaluateRequest
} from '@/lib/nable';

const EvaluateSchema = z.object({
    userId: z.string(),
    questionId: z.string(),
    objectiveId: z.string(),
    selectedAnswer: z.number(),
    correctAnswer: z.number(),
    options: z.array(z.string()).optional().default([]),
    timeToAnswer: z.number().optional().default(5),
    subSkills: z.array(z.string()).optional().default([]),
    questionDifficulty: z.number().optional().default(5),
    // Optional: Send current NABLE state to avoid extra read if client has it
    currentState: z.any().optional(),
    knowledgeGraph: z.record(z.any()).optional().default({})
});

export async function POST(request: NextRequest) {
    try {
        // 1. Rate Limit Check
        const limiter = rateLimit(request, 20, 60000);
        if (!limiter.success) return handleRateLimit(limiter.retryAfter!);

        // 2. Strict Auth Verification
        const decodedToken = await verifyAuth(request);
        const body = await request.json();

        if (decodedToken.uid !== body.userId) {
            return NextResponse.json({ error: 'Auth mismatch: Unauthorized' }, { status: 401 });
        }

        // 3. Validation
        const result = EvaluateSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: 'Invalid data', details: result.error }, { status: 400 });
        }

        const {
            userId,
            questionId,
            objectiveId,
            selectedAnswer,
            correctAnswer,
            options,
            timeToAnswer,
            subSkills,
            questionDifficulty,
            currentState,
            knowledgeGraph
        } = result.data;

        // 4. Load NABLE State
        // Strategy: Use passed state/graph if valid to save a read, otherwise DB, otherwise cold start.
        const nableRef = adminDb.collection('users').doc(userId).collection('nable').doc('state');
        let nableState: NABLEState;

        // Try Loading
        if (currentState) {
            nableState = loadState(userId, currentState);
        } else if (Object.keys(knowledgeGraph).length > 0) {
            nableState = loadState(userId, { knowledgeGraph });
        } else {
            const nableDoc = await nableRef.get();
            if (nableDoc.exists) {
                nableState = loadState(userId, nableDoc.data() as Partial<NABLEState>);
            } else {
                nableState = createInitialState(userId);
            }
        }

        // 5. Evaluate with NABLE Engine
        const isCorrect = selectedAnswer === correctAnswer;

        // Ensure subSkills has at least the objectiveId
        const activeSubSkills = subSkills.length > 0 ? subSkills : [objectiveId];

        const nableRequest: NABLEEvaluateRequest = {
            userId,
            questionId,
            objectiveId,
            selectedAnswer,
            correctAnswer,
            options,
            timeToAnswer,
            subSkills: activeSubSkills,
            questionDifficulty
        };

        const { response: nableResponse, newState: newNableState } = evaluate(
            nableState,
            nableRequest
        );

        // 6. Atomic Persistence (NABLE State + Legacy Stats)
        const userRef = adminDb.collection('users').doc(userId);

        await adminDb.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) throw new Error("User not found");
            const userData = userDoc.data() || {};

            // A. Save NABLE State
            transaction.set(nableRef, newNableState);

            // B. Map NABLE Mastery to Stars (Strict)
            // 3 stars: mastery > 0.8 AND confidence > 0.6
            // 2 stars: mastery > 0.6 AND confidence > 0.4
            // 1 star: mastery > 0.3
            // 0 stars: default

            const currentProgress = userData.progress || {};
            const objProgress = currentProgress[objectiveId] || { stars: 0 };

            const objMastery = newNableState.knowledgeGraph[objectiveId]?.mastery || 0;
            const objConfidence = newNableState.knowledgeGraph[objectiveId]?.confidence || 0;

            // Calculate potential new stars based on mastery
            let calculatedStars = 0;
            if (objMastery >= 0.8 && objConfidence >= 0.6) calculatedStars = 3;
            else if (objMastery >= 0.6 && objConfidence >= 0.4) calculatedStars = 2;
            else if (objMastery >= 0.3) calculatedStars = 1;

            // STICKY STARS: Only go up, never down (prevents frustration)
            const newStars = Math.max(objProgress.stars || 0, calculatedStars);

            // Rewards - Base XP for correct, Bonus for Star Increase
            const starIncrease = Math.max(0, newStars - (objProgress.stars || 0));
            const xpGain = (isCorrect ? 10 : 2) + (starIncrease * 50);
            const bCoinGain = isCorrect ? 5 : 0;

            // Updates
            const updates: any = {
                [`progress.${objectiveId}`]: {
                    ...objProgress,
                    stars: newStars,
                    mastery: objMastery, // Sync NABLE mastery to legacy field
                    confidence: objConfidence,
                    lastAttempt: new Date().toISOString(),
                    completed: newStars >= 3
                },
                [`mastery.${objectiveId}`]: objMastery, // Direct access map
                // ATOMIC UPDATES: Use FieldValue.increment to prevent race conditions
                xp: admin.firestore.FieldValue.increment(xpGain),
                bCoins: admin.firestore.FieldValue.increment(bCoinGain),
                updatedAt: new Date().toISOString()
            };

            // Enhanced Activity Log for analytics
            const logRef = userRef.collection('activity_logs').doc();
            transaction.set(logRef, {
                type: 'evaluate',
                objectiveId,
                questionId,
                isCorrect,
                selectedAnswer,
                correctAnswer,
                timeToAnswer,
                mastery: objMastery,
                confidence: objConfidence,
                starsEarned: newStars,
                xpGained: xpGain,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            // Track attempts so we can avoid immediate repeats.
            const attemptRef = userRef.collection('question_attempts').doc();
            transaction.set(attemptRef, {
                questionId,
                objectiveId,
                isCorrect,
                selectedAnswer,
                correctAnswer,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            // Track correct questions so we can permanently exclude them.
            if (isCorrect) {
                const correctRef = userRef.collection('correct_questions').doc(questionId);
                transaction.set(correctRef, {
                    questionId,
                    objectiveId,
                    lastCorrectAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            transaction.update(userRef, updates);
        });

        // 7. Response
        return NextResponse.json({
            ...nableResponse,
            // Include legacy star data for frontend animations if needed
            starsEarned: isCorrect ? 1 : 0
        });

    } catch (error: any) {
        console.error("Evaluation Error:", error.message || error);
        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json({ error: error.message || 'Evaluation failed' }, { status: 500 });
    }
}