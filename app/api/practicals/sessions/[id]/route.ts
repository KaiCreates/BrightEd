import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-server';
import { getSessionById, updateSession } from '@/lib/stories-store';
import {
  tickRegistration,
  registrationRemainingMinutes,
  marketFluctuation,
} from '@/lib/stories-engine/simulations/business';
import { adminDb } from '@/lib/firebase-admin';
import { calculateXPUpdate, getDayKey } from '@/lib/xp-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.uid;

    const { id } = await params;
    const session = await getSessionById(id);

    if (!session || session.userId !== userId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const config = session.story?.config ?? {};
    let businessState = session.businessState;
    const now = new Date();

    if (businessState && session.story?.slug === 'business-financial-literacy') {
      businessState = tickRegistration(businessState, config, now);

      if (session.state === 'active' && businessState.lastMarketUpdate) {
        const exposure = businessState.marketExposure ?? 0;
        const delta = marketFluctuation(exposure);
        businessState = {
          ...businessState,
          cashBalance: Math.max(0, businessState.cashBalance + delta),
          lastMarketUpdate: now.toISOString(),
        };
      }

      await updateSession(id, {
        businessState: JSON.stringify(businessState),
        lastPlayedAt: now.toISOString(),
      });
    }

    return NextResponse.json({
      session: {
        ...session,
        businessState,
        startedAt: new Date(session.startedAt).toISOString(),
        lastPlayedAt: new Date(session.lastPlayedAt).toISOString(),
        completedAt: session.completedAt ? new Date(session.completedAt).toISOString() : null,
        registrationRemainingMinutes:
          businessState && session.story?.slug === 'business-financial-literacy'
            ? registrationRemainingMinutes(businessState, config, now)
            : null,
      },
    });
  } catch (e: any) {
    if (e.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error('[stories] session GET', e);
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.uid;

    const { id } = await params;
    const body = (await request.json()) as {
      state?: string;
      businessState?: any;
    };

    const session = await getSessionById(id);
    if (!session || session.userId !== userId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const updates: any = {};
    if (body.state) {
      updates.state = body.state;
      if (body.state === 'completed' || body.state === 'failed') {
        updates.completedAt = new Date().toISOString();

        // Award XP for practical completion
        if (body.state === 'completed') {
          try {
            const userRef = adminDb.collection('users').doc(userId);
            const userSnap = await userRef.get();
            const userData = userSnap.data() || {};

            // Significant reward for practical completion: 150 raw points -> ~75 points after modifier
            const rawXpGain = 150;
            const xpUpdate = calculateXPUpdate(userData, rawXpGain);

            // Use FieldValue.increment for atomic updates
            await userRef.update(xpUpdate.updates);
          } catch (error) {
            console.error('[XP Reward] Failed to award practical XP:', error);
          }
        }
      }
    }
    if (body.businessState) {
      updates.businessState = JSON.stringify(body.businessState);
    }

    await updateSession(id, updates);
    const updated = await getSessionById(id);

    return NextResponse.json({
      session: {
        id: updated.id,
        state: updated.state,
        businessState: updated.businessState,
        completedAt: updated.completedAt ? new Date(updated.completedAt).toISOString() : null,
      },
    });
  } catch (e: any) {
    if (e.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error('[stories] session PATCH', e);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
