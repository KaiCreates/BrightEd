'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirebaseAuth, getFirebaseDb } from './firebase';
import { doc, getDoc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { HydrationFix } from '@/components/HydrationFix';

export interface UserData {
    xp: number;
    mastery: number | Record<string, number>;
    globalMastery?: number;
    streak: number;
    lastUsernameChange?: number;
    lastStreakDay?: string;
    lastLearningDay?: string;
    lastLearningAt?: string | number | null;
    activeDays30?: string[];
    consistency?: number;
    questionsCorrect: number;
    questionsWrong: number;
    bCoins: number;
    dailyGoal: number;
    lastActive: string;
    xp_today?: number;
    subjectProgress: Record<string, number>;
    hasBusiness: boolean;
    businessID?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    username?: string;
    displayName?: string;
    bio?: string;
    school?: string;
    schoolId?: string;
    schoolLocked?: boolean;
    country?: string;
    form?: number;
    formLevel?: number;
    examTrack?: string;
    subjects?: string[];
    learningGoal?: string;
    intent?: string;
    onboardingCompleted?: boolean;
    diagnosticCompleted?: boolean;
    diagnosticCompletedAt?: string;
    diagnosticStats?: Record<string, unknown>;
    diagnosticStatsArr?: unknown[]; // Keep some flexibility if needed for legacy
    createdAt?: string;
    updatedAt?: string;
    skills?: {
        finance: number;
        logic: number;
        math: number;
    };

    avatarUrl?: string;
    avatarProvider?: 'cloudinary' | 'firebase';
    avatarPath?: string;
    avatarPublicId?: string;
    avatarMeta?: {
        width?: number;
        height?: number;
        bytes?: number;
        format?: string;
        contentType?: string;
    };
    avatarUpdatedAt?: string;
    following?: string[];
    followers?: string[];
    source?: string;
    proficiencies?: Record<string, string>;
    avatarCustomization?: {
        presetId?: string;
        backgroundColor?: string;
        top?: string;
        hairColor?: string;
        eyes?: string;
        mouth?: string;
        clothing?: string;
        clothingColor?: string;
        accessories?: string;
        facialHair?: string;
        skinColor?: string;
    };
    blockedUsers?: string[];
    mutedUsers?: string[];

    // Password Security
    passwordHistory?: {
        hash: string;
        salt: string;
        changedAt: string;
        expiresAt: string;
    }[];
    passwordLastChanged?: string;
    passwordResetCount?: number;

    // Session Management
    activeSessions?: {
        sessionId: string;
        deviceInfo: {
            browser: string;
            os: string;
            device: string;
            isMobile: boolean;
        };
        lastActive: string;
        createdAt: string;
        ipAddress?: string;
    }[];
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    userData: UserData | null; // Firestore user document
    logout: () => Promise<void>;
    refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper for consistent name resolution
export function resolveUserNames(user: User, firestoreData?: Partial<UserData>): { firstName: string; lastName: string; fullName: string; displayName: string } {
    const firstName = firestoreData?.firstName ||
        user.displayName?.split(' ')[0] ||
        user.email?.split('@')[0] ||
        'Student';

    const lastName = firestoreData?.lastName ||
        (user.displayName && user.displayName.split(' ').length > 1
            ? user.displayName.split(' ').slice(1).join(' ')
            : '');

    const fullName = firestoreData?.fullName ||
        user.displayName ||
        `${firstName}${lastName ? ` ${lastName}` : ''}`.trim();

    // specific display name preference: manual display name > username > full name > email
    const displayName = firestoreData?.displayName ||
        firestoreData?.username ||
        user.displayName ||
        user.email?.split('@')[0] ||
        'User';

    return { firstName, lastName, fullName, displayName };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let auth;
        try {
            auth = getFirebaseAuth();
        } catch (error: any) {
            console.error("CRITICAL: AuthProvider failed to initialize Firebase Auth.", error.message);
            // In development, show a clear warning that auth will fail
            if (process.env.NODE_ENV === 'development') {
                console.warn("DEVELOPER TIP: Check your .env.local file for NEXT_PUBLIC_FIREBASE_* variables.");
            }
            setLoading(false);
            return;
        }

        let unsubscribeSnapshot: (() => void) | undefined;

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
                unsubscribeSnapshot = undefined;
            }

            setLoading(true);
            setUser(currentUser);

            if (currentUser) {
                const db = getFirebaseDb();
                const userRef = doc(db, 'users', currentUser.uid);

                unsubscribeSnapshot = onSnapshot(userRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.data() as UserData;

                        // STREAK & ACTIVE LOGIC
                        const now = new Date();
                        const lastActive = data.lastActive ? new Date(data.lastActive) : new Date(0);
                        const isNewDay = now.getDate() !== lastActive.getDate() ||
                            now.getMonth() !== lastActive.getMonth() ||
                            now.getFullYear() !== lastActive.getFullYear();

                        // Update lastActive if > 1 hour or if it's a new day (to trigger resets)
                        if ((now.getTime() - lastActive.getTime()) > 3600000 || isNewDay) {
                            const updates: Partial<UserData> = { lastActive: now.toISOString() };

                            // Reset daily XP if it's a new day
                            if (isNewDay) {
                                updates.xp_today = 0;
                                data.xp_today = 0; // Optimistic update
                            }

                            updateDoc(userRef, updates).catch(console.error);
                        }

                        // Robust name resolution
                        const names = resolveUserNames(currentUser, data);

                        setUserData({
                            ...data,
                            ...names
                        });
                    } else {
                        // Initialize new user document
                        const names = resolveUserNames(currentUser);
                        const defaultData: UserData = {
                            xp: 0,
                            mastery: 0.1,
                            streak: 0,
                            questionsCorrect: 0,
                            questionsWrong: 0,
                            bCoins: 0,
                            dailyGoal: 500,
                            lastActive: new Date().toISOString(),
                            subjectProgress: {},
                            subjects: [],
                            hasBusiness: false,
                            ...names,
                            username: currentUser.email?.split('@')[0] || 'user_' + Math.floor(Math.random() * 1000),
                            onboardingCompleted: false,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            activeDays30: [],
                            learningGoal: 'Improve understanding',
                            intent: 'learner',
                            skills: { finance: 1, logic: 1, math: 1 },
                            form: 1,
                            following: [],
                            followers: [],
                            avatarCustomization: {
                                top: 'shortFlat',
                                hairColor: '2c1b18',
                                eyes: 'default',
                                mouth: 'smile',
                                clothing: 'blazerAndShirt',
                                clothingColor: '262e33',
                                accessories: 'blank',
                                facialHair: 'blank',
                                skinColor: 'ffdbb4',
                                backgroundColor: 'FF8A8A'
                            }
                        };
                        setDoc(userRef, defaultData).catch(console.error);
                        setUserData(defaultData);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Firestore listener error:", error);
                    setLoading(false);
                });
            } else {
                setUserData(null);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeSnapshot) unsubscribeSnapshot();
        };
    }, []);

    const logout = async () => {
        try {
            const auth = getFirebaseAuth();
            await firebaseSignOut(auth);
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            // Always clear local state even if network request fails
            setUserData(null);
            setUser(null);
        }
    };

    const refreshUserData = async () => {
        if (!user) return;

        try {
            const db = getFirebaseDb();
            const userRef = doc(db, 'users', user.uid);
            const snapshot = await getDoc(userRef);

            if (snapshot.exists()) {
                const data = snapshot.data() as UserData;
                const names = resolveUserNames(user, data);
                setUserData({ ...data, ...names });
            }
        } catch (error) {
            console.error("Failed to refresh user data:", error);
        }
    };

    return (
        <HydrationFix>
            <AuthContext.Provider value={{ user, loading, userData, logout, refreshUserData }}>
                {children}
            </AuthContext.Provider>
        </HydrationFix>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
