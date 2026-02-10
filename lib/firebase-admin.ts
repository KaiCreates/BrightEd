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

    try {
        if (typeof json === 'string' && json.trim()) {
            serviceAccount = JSON.parse(json);
        } else if (typeof base64 === 'string' && base64.trim()) {
            const decoded = Buffer.from(base64, 'base64').toString('utf8');
            serviceAccount = JSON.parse(decoded);
        } else if (typeof serviceAccountPathEnv === 'string' && serviceAccountPathEnv.trim()) {
            const p = path.isAbsolute(serviceAccountPathEnv) ? serviceAccountPathEnv : path.join(process.cwd(), serviceAccountPathEnv);
            if (fs.existsSync(p)) {
                serviceAccount = JSON.parse(fs.readFileSync(p, 'utf8'));
            }
        }
    } catch (error) {
        console.error("Failed to parse Firebase Admin credentials:", error);
    }

    if (!serviceAccount) {
        const isBuild = process.env.NEXT_PHASE === 'phase-production-build';
        const isProd = process.env.NODE_ENV === 'production';

        if (isProd && !isBuild) {
            // In production runtime, this is critical
            console.error('CRITICAL: Missing Firebase Admin credentials. Set FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON.');
        } else {
            // In dev or build, just warn
            console.warn('Firebase Admin credentials missing. Auth/DB features on server will fail.');
        }

        // Return null instead of initializing invalid app
        return null;
    }

    try {
        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            // Add databaseURL if needed, usually https://<PROJECT_ID>.firebaseio.com
            databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
        });
    } catch (error: any) {
        // Handle "already exists" error race condition
        if (error.code === 'app/already-exists') {
            return admin.app();
        }
        console.error('Firebase Admin initialization failed:', error);
        return null;
    }
}

function getAdminDb() {
    const app = getFirebaseAdmin();
    return app ? app.firestore() : null;
}

function getAdminAuth() {
    const app = getFirebaseAdmin();
    return app ? app.auth() : null;
}

export const adminDb = new Proxy({} as FirebaseFirestore.Firestore, {
    get(_target, prop) {
        const db = getAdminDb() as any;
        if (!db) {
            // console.warn(`Attemped to access adminDb.${String(prop)} but DB is not initialized.`);
            return undefined; // Or throw? better to let it fail safely/loudly depending on usage
        }
        return db[prop];
    },
});

export const adminAuth = new Proxy({} as admin.auth.Auth, {
    get(_target, prop) {
        const authInstance = getAdminAuth() as any;
        if (!authInstance) return undefined;
        return authInstance[prop];
    },
});
