import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

// Singleton pattern for Firebase Admin
export function getFirebaseAdmin() {
    if (admin.apps.length > 0) {
        return admin.apps[0]!;
    }

    const serviceAccountPath = path.join(process.cwd(), 'brighted-b36ba-firebase-adminsdk-fbsvc-d62f85ffd0.json');

    // Check if the file exists
    if (!fs.existsSync(serviceAccountPath)) {
        throw new Error(`Firebase Service Account key not found at ${serviceAccountPath}`);
    }

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
