import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
    try {
        const decodedToken = await verifyAuth(request);
        const authUserId = decodedToken.uid;

        const body = await request.json();
        const { businessId, userId } = body;

        if (!businessId || !userId) {
            return NextResponse.json({ error: 'Missing businessId or userId' }, { status: 400 });
        }

        if (authUserId !== userId) {
            return NextResponse.json({ error: 'Unauthorized: User ID mismatch' }, { status: 403 });
        }

        // 1. Fetch live business metrics
        const bizDoc = await adminDb.collection('businesses').doc(businessId).get();
        if (!bizDoc.exists) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 });
        }

        const data = bizDoc.data();

        // 2. Mock AI Logic (In a real scenario, this would call Gemini/GPT)
        // Here we simulate professional suggestions based on actual metrics
        const suggestions = [
            `Since your current phase is '${data?.phase}', focus on customer acquisition to boost your $${data?.cashflow} monthly cashflow.`,
            `With ${data?.employeeCount} employee(s), consider automating repeated processes before your next hire to preserve your ฿ ${data?.balance} balance.`,
            `Your entity valuation of ฿ ${data?.valuation.toLocaleString()} suggests you are ready for Series A expansion.`
        ];

        return NextResponse.json({
            success: true,
            suggestions,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        console.error('AI Insights error:', error);
        return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
    }
}
