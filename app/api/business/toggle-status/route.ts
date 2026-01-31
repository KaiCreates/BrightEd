import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth-server';

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

        const businessRef = adminDb.collection('businesses').doc(businessId);
        const businessDoc = await businessRef.get();

        if (!businessDoc.exists) {
            return NextResponse.json({ error: 'Business document missing' }, { status: 404 });
        }

        const currentStatus = businessDoc.data()?.status || 'active';
        const newStatus = currentStatus === 'active' ? 'paused' : 'active';

        await businessRef.update({
            status: newStatus,
            updatedAt: new Date().toISOString()
        });

        return NextResponse.json({ success: true, status: newStatus });

    } catch (error: any) {
        console.error('Toggle Status Error:', error);
        return NextResponse.json({ error: 'Failed to toggle business status' }, { status: 500 });
    }
}
