import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.uid;

    // Get user's business from Firestore
    const bizSnap = await adminDb.collection('businesses')
      .where('ownerId', '==', userId)
      .limit(1)
      .get();

    if (bizSnap.empty) {
      return NextResponse.json({
        business: null,
        has_business: false
      });
    }

    const business = bizSnap.docs[0].data();

    return NextResponse.json({
      business: {
        ...business,
        business_name: business.name // Map to match frontend expectation if needed
      },
      has_business: true
    });
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Admin SDK Business status fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch business status' }, { status: 500 });
  }
}
