import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { enableIndexedDbPersistence, enableMultiTabIndexedDbPersistence, initializeFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || undefined,
};

// Singleton pattern for Firebase initialization
const isConfigValid =
    !!firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "undefined" &&
    !!firebaseConfig.authDomain &&
    !!firebaseConfig.projectId &&
    !!firebaseConfig.appId;

function getInitializedApp() {
    if (getApps().length > 0) {
        return getApp();
    }

    if (!isConfigValid) {
        throw new Error(
            "Firebase configuration is missing or invalid. " +
            "Required: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, " +
            "NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_APP_ID"
        );
    }

    return initializeApp(firebaseConfig);
}

// Getter functions - these will throw if Firebase is not properly configured
export function getFirebaseApp() {
    return getInitializedApp();
}

export function getFirebaseAuth() {
    return getAuth(getInitializedApp());
}

export function getFirebaseDb() {
    return initializeFirestore(getInitializedApp(), {
        experimentalForceLongPolling: true,
    });
}

export function getFirebaseRealtimeDb() {
    if (!firebaseConfig.databaseURL) {
        throw new Error("Firebase databaseURL is not configured. Set NEXT_PUBLIC_FIREBASE_DATABASE_URL.");
    }
    return getDatabase(getInitializedApp());
}

export function getFirebaseStorage() {
    return getStorage(getInitializedApp());
}

// Legacy exports for backward compatibility (deprecated)
export const isFirebaseReady = isConfigValid;
export const auth = isFirebaseReady ? getAuth(getInitializedApp()) : null as any;
export const db = isFirebaseReady ? initializeFirestore(getInitializedApp(), {
    experimentalForceLongPolling: true,
}) : null as any;
export const realtimeDb = isFirebaseReady && firebaseConfig.databaseURL ? getDatabase(getInitializedApp()) : null as any;
export const storage = isFirebaseReady ? getStorage(getInitializedApp()) : null as any;

if (typeof window !== 'undefined') {
    try {
        const dbInstance = getFirebaseDb();
        enableMultiTabIndexedDbPersistence(dbInstance).catch(() => {
            enableIndexedDbPersistence(dbInstance).catch(() => { });
        });
    } catch (error) {
        console.warn("Failed to enable Firestore persistence:", error);
    }
}

if (typeof window !== 'undefined' && !isConfigValid) {
    console.warn(
        "Firebase configuration is missing or invalid. " +
        "Authentication and database features will be disabled. " +
        "Check your NEXT_PUBLIC_FIREBASE_* environment variables."
    );
}

const analyticsEnabled = typeof window !== 'undefined' && isConfigValid && !!firebaseConfig.measurementId;

export const analytics = analyticsEnabled
    ? isSupported().then(yes => yes ? getAnalytics(getInitializedApp()) : null)
    : Promise.resolve(null);
