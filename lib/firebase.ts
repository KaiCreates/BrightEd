import { initializeApp } from "firebase/app";
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

const isConfigValid = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "undefined";

let app;
try {
    app = isConfigValid
        ? initializeApp(firebaseConfig)
        : initializeApp({ apiKey: "placeholder", projectId: "placeholder", appId: "placeholder" });
} catch (e) {
    console.error("Firebase initialization failed:", e);
    app = {} as any;
}

export const auth = isConfigValid ? getAuth(app) : null as any;
export const db = isConfigValid ? getFirestore(app) : null as any;
export const realtimeDb = isConfigValid ? getDatabase(app) : null as any;
export const storage = isConfigValid ? getStorage(app) : null as any;

if (typeof window !== 'undefined' && !isConfigValid) {
    console.warn("Firebase configuration is missing or invalid. Authentication and database features will not work.");
}

export const analytics = typeof window !== 'undefined' && isConfigValid ?
    isSupported().then(yes => yes ? getAnalytics(app) : null) : Promise.resolve(null);
