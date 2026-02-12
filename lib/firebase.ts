import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { enableIndexedDbPersistence, enableMultiTabIndexedDbPersistence, initializeFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

// ============================================================================
// Environment Variable Validation
// ============================================================================

function getEnvVar(name: string, required: boolean = false): string | undefined {
  const value = process.env[name];
  
  if (!value || value === 'undefined' || value === '') {
    if (required) {
      console.error(`[Firebase Config] Missing required environment variable: ${name}`);
    }
    return undefined;
  }
  
  return value;
}

// ============================================================================
// Firebase Configuration
// ============================================================================

const firebaseConfig = {
  apiKey: getEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY', true) || "",
  authDomain: getEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', true) || "",
  projectId: getEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID', true) || "",
  storageBucket: getEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET') || "",
  messagingSenderId: getEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID') || "",
  appId: getEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID', true) || "",
  measurementId: getEnvVar('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID') || undefined,
  databaseURL: getEnvVar('NEXT_PUBLIC_FIREBASE_DATABASE_URL') || undefined,
};

// ============================================================================
// Configuration Validation
// ============================================================================

const isConfigValid =
  !!firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== "undefined" &&
  !!firebaseConfig.authDomain &&
  !!firebaseConfig.projectId &&
  !!firebaseConfig.appId;

// Detailed logging for debugging
if (typeof window !== 'undefined') {
  if (isConfigValid) {
    console.log('[Firebase] ✅ Configuration loaded successfully');
    console.log('[Firebase] Project:', firebaseConfig.projectId);
    console.log('[Firebase] Auth Domain:', firebaseConfig.authDomain);
  } else {
    console.error(
      "[Firebase] ❌ CRITICAL: Configuration is missing or invalid!\n" +
      "Authentication will NOT work.\n\n" +
      "Required environment variables:\n" +
      "  - NEXT_PUBLIC_FIREBASE_API_KEY\n" +
      "  - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN\n" +
      "  - NEXT_PUBLIC_FIREBASE_PROJECT_ID\n" +
      "  - NEXT_PUBLIC_FIREBASE_APP_ID\n\n" +
      "Current status:",
      {
        apiKey: !!firebaseConfig.apiKey ? '✅ Set' : '❌ Missing',
        authDomain: !!firebaseConfig.authDomain ? '✅ Set' : '❌ Missing',
        projectId: !!firebaseConfig.projectId ? '✅ Set' : '❌ Missing',
        appId: !!firebaseConfig.appId ? '✅ Set' : '❌ Missing'
      }
    );
  }
}

// ============================================================================
// App Initialization
// ============================================================================

function getInitializedApp() {
  if (getApps().length > 0) {
    return getApp();
  }

  if (!isConfigValid) {
    const missing = [
      !firebaseConfig.apiKey && 'NEXT_PUBLIC_FIREBASE_API_KEY',
      !firebaseConfig.authDomain && 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      !firebaseConfig.projectId && 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      !firebaseConfig.appId && 'NEXT_PUBLIC_FIREBASE_APP_ID'
    ].filter(Boolean);

    throw new Error(
      `Firebase configuration is missing or invalid.\n\n` +
      `Missing environment variables: ${missing.join(', ')}\n\n` +
      `To fix:\n` +
      `1. Check your .env.local file exists\n` +
      `2. Ensure all NEXT_PUBLIC_FIREBASE_* variables are set\n` +
      `3. For Render deployment, see docs/RENDER_SETUP.md\n` +
      `4. Restart your development server after making changes`
    );
  }

  try {
    const app = initializeApp(firebaseConfig);
    if (typeof window !== 'undefined') {
      console.log('[Firebase] ✅ App initialized successfully');
    }
    return app;
  } catch (error) {
    console.error('[Firebase] ❌ Failed to initialize app:', error);
    throw error;
  }
}

// ============================================================================
// Service Getters
// ============================================================================

export function getFirebaseApp() {
  try {
    return getInitializedApp();
  } catch (error) {
    console.error('[Firebase] Failed to get app:', error);
    throw error;
  }
}

export function getFirebaseAuth() {
  try {
    return getAuth(getInitializedApp());
  } catch (error) {
    console.error('[Firebase] Failed to get auth:', error);
    throw error;
  }
}

export function getFirebaseDb() {
  try {
    return initializeFirestore(getInitializedApp(), {
      experimentalForceLongPolling: true,
    });
  } catch (error) {
    console.error('[Firebase] Failed to get Firestore:', error);
    throw error;
  }
}

export function getFirebaseRealtimeDb() {
  if (!firebaseConfig.databaseURL) {
    throw new Error(
      "Firebase databaseURL is not configured.\n" +
      "Set NEXT_PUBLIC_FIREBASE_DATABASE_URL environment variable."
    );
  }
  try {
    return getDatabase(getInitializedApp());
  } catch (error) {
    console.error('[Firebase] Failed to get Realtime Database:', error);
    throw error;
  }
}

export function getFirebaseStorage() {
  try {
    return getStorage(getInitializedApp());
  } catch (error) {
    console.error('[Firebase] Failed to get Storage:', error);
    throw error;
  }
}

// ============================================================================
// Legacy Exports (Backward Compatibility)
// ============================================================================

export const isFirebaseReady = isConfigValid;

// These will throw if Firebase is not configured
export const auth = isFirebaseReady ? getAuth(getInitializedApp()) : null as unknown as ReturnType<typeof getAuth>;
export const db = isFirebaseReady ? initializeFirestore(getInitializedApp(), {
  experimentalForceLongPolling: true,
}) : null as unknown as ReturnType<typeof initializeFirestore>;
export const realtimeDb = isFirebaseReady && firebaseConfig.databaseURL ? getDatabase(getInitializedApp()) : null as unknown as ReturnType<typeof getDatabase>;
export const storage = isFirebaseReady ? getStorage(getInitializedApp()) : null as unknown as ReturnType<typeof getStorage>;

// ============================================================================
// Firestore Persistence
// ============================================================================

if (typeof window !== 'undefined' && isConfigValid) {
  try {
    const dbInstance = getFirebaseDb();
    enableMultiTabIndexedDbPersistence(dbInstance).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('[Firebase] Multi-tab persistence failed, trying single-tab');
        enableIndexedDbPersistence(dbInstance).catch(() => { });
      }
    });
  } catch (error) {
    console.warn("[Firebase] Failed to enable Firestore persistence:", error);
  }
}

// ============================================================================
// Analytics
// ============================================================================

const analyticsEnabled = typeof window !== 'undefined' && isConfigValid && !!firebaseConfig.measurementId;

export const analytics = analyticsEnabled
  ? isSupported().then(yes => yes ? getAnalytics(getInitializedApp()) : null)
  : Promise.resolve(null);

// ============================================================================
// Diagnostic Export
// ============================================================================

export function getFirebaseDiagnosticInfo() {
  return {
    isConfigured: isConfigValid,
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    hasApiKey: !!firebaseConfig.apiKey,
    hasAppId: !!firebaseConfig.appId,
    hasStorage: !!firebaseConfig.storageBucket,
    hasDatabase: !!firebaseConfig.databaseURL,
    hasAnalytics: !!firebaseConfig.measurementId,
  };
}
