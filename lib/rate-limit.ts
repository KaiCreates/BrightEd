import { NextRequest, NextResponse } from 'next/server';

/**
 * Very simple in-memory rate limiter for Production Hardening.
 * In a distributed environment, this should use Redis/Upstash.
 */
const rateLimitMap = new Map<string, { count: number, resetAt: number }>();

export function rateLimit(request: NextRequest, limit: number = 10, windowMs: number = 60000) {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = request.ip || forwardedFor?.split(',')[0]?.trim() || 'unknown';
    const now = Date.now();

    const record = rateLimitMap.get(ip);

    if (!record || now > record.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
        return { success: true };
    }

    if (record.count >= limit) {
        return { success: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
    }

    record.count++;
    return { success: true };
}

export function handleRateLimit(retryAfter: number) {
    return NextResponse.json({
        error: 'Too many requests',
        retryAfter: `${retryAfter}s`
    }, {
        status: 429,
        headers: {
            'Retry-After': retryAfter.toString()
        }
    });
}
