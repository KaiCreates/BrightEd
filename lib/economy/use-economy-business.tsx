'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { BusinessState, BusinessType, getBusinessType } from '@/lib/economy';

export function useEconomyBusiness() {
  const { user, userData, loading: authLoading } = useAuth();
  const [business, setBusiness] = useState<BusinessState | null>(null);
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user || !userData?.businessID) {
      setBusiness(null);
      setBusinessType(null);
      setLoading(false);
      return;
    }

    const bizRef = doc(db, 'businesses', userData.businessID);

    const unsub = onSnapshot(
      bizRef,
      (snap) => {
        if (!snap.exists()) {
          setBusiness(null);
          setBusinessType(null);
          setLoading(false);
          return;
        }

        const data: any = snap.data();

        const bizState: BusinessState = {
          id: snap.id,
          playerId: data.ownerId,
          businessTypeId: data.businessTypeId,
          businessName: data.name,
          branding: data.branding ?? {},
          cashBalance: data.balance !== undefined ? data.balance : (data.cashBalance ?? 0),
          totalRevenue: data.totalRevenue ?? 0,
          totalExpenses: data.totalExpenses ?? 0,
          reputation: data.reputation ?? 50,
          customerSatisfaction: data.customerSatisfaction ?? 70,
          reviewCount: data.reviewCount ?? 0,
          operatingHours: data.operatingHours ?? { open: 8, close: 20 },
          staffCount: data.staffCount ?? 1,
          maxConcurrentOrders: data.maxConcurrentOrders ?? 3,
          employees: data.employees ?? [],
          inventory: data.inventory ?? {},
          marketState: data.marketState ?? { lastRestock: '', nextRestock: '', items: [] },
          recruitmentPool: data.recruitmentPool ?? [],
          lastRecruitmentTime: data.lastRecruitmentTime ?? '',
          lastPayrollTime: data.lastPayrollTime ?? '',
          reviews: data.reviews ?? [],
          activeOrders: data.activeOrders ?? [],
          ordersCompleted: data.ordersCompleted ?? 0,
          ordersFailed: data.ordersFailed ?? 0,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          lastActiveAt: data.lastActiveAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        };

        setBusiness(bizState);
        setBusinessType(data.businessTypeId ? (getBusinessType(data.businessTypeId) || null) : null);
        setLoading(false);
      },
      () => {
        setBusiness(null);
        setBusinessType(null);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [authLoading, user, userData?.businessID]);

  return { business, businessType, loading };
}
