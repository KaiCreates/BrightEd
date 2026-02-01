/**
 * Seed POB Questions to Firestore
 * 
 * Usage: npx tsx scripts/seed-pob.ts
 */

import * as admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin
const serviceAccountPath = path.join(process.cwd(), 'brighted-b36ba-firebase-adminsdk-fbsvc-d62f85ffd0.json');

if (!admin.apps.length) {
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
        });
    } else {
        console.error('❌ Service account file not found:', serviceAccountPath);
        process.exit(1);
    }
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
