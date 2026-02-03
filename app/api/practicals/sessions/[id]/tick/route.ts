import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-server';
import { rateLimit, handleRateLimit } from '@/lib/rate-limit';
import {
  getSessionById,
  updateSession,
  getDueConsequences,
  updateConsequence,
  getPlayerProfile,
  updatePlayerProfile
} from '@/lib/stories-store';
import {
  applyResourceDelta,
} from '@/lib/stories-engine';
import type { ConsequenceEffect } from '@/lib/stories-engine/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limiter = rateLimit(request, 180, 60000, 'stories:tick');
    if (!limiter.success) return handleRateLimit(limiter.retryAfter!);

    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.uid;

    const { id: sessionId } = await params;

    // We don't trust body userId anymore, we use the token's userId
    // const body = (await request.json()) as { userId?: string };

    const session = await getSessionById(sessionId);
    if (!session || session.userId !== userId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const due = await getDueConsequences(sessionId);

    const profile = await getPlayerProfile(userId);
    const snapshot = session.snapshot || {};
    let resources = snapshot.resources ?? {
      bCoins: profile.bCoins,
      timeUnits: profile.timeUnits,
      energy: profile.energy,
      inventory: profile.inventory,
    };

    for (const c of due) {
      const effects = c.effects as ConsequenceEffect[];
      resources = applyResourceDelta(resources, effects);
      await updateConsequence(c.id, { appliedAt: now });
    }

    const newSnapshot = { ...snapshot, resources };
    await updateSession(sessionId, {
      snapshot: JSON.stringify(newSnapshot),
      lastPlayedAt: now
    });

    await updatePlayerProfile(userId, {
      bCoins: resources.bCoins,
      timeUnits: resources.timeUnits,
      energy: resources.energy,
      inventory: resources.inventory,
    });

    return NextResponse.json({
      applied: due.length,
      resources,
      snapshot: newSnapshot,
    });
  } catch (e: any) {
    if (e.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error('[stories] tick POST', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to tick' },
      { status: 500 }
    );
  }
}

