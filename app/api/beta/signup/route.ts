import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { adminDb } from '@/lib/firebase-admin';
import { rateLimit, handleRateLimit } from '@/lib/rate-limit';
import { sanitizeText, sanitizeEmail } from '@/lib/sanitize';

const BetaSignupSchema = z.object({
  fullName: z.string().min(2).max(80),
  email: z.string().email().max(200),
  role: z.enum(['Student', 'Teacher', 'Parent', 'School']),
  subjects: z.array(z.string().min(1).max(60)).max(12).default([]),
  motivation: z.string().min(0).max(1200).default(''),
});

export async function POST(request: NextRequest) {
  try {
    const limiter = rateLimit(request, 5, 60 * 60 * 1000);
    if (!limiter.success) return handleRateLimit(limiter.retryAfter!);

    const body = await request.json();
    const parsed = BetaSignupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const { fullName, email, role, subjects, motivation } = parsed.data;

    // Sanitize user inputs to prevent XSS
    await adminDb.collection('beta_applications').add({
      fullName: sanitizeText(fullName, 80),
      email: sanitizeEmail(email),
      role,
      subjects: subjects.map((s) => sanitizeText(s, 60)).filter(Boolean),
      motivation: sanitizeText(motivation, 1200),
      status: 'new',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}
