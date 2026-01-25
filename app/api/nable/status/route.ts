/**
 * NABLE Status API
 * 
 * GET /api/nable/status
 * Get user's NABLE status including mastery, confidence, and recommendations.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    loadState,
    getStatus,
    checkSessionRefresh,
    type NABLEState
} from '@/lib/nable';
import { verifyAuth } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
    try {
        const decodedToken = await verifyAuth(request);
        const userId = decodedToken.uid;

        // We can still support an optional override for admins if needed later, 
        // but for now strict auth is safer.
        // const { searchParams } = new URL(request.url);
        // const requestedUser = searchParams.get('userId');

        const state = loadState(userId);

        // Get overall status
        const status = getStatus(state);

        // Check for refresh needs
        const refreshCheck = checkSessionRefresh(state.knowledgeGraph, 5);

        // Build skill details
        const skillDetails = Object.entries(state.knowledgeGraph).map(([id, score]) => ({
            id,
            mastery: Math.round(score.mastery * 100),
            confidence: Math.round(score.confidence * 100),
            streak: score.streakCount,
            lastTested: score.lastTested,
            theoreticalOnly: score.theoreticalOnly,
            memoryDecay: Math.round(score.memoryDecay * 100)
        }));

        return NextResponse.json({
            success: true,
            overview: {
                overallMastery: Math.round(status.overallMastery * 100),
                overallConfidence: Math.round(status.overallConfidence * 100),
                progressionBlocked: status.progressionBlocked,
                totalSkillsTracked: Object.keys(state.knowledgeGraph).length
            },
            skills: {
                weakest: status.weakestSkills,
                strongest: status.strongestSkills,
                recommendedFocus: status.recommendedFocus,
                details: skillDetails
            },
            spacedRepetition: {
                skillsNeedingRefresh: refreshCheck.totalDecayedSkills,
                hasRefreshQuestions: refreshCheck.hasRefreshQuestions,
                refreshQueueLength: refreshCheck.refreshQueue.length
            },
            session: {
                currentStreak: state.currentStreak,
                consecutiveErrors: state.consecutiveErrors,
                questionsAnswered: state.sessionQuestions.length,
                sessionStarted: state.sessionStarted
            }
        });

    } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        console.error('NABLE Status Error');
        return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
    }
}
