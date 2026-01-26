import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
};

// Singleton pattern for Firebase initialization
const isConfigValid = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "undefined";

function getInitializedApp() {
    if (getApps().length > 0) {
        return getApp();
    }

    if (isConfigValid) {
        return initializeApp(firebaseConfig);
    }

    // Placeholder to prevent build crashes, but will trigger warnings at runtime
    return initializeApp({
        apiKey: "placeholder",
        projectId: "placeholder",
        appId: "placeholder"
    });
}

const app = getInitializedApp();

export const isFirebaseReady = isConfigValid;
export const auth = isFirebaseReady ? getAuth(app) : null as any;
export const db = isFirebaseReady ? getFirestore(app) : null as any;
export const realtimeDb = isFirebaseReady ? getDatabase(app) : null as any;
export const storage = isFirebaseReady ? getStorage(app) : null as any;

if (typeof window !== 'undefined' && !isFirebaseReady) {
    console.warn("Firebase configuration is missing or invalid. Authentication and database features will be disabled.");
}

export const analytics = typeof window !== 'undefined' && isFirebaseReady ?
    isSupported().then(yes => yes ? getAnalytics(app) : null) : Promise.resolve(null);
