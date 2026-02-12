import { db } from './firebase';
import { doc, getDoc, updateDoc, setDoc, FirestoreError } from 'firebase/firestore';

export class DataManager {
    /**
     * Save user progress safely to Firestore.
     * logs error but doesn't throw to avoid crashing UI (unless critical).
     */
    static async saveUserProgress(userId: string, progress: Record<string, unknown>): Promise<boolean> {
        try {
            if (!userId || !db) throw new Error('No userId or DB not initialized');
            await updateDoc(doc(db, 'users', userId, 'progress'), progress);
            return true;
        } catch (error) {
            console.error('Failed to save progress:', error);
            // Future: Add offline queue here
            return false;
        }
    }

    /**
     * Load a user document or a specific sub-path.
     */
    static async loadUserDoc(userId: string, subPath?: string): Promise<Record<string, unknown> | null> {
        try {
            if (!userId || !db) return null;
            const path = subPath ? `users/${userId}/${subPath}` : `users/${userId}`;
            const docSnap = await getDoc(doc(db, path));
            return docSnap.exists() ? docSnap.data() : null;
        } catch (error) {
            console.error('Failed to load user doc:', error);
            return null;
        }
    }

    /**
     * Update generic user data fields.
     */
    static async updateUserData(userId: string, data: Record<string, unknown>): Promise<boolean> {
        try {
            if (!userId || !db) return false;
            const ref = doc(db, 'users', userId);
            await updateDoc(ref, {
                ...data,
                updatedAt: new Date().toISOString()
            });
            return true;
        } catch (error) {
            // If document doesn't exist, try setting it
            const code = (error as FirestoreError).code;
            if (code === 'not-found') {
                try {
                    if (!db) return false;
                    await setDoc(doc(db, 'users', userId), {
                        ...data,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                    return true;
                } catch (innerErr) {
                    console.error('Failed to create missing user doc:', innerErr);
                    return false;
                }
            }
            console.error('Failed to update user data:', error);
            return false;
        }
    }
}
