import { adminDb } from '../lib/firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

async function migrate() {
    console.log('Starting migration from JSON to Firestore...');

    try {
        const jsonPath = path.join(process.cwd(), 'data', 'questions.json');

        if (!fs.existsSync(jsonPath)) {
            console.error('questions.json not found at', jsonPath);
            return;
        }

        const fileContent = fs.readFileSync(jsonPath, 'utf8');
        const rows = JSON.parse(fileContent);

        console.log(`Found ${rows.length} questions in JSON.`);

        if (rows.length === 0) {
            console.log('No questions to migrate.');
            return;
        }

        const batchSize = 400; // Firestore batch limit is 500
        let batch = adminDb.batch();
        let count = 0;
        let totalMigrated = 0;

        for (const row of rows) {
            const docRef = adminDb.collection('questions').doc(row.id);

            // Transform if necessary
            const questionData = {
                ...row,
                // options is usually an array in the JSON file
                options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
                migratedAt: new Date().toISOString()
            };

            batch.set(docRef, questionData, { merge: true });
            count++;

            if (count >= batchSize) {
                await batch.commit();
                totalMigrated += count;
                console.log(`Migrated ${totalMigrated} questions...`);
                batch = adminDb.batch();
                count = 0;
            }
        }

        if (count > 0) {
            await batch.commit();
            totalMigrated += count;
        }

        console.log(`Migration complete! Total questions migrated: ${totalMigrated}`);

    } catch (error) {
        console.error('Migration failed:', error);
    }
}

migrate();
