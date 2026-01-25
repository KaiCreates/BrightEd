/**
 * NABLE Recommend API
 * GET /api/nable/recommend
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth-server';
import { z } from 'zod';
import {
    recommend,
    loadState,
    getStatus,
    createInitialState,
    type NABLEState,
    type ContentItem
} from '@/lib/nable';

export const dynamic = 'force-dynamic';

// 1. Validation Schema
const QuerySchema = z.object({
    subject: z.string(),
    exclude: z.string().optional().default(''),
});

export async function GET(request: NextRequest) {
    try {
        // 2. Auth Check
        const decodedToken = await verifyAuth(request);
        const userId = decodedToken.uid;

        // 3. Parse and Validate Query Params
        const { searchParams } = new URL(request.url);
        const query = QuerySchema.safeParse({
            subject: searchParams.get('subject'),
            exclude: searchParams.get('exclude'),
        });

        if (!query.success) {
            return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
        }

        const { subject, exclude } = query.data;
        const excludeIds = exclude ? exclude.split(',') : [];

        // Security check: Users can only request their own recommendations
        // Removed this check as userId is now derived from auth token

        // 4. Load NABLE State from Firestore
        const nableRef = adminDb.collection('users').doc(userId).collection('nable').doc('state');
        const nableDoc = await nableRef.get();

        let state: NABLEState;
        if (nableDoc.exists) {
            state = loadState(userId, nableDoc.data() as Partial<NABLEState>);
        } else {
            state = createInitialState(userId);
        }

        // 5. Fetch Question Pool from DB (Instead of Mock)
        // Optimization: Fetch only questions relevant to the current subject
        const questionsSnapshot = await adminDb.collection('questions')
            .where('subject', '==', subject)
            .limit(50) // Fetch a reasonable pool for the engine to pick from
            .get();

        const questionPool: ContentItem[] = questionsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                questionId: doc.id,
                objectiveId: data.objectiveId,
                difficultyWeight: data.difficulty || 5,
                subSkills: data.subSkills || [],
                contentType: data.contentType || 'standard',
                distractorSimilarity: data.distractorSimilarity || 0.5,
                expectedTime: data.expectedTime || 45
            };
        });

        if (questionPool.length === 0) {
            return NextResponse.json({ error: 'No questions available for this subject' }, { status: 404 });
        }

        // 6. Execute NABLE Recommendation Logic
        const { question, refreshFirst, refreshQueue } = recommend(
            state,
            { userId, subject, excludeQuestionIds: excludeIds },
            questionPool
        );

        // 7. Get Learner Status
        const status = getStatus(state);

        // 8. Final Response
        return NextResponse.json({
            success: true,
            recommendation: question,
            refreshFirst,
            refreshQueueLength: refreshQueue.length,
            status: {
                overallMastery: Math.round(status.overallMastery * 100) / 100,
                overallConfidence: Math.round(status.overallConfidence * 100) / 100,
                weakestSkills: status.weakestSkills.slice(0, 3),
                progressionBlocked: status.progressionBlocked,
                recommendedFocus: status.recommendedFocus
            },
            session: {
                currentStreak: state.currentStreak,
                questionsAnswered: state.sessionQuestions.length,
                lastDifficulty: state.lastDifficulty
            }
        });

    } catch (error: any) {
        console.error('NABLE Recommend Error');

        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        return NextResponse.json(
            { error: 'Failed to get recommendation' },
            { status: 500 }
        );
    }
}