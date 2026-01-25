import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

// Singleton pattern for Firebase Admin
export function getFirebaseAdmin() {
    if (admin.apps.length > 0) {
        return admin.apps[0]!;
    }

    const json = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;
    const base64 = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64;
    const serviceAccountPathEnv = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;

    let serviceAccount: any | null = null;

    if (typeof json === 'string' && json.trim()) {
        serviceAccount = JSON.parse(json);
    } else if (typeof base64 === 'string' && base64.trim()) {
        const decoded = Buffer.from(base64, 'base64').toString('utf8');
        serviceAccount = JSON.parse(decoded);
    } else if (typeof serviceAccountPathEnv === 'string' && serviceAccountPathEnv.trim()) {
        const p = path.isAbsolute(serviceAccountPathEnv) ? serviceAccountPathEnv : path.join(process.cwd(), serviceAccountPathEnv);
        serviceAccount = JSON.parse(fs.readFileSync(p, 'utf8'));
    }

    if (!serviceAccount) {
        throw new Error('Missing Firebase Admin credentials. Set FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON (recommended) or FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH / GOOGLE_APPLICATION_CREDENTIALS.');
    }

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
