import { NextRequest, NextResponse } from 'next/server';
import { getAllStories, ensureDefaultStory } from '@/lib/stories-store';
import { verifyAuth } from '@/lib/auth-server';

 export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await verifyAuth(request);

    await ensureDefaultStory();
    const stories = await getAllStories();
    return NextResponse.json({ stories });
  } catch (e: any) {
    if (e.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error('[stories] stories GET error:', e);
    return NextResponse.json({ error: 'Failed to list stories' }, { status: 500 });
  }
}
