import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth-server';
import { rateLimit, handleRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
    try {
        const limiter = rateLimit(request, 20, 60000, 'business:insights:POST');
        if (!limiter.success) return handleRateLimit(limiter.retryAfter!);

        const decodedToken = await verifyAuth(request);
        const userId = decodedToken.uid;

        const body = await request.json();
        const { businessId } = body;

        if (!businessId) {
            return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });
        }

        // 1. Fetch live business metrics
        const bizDoc = await adminDb.collection('businesses').doc(businessId).get();
        if (!bizDoc.exists) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 });
        }

        const data = bizDoc.data();

        if (data?.ownerId !== userId) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 });
        }

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
        console.error('AI Insights error');
        return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
    }
}
