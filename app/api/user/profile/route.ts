import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { verifyAuth } from '@/lib/auth-server'
import { rateLimit, handleRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

function normalizeUsername(input: string) {
  return input.trim().toLowerCase()
}

function isValidUsername(username: string) {
  return /^[a-z0-9_]{3,20}$/.test(username)
}

export async function POST(request: NextRequest) {
  try {
    const limiter = rateLimit(request, 20, 60000, 'user:profile:POST')
    if (!limiter.success) return handleRateLimit(limiter.retryAfter!)

    const decoded = await verifyAuth(request)
    const uid = decoded.uid

    const body = await request.json().catch(() => ({}))
    const displayNameRaw = typeof body?.displayName === 'string' ? body.displayName : ''
    const usernameRaw = typeof body?.username === 'string' ? body.username : ''

    const displayName = displayNameRaw.trim()
    const username = normalizeUsername(usernameRaw)

    if (displayName && displayName.length < 2) {
      return NextResponse.json({ error: 'Display name must be at least 2 characters.' }, { status: 400 })
    }

    if (username && !isValidUsername(username)) {
      return NextResponse.json(
        { error: 'Username must be 3-20 chars and only contain letters, numbers, and underscores.' },
        { status: 400 }
      )
    }

    const usersRef = adminDb.collection('users')
    const usernamesRef = adminDb.collection('usernames')

    const userRef = usersRef.doc(uid)

    const result = await adminDb.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef)
      const userData = userSnap.exists ? (userSnap.data() as any) : {}

      const currentUsername = typeof userData?.username === 'string' ? normalizeUsername(userData.username) : ''
      const nextUsername = username || currentUsername

      const updates: any = {
        updatedAt: new Date().toISOString(),
      }

      if (displayName) updates.displayName = displayName

      if (nextUsername && nextUsername !== currentUsername) {
        const newRef = usernamesRef.doc(nextUsername)
        const newSnap = await tx.get(newRef)

        if (newSnap.exists) {
          const owner = (newSnap.data() as any)?.uid
          if (owner && owner !== uid) {
            const err: any = new Error('Username already taken')
            err.code = 'USERNAME_TAKEN'
            throw err
          }
        }

        tx.set(
          newRef,
          {
            uid,
            username: nextUsername,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        )

        if (currentUsername) {
          const oldRef = usernamesRef.doc(currentUsername)
          const oldSnap = await tx.get(oldRef)
          if (oldSnap.exists && (oldSnap.data() as any)?.uid === uid) {
            tx.delete(oldRef)
          }
        }

        updates.username = nextUsername
      }

      tx.set(userRef, updates, { merge: true })

      return {
        uid,
        displayName: updates.displayName ?? (userData?.displayName || null),
        username: updates.username ?? (userData?.username || null),
      }
    })

    return NextResponse.json({ ok: true, profile: result })
  } catch (e: any) {
    if (e?.code === 'USERNAME_TAKEN') {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }

    const msg = e?.message || 'Failed to update profile'
    const status = msg.startsWith('Unauthorized') ? 401 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
