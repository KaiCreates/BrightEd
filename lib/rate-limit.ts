import { NextRequest, NextResponse } from 'next/server';

/**
 * Very simple in-memory rate limiter for Production Hardening.
 * In a distributed environment, this should use Redis/Upstash.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const MAX_ENTRIES = 5000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanupAt = 0;

function getClientIp(request: NextRequest) {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
    return request.ip || 'unknown';
}

function cleanup(now: number) {
    if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
    lastCleanupAt = now;

    for (const [k, v] of rateLimitMap.entries()) {
        if (now > v.resetAt) rateLimitMap.delete(k);
    }

    if (rateLimitMap.size <= MAX_ENTRIES) return;

    const over = rateLimitMap.size - MAX_ENTRIES;
    let removed = 0;
    for (const k of rateLimitMap.keys()) {
        rateLimitMap.delete(k);
        removed++;
        if (removed >= over) break;
    }
}

export function rateLimit(request: NextRequest, limit: number = 10, windowMs: number = 60000, key?: string) {
    const now = Date.now();
    cleanup(now);

    const ip = getClientIp(request);
    const routeKey = key || request.nextUrl?.pathname || 'unknown';
    const bucketKey = `${ip}:${routeKey}`;

    const record = rateLimitMap.get(bucketKey);

    if (!record || now > record.resetAt) {
        rateLimitMap.set(bucketKey, { count: 1, resetAt: now + windowMs });
        return { success: true };
    }

    if (record.count >= limit) {
        return { success: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
    }

    record.count++;
    rateLimitMap.delete(bucketKey);
    rateLimitMap.set(bucketKey, record);
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
