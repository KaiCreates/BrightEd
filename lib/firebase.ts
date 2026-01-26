import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyCnYUAPzy1NQeQSZHaM2elFgcO_qLaHI_4",
    authDomain: "brighted-426615.firebaseapp.com",
    projectId: "brighted-426615",
    storageBucket: "brighted-426615.appspot.com",
    messagingSenderId: "1066222262665",
    appId: "1:1066222262665:web:2c6b2c6b2c6b2c6b2c6b2c",
    measurementId: "G-426615",
    databaseURL: "https://brighted-426615-default-rtdb.firebaseio.com"
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
