/**
 * Stats Updater Utility
 * Updates user stats (XP, streak, consistency) via the stats API
 */

export async function updateUserStats(points: number, type: 'story' | 'question') {
  try {
    const response = await fetch('/api/user/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points, type })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update stats')
    }

    const data = await response.json()
    return data.stats
  } catch (error) {
    console.error('Error updating user stats:', error)
    // Don't throw - allow app to continue even if stats update fails
    return null
  }
}

export async function getUserStats() {
  try {
    const response = await fetch('/api/user/stats')
    
    if (!response.ok) {
      throw new Error('Failed to fetch stats')
    }

    const data = await response.json()
    return data.stats
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return null
  }
}
