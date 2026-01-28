import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const decoded = await verifyAuth(request);
    const { searchParams } = new URL(request.url);

    const requestedUserId = searchParams.get('userId');
    const uid = decoded.uid;

    if (requestedUserId && requestedUserId !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userRef = adminDb.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const data = userSnap.exists ? (userSnap.data() || {}) : {};

    return NextResponse.json(
      {
        progress: data.progress || {},
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to load progress' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const decoded = await verifyAuth(request);
    const { searchParams } = new URL(request.url);

    const requestedUserId = searchParams.get('userId');
    const uid = decoded.uid;

    if (requestedUserId && requestedUserId !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userRef = adminDb.collection('users').doc(uid);

    await userRef.set(
      {
        progress: {},
        mastery: {},
        subjectProgress: {},
        globalMastery: 0,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to reset progress' }, { status: 500 });
  }
}
