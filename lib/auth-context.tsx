'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { HydrationFix } from '@/components/HydrationFix';

export interface UserData {
    xp: number;
    mastery: number;
    streak: number;
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
    country?: string;
    form?: number;
    formLevel?: number;
    examTrack?: string;
    subjects?: string[];
    learningGoal?: string;
    intent?: string;
    onboardingCompleted?: boolean;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    userData: UserData | null; // Firestore user document
    logout: () => Promise<void>;
    refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeSnapshot: (() => void) | undefined;

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                // Real-time listener for user document
                const userRef = doc(db, 'users', currentUser.uid);

                unsubscribeSnapshot = onSnapshot(userRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.data() as UserData;

                        // STREAK & INITIALIZATION LOGIC
                        const now = new Date();
                        const lastActive = data.lastActive ? new Date(data.lastActive) : new Date(0);
                        const diffHours = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);

                        // If lastActive is more than 1 hour ago, update lastActive timestamp
                        if (diffHours > 1) {
                            updateDoc(userRef, { lastActive: now.toISOString() }).catch(console.error);
                        }

                        // Robust name resolution
                        const resolvedFirstName = data.firstName || data.fullName?.split(' ')[0] || currentUser.displayName?.split(' ')[0] || currentUser.email?.split('@')[0] || 'Student';
                        const resolvedDisplayName = data.fullName || data.username || currentUser.displayName || currentUser.email?.split('@')[0] || 'User';

                        setUserData({
                            ...data,
                            firstName: resolvedFirstName,
                            displayName: resolvedDisplayName
                        });
                    } else {
                        // Initialize new user document with default schema
                        const defaultData = {
                            xp: 0,
                            mastery: 0.1,
                            streak: 0,
                            questionsCorrect: 0,
                            questionsWrong: 0,
                            bCoins: 0,
                            dailyGoal: 500,
                            lastActive: new Date().toISOString(),
                            subjectProgress: {
                                "Principles of Business": 0,
                                "Mathematics": 0,
                                "English A": 0
                            },
                            hasBusiness: false,
                            firstName: currentUser.displayName?.split(' ')[0] || currentUser.email?.split('@')[0] || 'Student',
                            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
                            fullName: currentUser.displayName || currentUser.email?.split('@')[0] || 'New Student',
                            username: currentUser.email?.split('@')[0] || 'user_' + Math.floor(Math.random() * 1000)
                        };
                        setDoc(userRef, defaultData).catch(console.error);
                        setUserData(defaultData as UserData);
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
