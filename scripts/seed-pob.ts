/**
 * Seed POB Questions to Firestore
 * 
 * Usage: npx tsx scripts/seed-pob.ts
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

// Initialize Firebase Admin
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

async function seedPOB() {
    const filePath = path.join(process.cwd(), 'data', 'pob-question-template.json');
    console.log(`🔄 Reading questions from: ${filePath}`);

    try {
        const questions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`✅ Loaded ${questions.length} questions`);

        const batchSize = 500;
        for (let i = 0; i < questions.length; i += batchSize) {
            const batch = adminDb.batch();
            const chunk = questions.slice(i, i + batchSize);

            for (const q of chunk) {
                const ref = adminDb.collection('questions').doc(q.id);
                batch.set(ref, q, { merge: true });
            }

            await batch.commit();
            console.log(`󰄬 Seeded batch ${Math.floor(i / batchSize) + 1} (${chunk.length} questions)`);
        }

        console.log('\n✨ Seeding completed successfully!');

        // Also trigger cache update if needed
        console.log('🔄 Suggestion: Run npx tsx scripts/cache-objective-ids.ts to update the frontend cache.');

    } catch (error) {
        console.error('❌ Error seeding questions:', error);
        process.exit(1);
    }
}

seedPOB()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
