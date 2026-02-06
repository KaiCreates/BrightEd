/**
 * Aggregate Leaderboards Script
 * Run this every 15 minutes via cron to update leaderboard cache
 * 
 * Usage: npx tsx scripts/aggregate-leaderboards.ts
 */

import * as admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

function loadServiceAccount() {
  const json = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;
  const base64 = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64;
  const serviceAccountPathEnv = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (typeof json === 'string' && json.trim()) {
    return JSON.parse(json);
  }

  if (typeof base64 === 'string' && base64.trim()) {
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(decoded);
  }

  if (typeof serviceAccountPathEnv === 'string' && serviceAccountPathEnv.trim()) {
    const resolvedPath = path.isAbsolute(serviceAccountPathEnv)
      ? serviceAccountPathEnv
      : path.join(process.cwd(), serviceAccountPathEnv);
    if (fs.existsSync(resolvedPath)) {
      return JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
    }
  }

  return null;
}

// Initialize Firebase Admin directly for standalone script
if (!admin.apps.length) {
  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    console.error('❌ Firebase Admin credentials missing. Set FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON, FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64, or FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH.');
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
  });
}

const adminDb = admin.firestore();

interface LeaderboardUser {
  userId: string;
  displayName: string;
  xp: number;
  mastery: number;
  streak: number;
  school?: string;
  schoolId?: string;
}

interface SchoolData {
  schoolId: string;
  schoolName: string;
  totalXP: number;
  studentCount: number;
  masterySum: number;
  masteryCount: number;
}

async function aggregateLeaderboards() {
  console.log('🔄 Aggregating leaderboards...');

  try {
    const batch = adminDb.batch();
    let operationCount = 0;

    // 1. Global XP Leaderboard (Top 100)
    console.log('📊 Fetching global top 100 by XP...');
    const topXPUsers = await adminDb
      .collection('users')
      .orderBy('xp', 'desc')
      .limit(100)
      .get();

    const globalXPLeaderboard: LeaderboardUser[] = topXPUsers.docs.map(doc => ({
      userId: doc.id,
      displayName: doc.get('displayName') || doc.get('username') || 'Anonymous',
      xp: doc.get('xp') || 0,
      mastery: doc.get('globalMastery') || 0,
      streak: doc.get('streak') || 0,
      school: doc.get('school'),
      schoolId: doc.get('schoolId')
    }));

    batch.set(adminDb.collection('leaderboards').doc('global'), {
      type: 'xp',
      users: globalXPLeaderboard,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      count: globalXPLeaderboard.length
    });
    operationCount++;

    console.log(`✅ Global XP leaderboard: ${globalXPLeaderboard.length} users`);

    // 2. Global Streak Leaderboard (Top 100)
    console.log('🔥 Fetching global top 100 by streak...');
    const topStreakUsers = await adminDb
      .collection('users')
      .orderBy('streak', 'desc')
      .limit(100)
      .get();

    const globalStreakLeaderboard: LeaderboardUser[] = topStreakUsers.docs.map(doc => ({
      userId: doc.id,
      displayName: doc.get('displayName') || doc.get('username') || 'Anonymous',
      xp: doc.get('xp') || 0,
      mastery: doc.get('globalMastery') || 0,
      streak: doc.get('streak') || 0,
      school: doc.get('school'),
      schoolId: doc.get('schoolId')
    }));

    batch.set(adminDb.collection('leaderboards').doc('global_streak'), {
      type: 'streak',
      users: globalStreakLeaderboard,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      count: globalStreakLeaderboard.length
    });
    operationCount++;

    console.log(`✅ Global streak leaderboard: ${globalStreakLeaderboard.length} users`);

    // 3. Global Mastery Leaderboard (Top 100)
    console.log('🧠 Fetching global top 100 by mastery...');
    const topMasteryUsers = await adminDb
      .collection('users')
      .orderBy('globalMastery', 'desc')
      .limit(100)
      .get();

    const globalMasteryLeaderboard: LeaderboardUser[] = topMasteryUsers.docs.map(doc => ({
      userId: doc.id,
      displayName: doc.get('displayName') || doc.get('username') || 'Anonymous',
      xp: doc.get('xp') || 0,
      mastery: doc.get('globalMastery') || 0,
      streak: doc.get('streak') || 0,
      school: doc.get('school'),
      schoolId: doc.get('schoolId')
    }));

    batch.set(adminDb.collection('leaderboards').doc('global_mastery'), {
      type: 'mastery',
      users: globalMasteryLeaderboard,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      count: globalMasteryLeaderboard.length
    });
    operationCount++;

    console.log(`✅ Global mastery leaderboard: ${globalMasteryLeaderboard.length} users`);

    // 4. School Leaderboards - aggregate by school
    console.log('🏫 Aggregating school leaderboards...');
    const allUsers = await adminDb
      .collection('users')
      .get();

    const schoolMap = new Map<string, SchoolData>();
    const schoolUserMap = new Map<string, LeaderboardUser[]>();

    allUsers.docs.forEach(doc => {
      const schoolName = doc.get('school');
      const schoolId = doc.get('schoolId');

      if (!schoolName && !schoolId) return;

      const normalizedSchoolId = schoolId || schoolName.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');

      // Aggregate school stats
      if (!schoolMap.has(normalizedSchoolId)) {
        schoolMap.set(normalizedSchoolId, {
          schoolId: normalizedSchoolId,
          schoolName: schoolName || normalizedSchoolId,
          totalXP: 0,
          studentCount: 0,
          masterySum: 0,
          masteryCount: 0
        });
        schoolUserMap.set(normalizedSchoolId, []);
      }

      const school = schoolMap.get(normalizedSchoolId)!;
      school.totalXP += doc.get('xp') || 0;
      school.studentCount += 1;

      const mastery = doc.get('globalMastery');
      if (typeof mastery === 'number' && Number.isFinite(mastery)) {
        school.masterySum += mastery;
        school.masteryCount += 1;
      }

      schoolUserMap.get(normalizedSchoolId)!.push({
        userId: doc.id,
        displayName: doc.get('displayName') || doc.get('username') || 'Anonymous',
        xp: doc.get('xp') || 0,
        mastery: doc.get('globalMastery') || 0,
        streak: doc.get('streak') || 0,
        school: schoolName,
        schoolId: normalizedSchoolId
      });
    });

    console.log(`📚 Found ${schoolMap.size} schools`);

    // Save aggregated school rankings
    const schoolRankings = Array.from(schoolMap.values())
      .map(s => ({
        ...s,
        averageMastery: s.masteryCount > 0 ? s.masterySum / s.masteryCount : 0
      }))
      .sort((a, b) => b.totalXP - a.totalXP)
      .slice(0, 50);

    batch.set(adminDb.collection('leaderboards').doc('global_schools'), {
      type: 'schools',
      schools: schoolRankings,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      count: schoolRankings.length
    });
    operationCount++;

    // Save individual school leaderboards (top 50 students per school)
    schoolUserMap.forEach((users, schoolId) => {
      const sorted = users
        .sort((a, b) => b.xp - a.xp)
        .slice(0, 50);

      batch.set(adminDb.collection('leaderboards').doc(`school_${schoolId}`), {
        schoolId,
        type: 'school',
        users: sorted,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        count: sorted.length
      });
      operationCount++;
    });

    // Commit batch
    console.log(`💾 Committing ${operationCount} leaderboard updates...`);
    await batch.commit();

    console.log('✅ Leaderboards aggregated successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Global XP: ${globalXPLeaderboard.length} users`);
    console.log(`   - Global Streak: ${globalStreakLeaderboard.length} users`);
    console.log(`   - Global Mastery: ${globalMasteryLeaderboard.length} users`);
    console.log(`   - Schools: ${schoolMap.size} schools`);
    console.log(`   - Total operations: ${operationCount}`);

    // Calculate savings
    const readsPerMonth = 5000 * 3 * 1500; // 5000 users × 3 views × 1500 viewers
    const costSaved = (readsPerMonth / 100000) * 0.06;

    console.log(`\n💰 Estimated savings: $${costSaved.toFixed(2)}/month`);
    console.log(`   (${(readsPerMonth / 1000000).toFixed(1)}M reads eliminated)`);

  } catch (error) {
    console.error('❌ Error aggregating leaderboards:', error);
    throw error;
  }
}

// Run the script
aggregateLeaderboards()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
