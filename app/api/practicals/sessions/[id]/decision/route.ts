import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-server';
import { rateLimit, handleRateLimit } from '@/lib/rate-limit';
import {
  getSessionById,
  updateSession,
  getPlayerProfile,
  updatePlayerProfile,
  createConsequence,
  createDecisionLog,
} from '@/lib/stories-store';
import {
  resolveChoice,
  applyResourceDelta,
} from '@/lib/stories-engine';
import { BUSINESS_STORY_SLUG } from '@/lib/stories-engine/simulations/business';
import type { BusinessSimState, ConsequenceEffect } from '@/lib/stories-engine/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limiter = rateLimit(request, 60, 60000, 'stories:decision');
    if (!limiter.success) return handleRateLimit(limiter.retryAfter!);

    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.uid;

    const { id: sessionId } = await params;
    const body = (await request.json()) as {
      choiceId: string;
      payload?: Record<string, unknown>;
    };

    // const userId = body.userId ?? DEFAULT_USER; // REMOVED insecure fallback

    const { choiceId, payload = {} } = body;
    if (!choiceId) {
      return NextResponse.json({ error: 'Missing choiceId' }, { status: 400 });
    }

    const session = await getSessionById(sessionId);
    if (!session || session.userId !== userId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (session.state !== 'active') {
      return NextResponse.json({ error: 'Session not active' }, { status: 400 });
    }

    const profile = await getPlayerProfile(userId);
    const { immediate, delayed } = resolveChoice({
      choiceId,
      payload,
      sessionId,
      profile: {
        skills: profile.skills as Record<string, number>,
        reputation: profile.reputation as Record<string, number>,
      },
    });

    const snapshot = session.snapshot || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let resources: any = snapshot.resources || {
      bCoins: profile.bCoins,
      timeUnits: profile.timeUnits,
      inventory: profile.inventory,
      energy: profile.energy,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resources = applyResourceDelta(resources as any, immediate as any);

    let businessState = session.businessState as unknown as BusinessSimState | null;

    if (choiceId === 'business_register' && session.story?.slug === BUSINESS_STORY_SLUG) {
      const name = (payload.businessName as string) || 'My Business';
      businessState = {
        ...(businessState ?? {
          registrationStatus: 'none',
          cashBalance: 500,
          inventory: {},
          loans: [],
          taxObligations: [],
          marketExposure: 0,
          lastMarketUpdate: new Date().toISOString(),
        }),
        registrationStatus: 'pending',
        registrationSubmittedAt: new Date().toISOString(),
        businessName: name,
      };
    }

    const newSnapshot = { ...snapshot, resources };
    await updateSession(sessionId, {
      snapshot: JSON.stringify(newSnapshot),
      ...(businessState && { businessState: JSON.stringify(businessState) }),
    });

    // Create Decision Log
    const decisionId = await createDecisionLog({
      sessionId,
      choiceId,
      payload,
      resolved: true
    });

    // Persist delayed consequences
    for (const c of (delayed as any[])) {
      const scheduledAt = new Date(Date.now() + (c.delayMinutes || 0) * 60000).toISOString();
      await createConsequence({
        decisionId,
        sessionId,
        type: 'delayed',
        scheduledAt,
        ruleId: c.ruleId,
        effects: c.effects,
      });
    }

    await updatePlayerProfile(userId, {
      bCoins: resources.bCoins,
      timeUnits: resources.timeUnits,
      energy: resources.energy,
      inventory: JSON.stringify(resources.inventory),
    });

    return NextResponse.json({
      choiceId,
      immediate: immediate as ConsequenceEffect[],
      delayedCount: delayed.length,
      resources,
      businessState,
      snapshot: newSnapshot,
    });
  } catch (e: any) {
    if (e.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error('[stories] decision POST', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to process decision' },
      { status: 500 }
    );
  }
}

