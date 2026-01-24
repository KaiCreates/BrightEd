'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth-context';
import { db } from './firebase';
import { doc, onSnapshot, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

interface BusinessData {
    id: string;
    name: string;
    ownerId: string;
    valuation: number;
    balance: number;
    cashflow: number;
    employees: number;
    category: string;
    phase: string;
    status: string;
}

interface BusinessContextType {
    business: BusinessData | null;
    loading: boolean;
    deleteBusiness: () => Promise<void>;
    pauseBusiness: (isPaused: boolean) => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
    const { user, userData } = useAuth();
    const [business, setBusiness] = useState<BusinessData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !userData?.hasBusiness || !userData?.businessID) {
            setBusiness(null);
            setLoading(false);
            return;
        }

        const businessRef = doc(db, 'businesses', userData.businessID);
        const unsubscribe = onSnapshot(
            businessRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    setBusiness({ id: snapshot.id, ...snapshot.data() } as BusinessData);
                } else {
                    setBusiness(null);
                }
                setLoading(false);
            },
            (error) => {
                console.error('Error loading business:', error);
                setBusiness(null);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user, userData?.hasBusiness, userData?.businessID]);

    const deleteBusiness = async () => {
        if (!user || !userData?.businessID) return;

        const batch = writeBatch(db);
        const businessRef = doc(db, 'businesses', userData.businessID);
        const userRef = doc(db, 'users', user.uid);

        batch.delete(businessRef);
        batch.update(userRef, {
            hasBusiness: false,
            businessID: null
        });

        await batch.commit();
        setBusiness(null);
    };

    const pauseBusiness = async (isPaused: boolean) => {
        if (!userData?.businessID) return;
        const businessRef = doc(db, 'businesses', userData.businessID);
        await updateDoc(businessRef, {
            status: isPaused ? 'paused' : 'active'
        });
    };

    return (
        <BusinessContext.Provider value={{ business, loading, deleteBusiness, pauseBusiness }}>
            {children}
        </BusinessContext.Provider>
    );
}

export function useBusiness() {
    const context = useContext(BusinessContext);
    if (context === undefined) {
        throw new Error('useBusiness must be used within a BusinessProvider');
    }
    return context;
}
