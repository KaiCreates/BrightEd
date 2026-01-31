import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth-server';
import * as admin from 'firebase-admin';

export async function POST(request: NextRequest) {
    try {
        const decodedToken = await verifyAuth(request);
        const userId = decodedToken.uid;

        const userRef = adminDb.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userData = userDoc.data() || {};
        const businessId = userData.businessID;

        if (!userData.hasBusiness || !businessId) {
            return NextResponse.json({ error: 'No active business found' }, { status: 404 });
        }

        // ATOMIC BATCH - Delete business and update user
        const batch = adminDb.batch();

        // 1. Delete the business document
        const businessRef = adminDb.collection('businesses').doc(businessId);
        batch.delete(businessRef);

        // 2. Update user document - Reset business flags
        batch.update(userRef, {
            hasBusiness: false,
            businessID: admin.firestore.FieldValue.delete(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await batch.commit();

        return NextResponse.json({ success: true, message: 'Business shut down successfully' });

    } catch (error: any) {
        console.error('Shutdown Error:', error);
        return NextResponse.json({ error: 'Failed to shut down business' }, { status: 500 });
    }
}
