'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { HydrationFix } from '@/components/HydrationFix';

export interface UserData {
    xp: number;
    mastery: number | Record<string, number>;
    globalMastery?: number;
    streak: number;
    lastStreakDay?: string;
    lastLearningDay?: string;
    lastLearningAt?: any;
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
    diagnosticStats?: any;
    createdAt?: string;
    updatedAt?: string;
    skills?: {
        finance: number;
        logic: number;
        math: number;
    };
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
export function resolveUserNames(user: User, firestoreData?: Partial<UserData>): { firstName: string, lastName: string, fullName: string, displayName: string } {
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
        if (!auth) {
            console.warn("Firebase Auth not initialized. Skipping auth listener.");
            setLoading(false);
            return;
        }

        let unsubscribeSnapshot: (() => void) | undefined;

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                const userRef = doc(db, 'users', currentUser.uid);

                unsubscribeSnapshot = onSnapshot(userRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.data() as UserData;

                        // STREAK & ACTIVE LOGIC
                        const now = new Date();
                        const lastActive = data.lastActive ? new Date(data.lastActive) : new Date(0);
                        if ((now.getTime() - lastActive.getTime()) > 3600000) { // 1 hour
                            updateDoc(userRef, { lastActive: now.toISOString() }).catch(console.error);
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
                            form: 1
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
        if (!auth) return;
        await firebaseSignOut(auth);
        setUserData(null);
    };

    const refreshUserData = async () => {
        // Handled by onSnapshot
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
