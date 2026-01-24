import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAuth } from '@/lib/auth-server';

// Helper to get formatted progress using Admin SDK
async function getUserProgressMap(userId: string) {
    if (!userId || userId === 'user') return {};

    try {
        const progressRef = adminDb.collection('users').doc(userId).collection('progress');
        const snapshot = await progressRef.get();
        const progress: Record<string, any> = {};

        snapshot.forEach(doc => {
            progress[doc.id] = doc.data();
        });
        return progress;
    } catch (e) {
        console.error('Error fetching progress map with Admin SDK:', e);
        return {};
    }
}

export async function GET(request: NextRequest) {
    try {
        const decodedToken = await verifyAuth(request);
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId') || decodedToken.uid;

        // Users can only view their own progress
        if (userId !== decodedToken.uid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Migrate to reading from User Doc (Source of Truth)
        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return NextResponse.json({ progress: {} });
        }

        const userData = userDoc.data() || {};

        // Transform simplified mastery map back to "Progress Object" format if frontend expects objects
        // Frontend likely expects: { [id]: { stars, completed, ... } }
        const masteryMap = userData.mastery || {};
        const progress: Record<string, any> = {};

        Object.entries(masteryMap).forEach(([id, level]) => {
            progress[id] = {
                objectiveId: id,
                mastery: level, // 0.0 - 1.0
                stars: Math.floor((level as number) * 3), // Approx stars 0-3
                completed: (level as number) >= 0.8,
                lastAttempt: userData.updatedAt
            };
        });

        return NextResponse.json({
            progress,
            dailyStats: userData.dailyStats,
            streak: userData.streak,
            mastery: masteryMap // Raw mastery for new components
        });
    } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const decodedToken = await verifyAuth(request);
        const body = await request.json();
        const { userId = decodedToken.uid, objectiveId, stars, completed } = body;

        if (!objectiveId) {
            return NextResponse.json({ error: 'Missing objectiveId' }, { status: 400 });
        }

        // Users can only update their own progress
        if (userId !== decodedToken.uid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const userRef = adminDb.collection('users').doc(userId);
        const progressRef = userRef.collection('progress').doc(objectiveId);

        // Update progress document
        await progressRef.set({
            objectiveId,
            stars,
            completed,
            lastAttempt: new Date().toISOString()
        }, { merge: true });

        // Update User XP atomically
        const userDoc = await userRef.get();
        if (userDoc.exists) {
            await userRef.update({
                xp: FieldValue.increment(10),
                xp_today: FieldValue.increment(10)
            });
        }

        const updatedProgress = (await progressRef.get()).data();
        return NextResponse.json({ success: true, progress: updatedProgress });
    } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const decodedToken = await verifyAuth(request);
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId') || decodedToken.uid;

        // Users can only delete their own progress
        if (userId !== decodedToken.uid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const progressRef = adminDb.collection('users').doc(userId).collection('progress');
        const snapshot = await progressRef.get();

        const batch = adminDb.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        return NextResponse.json({ success: true, message: 'Progress reset successfully' });
    } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to reset progress' }, { status: 500 });
    }
}
