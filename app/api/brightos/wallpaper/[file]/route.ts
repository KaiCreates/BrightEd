import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

import { BRIGHTOS_WALLPAPER_FILES } from '@/lib/brightos/wallpapers';

export async function GET(_req: Request, { params }: { params: { file: string } }) {
  const requested = params.file;

  if (!(BRIGHTOS_WALLPAPER_FILES as readonly string[]).includes(requested)) {
    return NextResponse.json({ error: 'Wallpaper not found' }, { status: 404 });
  }

  const abs = path.join(process.cwd(), 'BrightOS Wallpapers', requested);

  try {
    const buf = await readFile(abs);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Wallpaper not found' }, { status: 404 });
  }
}
