import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-server'
import { rateLimit, handleRateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const MetadataSchema = z.object({
    subjects: z.array(z.string().min(1).max(100)).max(20).optional(),
    source: z.string().min(1).max(200).optional(),
    proficiencies: z.record(z.string(), z.string()).optional(),
    timestamp: z.string().max(50).optional(),
})

export async function POST(request: NextRequest) {
    try {
        // Rate limit: 10 requests per minute per IP
        const limiter = rateLimit(request, 10, 60000)
        if (!limiter.success) return handleRateLimit(limiter.retryAfter!)

        // Require authentication
        const decodedToken = await verifyAuth(request)
        const userId = decodedToken.uid

        const body = await request.json()
        const result = MetadataSchema.safeParse(body)

        if (!result.success) {
            return NextResponse.json(
                { error: 'Invalid data', details: result.error.format() },
                { status: 400 }
            )
        }

        const { subjects, source, proficiencies, timestamp } = result.data

        // Log metadata (in production, you might store this differently)
        console.log(`[Metadata] User ${userId} saved preferences:`, {
            subjects: subjects?.length || 0,
            source,
            timestamp: timestamp || new Date().toISOString(),
        })

        // Instead of writing to filesystem (security risk), we just acknowledge receipt
        // In production, this could be stored in Firestore under the user's document
        return NextResponse.json({
            success: true,
            message: 'Metadata received',
            userId,
        })
    } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        console.error('Metadata API error:', error)
        return NextResponse.json(
            { error: 'Failed to save metadata' },
            { status: 500 }
        )
    }
}
