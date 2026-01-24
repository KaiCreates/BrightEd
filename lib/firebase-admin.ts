import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

// Singleton pattern for Firebase Admin
export function getFirebaseAdmin() {
    if (admin.apps.length > 0) {
        return admin.apps[0]!;
    }

    // Dynamic key loading: Find any file matching the pattern
    const rootDir = process.cwd();
    const files = fs.readdirSync(rootDir);
    const serviceAccountFile = files.find(f => f.includes('firebase-adminsdk') && f.endsWith('.json'));

    if (!serviceAccountFile) {
        throw new Error('No Firebase Service Account key file (*firebase-adminsdk*.json) found in project root.');
    }

    const serviceAccountPath = path.join(rootDir, serviceAccountFile);
    console.log(`Loading Firebase Admin credentials from: ${serviceAccountFile}`);

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // Add databaseURL if needed, usually https://<PROJECT_ID>.firebaseio.com
        databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
    });
}

export const adminDb = admin.apps.length > 0
    ? admin.apps[0]!.firestore()
    : getFirebaseAdmin().firestore();

export const adminAuth = admin.apps.length > 0
    ? admin.apps[0]!.auth()
    : getFirebaseAdmin().auth();
