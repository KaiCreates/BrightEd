/**
 * Pre-compute Objective IDs Cache
 * Run this script weekly via cron to update the cache
 * 
 * Usage: npx tsx scripts/cache-objective-ids.ts
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

async function cacheObjectiveIds() {
  console.log('🔄 Fetching objective IDs from Firestore...');

  try {
    const snap = await adminDb
      .collection('questions')
      .select('objectiveId')
      .get();

    const ids = [...new Set(
      snap.docs
        .map(d => d.get('objectiveId'))
        .filter(id => typeof id === 'string' && id.length > 0)
    )];

    console.log(`✅ Found ${ids.length} unique objective IDs`);

    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Write to cache file
    const cacheData = {
      ids,
      timestamp: Date.now(),
      generatedAt: new Date().toISOString(),
      count: ids.length
    };

    const cachePath = path.join(dataDir, 'objective-ids-cache.json');
    fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));

    console.log(`💾 Cache saved to: ${cachePath}`);
    console.log(`📊 Stats:`);
    console.log(`   - Unique IDs: ${ids.length}`);
    console.log(`   - File size: ${(fs.statSync(cachePath).size / 1024).toFixed(2)} KB`);
    console.log(`   - Generated: ${cacheData.generatedAt}`);

    // Calculate savings
    const readsPerMonth = 2000 * 10 * 5000; // 2000 docs × 10 sessions × 5000 users
    const costSaved = (readsPerMonth / 100000) * 0.06;
    console.log(`\n💰 Estimated savings: $${costSaved.toFixed(2)}/month`);
    console.log(`   (${(readsPerMonth / 1000000).toFixed(1)}M reads eliminated)`);

  } catch (error) {
    console.error('❌ Error caching objective IDs:', error);
    process.exit(1);
  }
}

// Run the script
cacheObjectiveIds()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
