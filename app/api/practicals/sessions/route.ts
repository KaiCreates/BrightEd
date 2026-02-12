import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-server';
import { rateLimit, handleRateLimit } from '@/lib/rate-limit';
import {
  getSessions,
  createSession,
  ensureDefaultStory,
  getStoryBySlug,
  getPlayerProfile,
  updatePlayerProfile
} from '@/lib/stories-store';
import {
  INITIAL_BUSINESS_STATE,
  BUSINESS_STORY_SLUG,
} from '@/lib/stories-engine/simulations/business';
import type { DifficultyContext, AgeBracket } from '@/lib/stories-engine/types';

export async function GET(request: NextRequest) {
  try {
    const limiter = rateLimit(request, 60, 60000, 'stories:sessions:GET');
    if (!limiter.success) return handleRateLimit(limiter.retryAfter!);

    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.uid;

    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId') ?? undefined;
    const state = searchParams.get('state') ?? undefined;

    const sessions = await getSessions(userId, { storyId, state });

    return NextResponse.json({ sessions });
  } catch (e: any) {
    if (e.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error('[stories] sessions GET', e);
    return NextResponse.json({ error: 'Failed to list sessions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const limiter = rateLimit(request, 15, 60000, 'stories:sessions:POST');
    if (!limiter.success) return handleRateLimit(limiter.retryAfter!);

    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.uid;

    await ensureDefaultStory();
    const body = (await request.json()) as {
      storySlug?: string;
      storyId?: string;
      ageBracket?: AgeBracket;
    };
    const storySlug = body.storySlug ?? BUSINESS_STORY_SLUG;

    const story = await getStoryBySlug(storySlug);
    if (!story) {
      return NextResponse.json(
        { error: `Story not found: ${storySlug}` },
        { status: 404 }
      );
    }

    const profile = await getPlayerProfile(userId);
    const difficultyContext: DifficultyContext = {
      ageBracket: (body.ageBracket ?? profile.ageBracket) as AgeBracket,
      skillLevel: (profile.skills as any)?.financialLiteracy ?? 50,
      riskAppetite: 50,
    };

    const snapshot = {
      resources: {
        bCoins: profile.bCoins,
        timeUnits: profile.timeUnits,
        inventory: profile.inventory,
        energy: profile.energy,
      },
      reputation: profile.reputation,
    };
    const businessState =
      story.slug === BUSINESS_STORY_SLUG ? INITIAL_BUSINESS_STATE : undefined;

    const sessionId = await createSession({
      userId,
      storyId: story.id,
      state: 'active',
      snapshot,
      businessState: businessState as any,
      difficultyContext: difficultyContext as any,
    });

    // Mock updateLastSimulated
    await updatePlayerProfile(userId, { lastSimulatedAt: new Date().toISOString() });

    const sessions = await getSessions(userId, { storyId: story.id, state: 'active' });
    const session = sessions.find((s: any) => s.id === sessionId);

    return NextResponse.json({ session });
  } catch (e: any) {
    if (e.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error('[stories] sessions POST', e);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

