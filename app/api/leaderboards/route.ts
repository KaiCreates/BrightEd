import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { verifyAuth } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

type LeaderboardType = 'xp' | 'streak' | 'mastery' | 'schools'

function clampInt(value: unknown, opts: { min: number; max: number; fallback: number }) {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN
  if (!Number.isFinite(n)) return opts.fallback
  const i = Math.floor(n)
  return Math.min(opts.max, Math.max(opts.min, i))
}

function normalizeSchoolId(school: string) {
  return school
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 64)
}

function displayNameFromUser(data: any, fallbackId: string) {
  return (
    data?.displayName ||
    data?.fullName ||
    data?.username ||
    (typeof data?.firstName === 'string' && data.firstName) ||
    'Explorer'
  ) as string
}

/**
 * Try to read from pre-aggregated leaderboards collection first.
 * Falls back to direct user queries if cache doesn't exist.
 * 
 * Pre-aggregated leaderboards are updated every 15 minutes via:
 * npx tsx scripts/aggregate-leaderboards.ts
 */
export async function GET(request: NextRequest) {
  try {
    await verifyAuth(request)

    const { searchParams } = new URL(request.url)
    const type = (searchParams.get('type') || 'xp') as LeaderboardType
    const limit = clampInt(searchParams.get('limit'), { min: 1, max: 50, fallback: 20 })

    if (!['xp', 'streak', 'mastery', 'schools'].includes(type)) {
      return NextResponse.json({ error: 'Invalid leaderboard type' }, { status: 400 })
    }

    // Determine the cache document ID based on type
    let cacheDocId = 'global' // default for xp
    if (type === 'streak') cacheDocId = 'global_streak'
    else if (type === 'mastery') cacheDocId = 'global_mastery'
    else if (type === 'schools') cacheDocId = 'global_schools'

    // Try to read from pre-aggregated cache first (MUCH cheaper - 1 read vs 5000+)
    try {
      const cachedDoc = await adminDb.collection('leaderboards').doc(cacheDocId).get()

      if (cachedDoc.exists) {
        const data = cachedDoc.data()

        if (type === 'schools' && data?.schools) {
          // Schools leaderboard format
          const schools = (data.schools as any[]).slice(0, limit).map((s, idx) => ({
            id: s.schoolId,
            name: s.schoolName,
            value: s.totalXP,
            subtext: `${s.studentCount} Students • ${Math.round((s.averageMastery || 0) * 100)}% Avg Mastery`,
            rank: idx + 1,
            icon: '🏫',
            studentCount: s.studentCount,
            averageMastery: s.averageMastery
          }))

          return NextResponse.json({
            type,
            entries: schools,
            cached: true,
            lastUpdated: data.lastUpdated?.toDate?.()?.toISOString() || null
          }, {
            headers: {
              'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' // 15 min cache
            }
          })
        }

        if (data?.users && Array.isArray(data.users)) {
          // User leaderboard format
          const entries = (data.users as any[]).slice(0, limit).map((user, idx) => ({
            id: user.userId,
            name: user.displayName || 'Explorer',
            value: type === 'xp' ? user.xp : type === 'streak' ? user.streak : user.mastery,
            subtext: type === 'xp'
              ? `${user.xp || 0} XP`
              : type === 'streak'
                ? `${user.streak || 0} Day Streak`
                : `${Math.round((user.mastery || 0) * 100)}% Mastery`,
            rank: idx + 1,
            icon: type === 'xp' ? '⚡' : type === 'streak' ? '🔥' : '🧠',
            avatarUrl: user.avatarUrl || null,
            avatarCustomization: user.avatarCustomization || null,
          }))

          return NextResponse.json({
            type,
            entries,
            cached: true,
            lastUpdated: data.lastUpdated?.toDate?.()?.toISOString() || null
          }, {
            headers: {
              'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' // 15 min cache
            }
          })
        }
      }
    } catch (cacheError) {
      // Cache read failed, fall through to direct query
      console.warn('Leaderboard cache miss, falling back to direct query:', cacheError)
    }

    // FALLBACK: Direct query (expensive but ensures functionality)
    // This runs if cache doesn't exist yet
    if (type === 'schools') {
      // Note: Firestore has no server-side group-by. This aggregates in memory.
      // For large datasets, run aggregate-leaderboards.ts to pre-compute.
      const usersSnap = await adminDb.collection('users').get()

      const bySchool = new Map<
        string,
        { schoolId: string; schoolName: string; totalXP: number; studentCount: number; masterySum: number; masteryCount: number }
      >()

      usersSnap.forEach((doc) => {
        const d = doc.data() || {}
        const schoolNameRaw = (d.school as string | undefined) || ''
        const schoolName = schoolNameRaw.trim()
        if (!schoolName) return

        const schoolId = (d.schoolId as string | undefined) || normalizeSchoolId(schoolName)
        const xp = typeof d.xp === 'number' ? d.xp : 0
        const gm = typeof d.globalMastery === 'number' ? d.globalMastery : undefined

        const cur = bySchool.get(schoolId) || {
          schoolId,
          schoolName,
          totalXP: 0,
          studentCount: 0,
          masterySum: 0,
          masteryCount: 0,
        }

        cur.totalXP += xp
        cur.studentCount += 1
        if (typeof gm === 'number' && Number.isFinite(gm)) {
          cur.masterySum += gm
          cur.masteryCount += 1
        }

        bySchool.set(schoolId, cur)
      })

      const schools = Array.from(bySchool.values())
        .sort((a, b) => b.totalXP - a.totalXP)
        .slice(0, limit)
        .map((s, idx) => {
          const avgMastery = s.masteryCount ? s.masterySum / s.masteryCount : 0
          return {
            id: s.schoolId,
            name: s.schoolName,
            value: s.totalXP,
            subtext: `${s.studentCount} Students • ${Math.round(avgMastery * 100)}% Avg Mastery`,
            rank: idx + 1,
            icon: '🏫',
            studentCount: s.studentCount,
            averageMastery: avgMastery,
          }
        })

      return NextResponse.json({ type, entries: schools, cached: false })
    }

    const field = type === 'xp' ? 'xp' : type === 'streak' ? 'streak' : 'globalMastery'

    const snap = await adminDb.collection('users').orderBy(field, 'desc').limit(limit).get()

    const entries = snap.docs.map((doc, idx) => {
      const d = doc.data() || {}

      const valueRaw = d[field]
      const value = typeof valueRaw === 'number' ? valueRaw : 0

      const subtext =
        type === 'xp'
          ? `${value} XP`
          : type === 'streak'
            ? `${value} Day Streak`
            : `${Math.round(value * 100)}% Mastery`

      return {
        id: doc.id,
        name: displayNameFromUser(d, doc.id),
        value,
        subtext,
        rank: idx + 1,
        icon: type === 'xp' ? '⚡' : type === 'streak' ? '🔥' : '🧠',
        avatarUrl: d.avatarUrl || null,
        avatarCustomization: d.avatarCustomization || null,
      }
    })

    return NextResponse.json({ type, entries, cached: false })
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    console.error('Leaderboards error:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboards' }, { status: 500 })
  }
}
