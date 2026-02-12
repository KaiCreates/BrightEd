import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateProfile, parseProfile, updateProfile } from '@/lib/stories-engine';
import type { AgeBracket } from '@/lib/stories-engine/types';
import { verifyAuth } from '@/lib/auth-server';
import { rateLimit, handleRateLimit } from '@/lib/rate-limit';

// Removed DEFAULT_USER - strictly authenticated now

async function getUserId(request: NextRequest): Promise<string> {
  const decodedToken = await verifyAuth(request);
  return decodedToken.uid;
}

export async function GET(request: NextRequest) {
  try {
    const limiter = rateLimit(request, 60, 60000, 'stories:profile:GET');
    if (!limiter.success) return handleRateLimit(limiter.retryAfter!);

    const userId = await getUserId(request);
    const profile = await getOrCreateProfile(userId);
    const parsed = parseProfile(profile);
    return NextResponse.json({
      profile: {
        userId: profile.userId,
        ageBracket: profile.ageBracket,
        skills: parsed.skills,
        reputation: parsed.reputation,
        resources: parsed.resources,
        activeConsequences: parsed.activeConsequences,
        lastSimulatedAt: (profile as any).lastSimulatedAt?.toISOString?.() ?? null,
      },
    });
  } catch (e: any) {
    if (e.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error('[stories] profile GET', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to get profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const limiter = rateLimit(request, 30, 60000, 'stories:profile:PATCH');
    if (!limiter.success) return handleRateLimit(limiter.retryAfter!);

    const userId = await getUserId(request);

    const body = (await request.json()) as {
      ageBracket?: AgeBracket;
      skills?: Record<string, number>;
      reputation?: Record<string, number>;
      bCoins?: number;
      timeUnits?: number;
      energy?: number;
    };

    const updates: Parameters<typeof updateProfile>[1] = {};
    if (body.ageBracket) updates.ageBracket = body.ageBracket;
    if (body.skills) updates.skills = body.skills;
    if (body.reputation) updates.reputation = body.reputation;
    if (body.bCoins !== undefined) updates.bCoins = body.bCoins;
    if (body.timeUnits !== undefined) updates.timeUnits = body.timeUnits;
    if (body.energy !== undefined) updates.energy = body.energy;

    await updateProfile(userId, updates);
    const profile = await getOrCreateProfile(userId);
    const parsed = parseProfile(profile);
    return NextResponse.json({
      profile: {
        userId: profile.userId,
        ageBracket: profile.ageBracket,
        skills: parsed.skills,
        reputation: parsed.reputation,
        resources: parsed.resources,
        activeConsequences: parsed.activeConsequences,
        lastSimulatedAt: (profile as any).lastSimulatedAt?.toISOString?.() ?? null,
      },
    });
  } catch (e: any) {
    if (e.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error('[stories] profile PATCH', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update profile' },
      { status: 500 }
    );
  }
}
