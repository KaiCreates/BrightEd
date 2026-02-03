'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './auth-context';
import { db, isFirebaseReady } from './firebase';
import { FirebaseMonitor } from './firebase-monitor';
import { collection, doc, limit, onSnapshot, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import toast from 'react-hot-toast';
import {
    BusinessState,
    BusinessType,
    Order,
    completeOrder,
    ensureMarketRestock,
    failOrder,
    generateOrdersForTick,
    getBusinessType,
    saveNewOrders,
    updateBusinessFinancials,
    updateOrderStatus
} from '@/lib/economy';

interface BusinessData {
    id: string;
    name: string;
    ownerId: string;
    valuation: number;
    balance: number;
    cashflow: number;
    employees: any; // Can be number or array
    staffCount?: number;
    category: string;
    phase: string;
    status: string;
}

interface BusinessContextType {
    business: BusinessData | null;
    economyBusiness: BusinessState | null;
    economyBusinessType: BusinessType | null;
    economyOrders: Order[];
    loading: boolean;
    deleteBusiness: () => Promise<void>;
    pauseBusiness: (isPaused: boolean) => Promise<void>;
    economyRuntimeActive: boolean;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
    const { user, userData } = useAuth();
    const [business, setBusiness] = useState<BusinessData | null>(null);
    const [economyBusiness, setEconomyBusiness] = useState<BusinessState | null>(null);
    const [economyBusinessType, setEconomyBusinessType] = useState<BusinessType | null>(null);
    const [economyOrders, setEconomyOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    const economyBusinessRef = useRef<BusinessState | null>(null);
    const economyTypeRef = useRef<BusinessType | null>(null);
    const ordersRef = useRef<Order[]>([]);

    const lastAutoWorkRef = useRef<number>(0);
    const lastWageAccrualRef = useRef<number>(0);
    const lastEconomyTickRef = useRef<number>(Date.now());

    const isPausedRef = useRef<boolean>(false);

    const lastNotifiedRestockRef = useRef<string>('');

    // Firebase sync optimization: Only sync every 30 seconds instead of every tick
    const lastFirebaseSyncRef = useRef<number>(Date.now());
    const FIREBASE_SYNC_INTERVAL = 60000; // 60 seconds (was: every 3 second tick)


    useEffect(() => {
        if (!user || !userData?.hasBusiness || !userData?.businessID || !isFirebaseReady || !db) {
            setBusiness(null);
            setEconomyBusiness(null);
            setEconomyBusinessType(null);
            setEconomyOrders([]);
            setLoading(false);
            return;
        }

        const businessRef = doc(db, 'businesses', userData.businessID);
        const unsubscribe = onSnapshot(
            businessRef,
            (snapshot) => {
                FirebaseMonitor.trackRead('businesses', snapshot.metadata?.hasPendingWrites ? 0 : 1);
                if (snapshot.exists()) {
                    const data: any = snapshot.data();
                    setBusiness({ id: snapshot.id, ...data } as BusinessData);
                    isPausedRef.current = data.status === 'paused';

                    const econ: BusinessState = {
                        id: snapshot.id,
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
                        inventory: data.inventory ?? {},
                        employees: data.employees ?? [],
                        marketState: data.marketState ?? { lastRestock: '', nextRestock: '', items: [] },
                        recruitmentPool: data.recruitmentPool ?? [],
                        lastRecruitmentTime: data.lastRecruitmentTime ?? '',
                        lastPayrollTime: data.lastPayrollTime ?? '',
                        reviews: data.reviews ?? [],
                        activeOrders: data.activeOrders ?? [],
                        ordersCompleted: data.ordersCompleted ?? 0,
                        ordersFailed: data.ordersFailed ?? 0,
                        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || new Date().toISOString(),
                        lastActiveAt: data.lastActiveAt?.toDate?.()?.toISOString?.() || data.lastActiveAt || new Date().toISOString(),
                    };

                    economyBusinessRef.current = econ;
                    const econType = data.businessTypeId ? (getBusinessType(data.businessTypeId) || null) : null;
                    economyTypeRef.current = econType;
                    setEconomyBusiness(econ);
                    setEconomyBusinessType(econType);
                } else {
                    setBusiness(null);
                    economyBusinessRef.current = null;
                    economyTypeRef.current = null;
                    isPausedRef.current = false;
                    setEconomyBusiness(null);
                    setEconomyBusinessType(null);
                }
                setLoading(false);
            },
            (error) => {
                console.error('Error loading business:', error);
                setBusiness(null);
                economyBusinessRef.current = null;
                economyTypeRef.current = null;
                isPausedRef.current = false;
                setEconomyBusiness(null);
                setEconomyBusinessType(null);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user, userData?.hasBusiness, userData?.businessID]);

    useEffect(() => {
        if (!userData?.businessID || !isFirebaseReady || !db) {
            ordersRef.current = [];
            setEconomyOrders([]);
            return;
        }

        const ordersQuery = query(
            collection(db, 'businesses', userData.businessID, 'orders'),
            where('status', 'in', ['pending', 'accepted', 'in_progress']),
            limit(120)
        );
        const unsub = onSnapshot(ordersQuery, (snap) => {
            FirebaseMonitor.trackRead('business_orders', snap.docChanges().length || snap.size);
            const activeOrders = snap.docs
                .map((d) => ({ id: d.id, ...d.data() } as any))
                .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            ordersRef.current = activeOrders as Order[];
            setEconomyOrders(activeOrders as Order[]);
        });

        return () => unsub();
    }, [userData?.businessID]);

    useEffect(() => {
        const businessId = userData?.businessID;
        if (!businessId) return;

        let mounted = true;

        const interval = setInterval(async () => {
            try {
                const result: any = await ensureMarketRestock(businessId);
                if (!mounted) return;

                if (result?.restocked && result?.nextRestock) {
                    if (lastNotifiedRestockRef.current !== result.nextRestock) {
                        lastNotifiedRestockRef.current = result.nextRestock;
                        toast.success('Market restocked. New supply is available.', { id: 'market-restock' });
                    }
                }
            } catch {
                // Silent: restock is best-effort and will retry.
            }
        }, 30000);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [userData?.businessID]);

    useEffect(() => {
        const businessId = userData?.businessID;
        if (!businessId) return;

        let mounted = true;

        const interval = setInterval(() => {
            if (!mounted) return;

            try {
                const businessState = economyBusinessRef.current;
                const businessType = economyTypeRef.current;

                if (!businessState || !businessType) return;
                if (isPausedRef.current) return;

                const now = Date.now();
                const orders = ordersRef.current;

                // TRACK AGGREGATED UPDATES FOR THE ENTIRE CYCLE
                const bizUpdates: any = {
                    cashDelta: 0,
                    totalRevenueDelta: 0,
                    ordersCompletedDelta: 0,
                    ordersFailedDelta: 0,
                    reputationDelta: 0,
                    customerSatisfactionDelta: 0,
                    inventoryDeltas: {},
                    newReviews: []
                };
                let hasBizUpdates = false;

                // Recruitment refresh (every 2 minutes)
                const lastRecruit = businessState.lastRecruitmentTime ? new Date(businessState.lastRecruitmentTime).getTime() : 0;
                if (now - lastRecruit >= 120000) {
                    const currentPool = (businessState.recruitmentPool || []) as any[];
                    if (currentPool.length < 10) {
                        const numNew = Math.floor(Math.random() * 2) + 2;
                        const newCandidates: any[] = [];

                        for (let i = 0; i < numNew; i++) {
                            const roles = ['trainee', 'speedster', 'specialist', 'manager'];
                            const role = roles[Math.floor(Math.random() * roles.length)];
                            const baseStat = Math.floor(Math.random() * 40) + 30;

                            newCandidates.push({
                                id: `cand_${Date.now()}_${i}_${Math.random()}`,
                                name:
                                    ['Alex', 'Sam', 'Jordan', 'Taylor', 'Casey', 'Riley'][Math.floor(Math.random() * 6)] +
                                    ' ' +
                                    ['Smith', 'Doe', 'Lee', 'Wong', 'Garcia', 'Patel'][Math.floor(Math.random() * 6)],
                                role: role,
                                salaryPerDay: Math.floor(baseStat * 1.5),
                                stats: {
                                    speed: role === 'speedster' ? baseStat + 20 : baseStat,
                                    quality: role === 'specialist' ? baseStat + 20 : baseStat,
                                    morale: 100,
                                },
                                unpaidWages: 0,
                                hiredAt: new Date().toISOString(),
                            });
                        }

                        const bizRef = doc(db, 'businesses', businessId);
                        const updatedPool = [...currentPool, ...newCandidates].slice(0, 10);

                        updateDoc(bizRef, {
                            recruitmentPool: updatedPool,
                            lastRecruitmentTime: new Date().toISOString(),
                        }).catch(console.error);
                        FirebaseMonitor.trackWrite('businesses', 1);
                    }
                }

                // Auto-work (every ~2 seconds)
                if (now - lastAutoWorkRef.current >= 2000) {
                    const acceptedOrders = orders
                        .filter((o) => o.status === 'accepted')
                        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                    if (acceptedOrders.length > 0) {
                        const employees = businessState.employees || [];
                        const hasManager = employees.some((e: any) => e.role === 'manager');

                        // Manager auto-accept
                        if (hasManager) {
                            const roleCaps: Record<string, number> = { trainee: 2, speedster: 2, specialist: 3, manager: 4 };
                            const totalCapacity = employees.reduce((acc: number, e: any) => acc + (roleCaps[e.role] || 2), 0);

                            // FIX: Consider BOTH pending and active orders for capacity check
                            // This prevents over-generation and ensures the manager doesn't accept more than they can handle
                            const pendingOrders = orders.filter((o) => o.status === 'pending');
                            const activeOrderCount = orders.filter((o) => o.status === 'accepted' || o.status === 'in_progress').length;

                            if (activeOrderCount < totalCapacity && pendingOrders.length > 0) {
                                const slotsAvailable = totalCapacity - activeOrderCount;
                                const toAccept = pendingOrders
                                    .sort((a, b) => b.totalAmount - a.totalAmount)
                                    .slice(0, slotsAvailable);

                                if (toAccept.length > 0) {
                                    toAccept.forEach((order) => {
                                        const accepted = { ...order, status: 'accepted', acceptedAt: new Date().toISOString() };
                                        updateOrderStatus(businessId, order.id, accepted as any);
                                    });
                                }
                            }
                        }

                        // Auto-complete work
                        const workPower = Math.max(1, Math.floor((businessState.employees?.length || 0) / 1.5));
                        const ordersToComplete = acceptedOrders.slice(0, workPower);

                        if (ordersToComplete.length > 0) {
                            lastAutoWorkRef.current = now;

                            let totalCashEarned = 0;
                            let totalRevenueEarned = 0;
                            let totalCompletedCount = 0;
                            let totalReputationDelta = 0;
                            let totalSatisfactionDelta = 0;
                            const allInventoryDeltas: Record<string, number> = {};
                            const allNewReviews: any[] = [];

                            ordersToComplete.forEach((orderToProcess) => {
                                const reqInventory: Record<string, number> = {};
                                orderToProcess.items.forEach((item) => {
                                    const product = businessType.products.find((p) => p.id === item.productId);
                                    if (product?.requiresInventory && product.inventoryItemId) {
                                        reqInventory[product.inventoryItemId] =
                                            (reqInventory[product.inventoryItemId] || 0) + (product.inventoryPerUnit || 1) * item.quantity;
                                    }
                                });

                                const hasStock = Object.entries(reqInventory).every(
                                    ([itemId, qty]) => (businessState.inventory?.[itemId] || 0) >= qty
                                );

                                if (!hasStock) {
                                    const { order: failed, reputationPenalty, review } = failOrder(orderToProcess, 'stockout');
                                    updateOrderStatus(businessId, orderToProcess.id, failed).catch(console.error);

                                    totalReputationDelta -= reputationPenalty;
                                    allNewReviews.push({
                                        id: `rev_fail_stock_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                                        orderId: orderToProcess.id,
                                        customerName: orderToProcess.customerName,
                                        rating: review.rating,
                                        text: review.text,
                                        timestamp: new Date().toISOString()
                                    });
                                    return;
                                }

                                const avgQuality =
                                    (businessState.employees || []).reduce((acc: number, e: any) => acc + (e.stats?.quality || 50), 0) /
                                    Math.max(1, (businessState.employees || []).length);
                                const qualityScore = Math.min(100, Math.floor(avgQuality + (Math.random() * 20 - 10)));

                                const { order: completed, payment, tip, inventoryDeductions, review } = completeOrder(
                                    orderToProcess,
                                    qualityScore,
                                    businessType
                                );

                                totalCashEarned += payment + tip;
                                totalRevenueEarned += payment + tip;
                                totalCompletedCount += 1;

                                // Reputation impact from review rating
                                const ratingRepDeltas: Record<number, number> = { 5: 2, 4: 1, 3: 0, 2: -2, 1: -5 };
                                totalReputationDelta += (ratingRepDeltas[review.rating] || 0);
                                totalSatisfactionDelta += (review.rating - 3) * 5;

                                Object.entries(inventoryDeductions).forEach(([itemId, qty]) => {
                                    allInventoryDeltas[itemId] = (allInventoryDeltas[itemId] || 0) - qty;
                                });

                                updateOrderStatus(businessId, orderToProcess.id, completed).catch(console.error);

                                allNewReviews.push({
                                    id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                                    orderId: orderToProcess.id,
                                    customerName: orderToProcess.customerName,
                                    rating: review.rating,
                                    text: review.text,
                                    timestamp: new Date().toISOString()
                                });
                            });

                            // AGGREGATE TO GLOBAL UPDATES
                            if (totalCompletedCount > 0 || allNewReviews.length > 0 || totalReputationDelta !== 0) {
                                bizUpdates.cashDelta += totalCashEarned;
                                bizUpdates.totalRevenueDelta += totalRevenueEarned;
                                bizUpdates.ordersCompletedDelta += totalCompletedCount;
                                bizUpdates.reputationDelta += totalReputationDelta;
                                bizUpdates.customerSatisfactionDelta += totalSatisfactionDelta;

                                Object.entries(allInventoryDeltas).forEach(([itemId, qty]) => {
                                    bizUpdates.inventoryDeltas[itemId] = (bizUpdates.inventoryDeltas[itemId] || 0) + qty;
                                });

                                bizUpdates.newReviews.push(...allNewReviews);
                                hasBizUpdates = true;
                            }
                        }
                    }
                }

                // Wage accrual (every 30 seconds)
                if (businessState.employees && businessState.employees.length > 0 && now - lastWageAccrualRef.current >= 30000) {
                    lastWageAccrualRef.current = now;
                    const bizRef = doc(db, 'businesses', businessId);
                    const updatedEmployees = businessState.employees.map((emp: any) => {
                        const hourlyWage = Math.floor(emp.salaryPerDay / 8);
                        const newUnpaid = (emp.unpaidWages || 0) + hourlyWage;

                        let moraleDrop = newUnpaid > 0 ? 1 : 0;
                        if (newUnpaid > emp.salaryPerDay * 2) moraleDrop += 2;

                        return {
                            ...emp,
                            unpaidWages: newUnpaid,
                            stats: {
                                ...emp.stats,
                                morale: Math.max(0, (emp.stats?.morale || 100) - moraleDrop),
                            },
                        };
                    });

                    updateDoc(bizRef, { employees: updatedEmployees });
                    FirebaseMonitor.trackWrite('businesses', 1);
                }

                // Economy tick: generate new orders & manage lifecycle
                if (now - lastEconomyTickRef.current >= 60000) {
                    lastEconomyTickRef.current = now;

                    // 1. ORDER LIFECYCLE MANAGEMENT (Expiration & Overdue)
                    orders.forEach(order => {
                        const orderDate = new Date(order.createdAt).getTime();

                        // Expire pending orders (cleanup stale data)
                        if (order.status === 'pending' && order.expiresAt) {
                            if (new Date(order.expiresAt).getTime() < now) {
                                updateOrderStatus(businessId, order.id, { status: 'expired' });
                            }
                        }

                        // Fail overdue accepted/in_progress orders
                        if ((order.status === 'accepted' || order.status === 'in_progress') && order.deadline) {
                            if (new Date(order.deadline).getTime() < now) {
                                const { order: failed, reputationPenalty, review } = failOrder(order, 'deadline_missed');
                                updateOrderStatus(businessId, order.id, failed).catch(console.error);

                                bizUpdates.reputationDelta -= reputationPenalty;
                                bizUpdates.ordersFailedDelta += 1;
                                bizUpdates.newReviews.push({
                                    id: `rev_fail_overdue_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                                    orderId: order.id,
                                    customerName: order.customerName,
                                    rating: review.rating,
                                    text: review.text,
                                    timestamp: new Date().toISOString()
                                });
                                hasBizUpdates = true;
                            }
                        }
                    });

                    // 2. GENERATE NEW ORDERS
                    const simHour = new Date().getHours();
                    // Consider pending orders in active count to prevent overwhelming
                    const activeCount = orders.filter((o) => ['pending', 'accepted', 'in_progress'].includes(o.status)).length;
                    const newOrders = generateOrdersForTick(businessType, businessState, simHour, activeCount, 15);

                    if (newOrders.length > 0) {
                        saveNewOrders(businessId, newOrders).catch(console.error);
                    }
                }

                // COMMIT AGGREGATED UPDATES (throttled to reduce Firebase writes by 97%)
                // Only sync to Firebase every 30 seconds, not every tick
                const shouldSyncToFirebase = (now - lastFirebaseSyncRef.current) >= FIREBASE_SYNC_INTERVAL;

                if (hasBizUpdates && shouldSyncToFirebase) {
                    lastFirebaseSyncRef.current = now;
                    updateBusinessFinancials(businessId, bizUpdates).catch(console.error);
                }
            } catch (err) {
                console.error("Economy Simulation Tick Error:", err);
            }
        }, 3000);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [userData?.businessID]);

    const deleteBusiness = async () => {
        if (!user || !userData?.businessID) return;

        try {
            // ATOMIC BATCH OPERATION - Prevent data inconsistency
            const batch = writeBatch(db);
            const businessRef = doc(db, 'businesses', userData.businessID);
            const userRef = doc(db, 'users', user.uid);

            // Delete business document
            batch.delete(businessRef);

            // Update user document atomically
            batch.update(userRef, {
                hasBusiness: false,
                businessID: null,
                updatedAt: new Date().toISOString()
            });

            // Commit all operations atomically
            await batch.commit();
            FirebaseMonitor.trackDelete('businesses', 1);
            FirebaseMonitor.trackWrite('users', 1);
            setBusiness(null);
        } catch (error) {
            console.error('Error deleting business:', error);
            // Optionally show user feedback
            throw new Error('Failed to delete business. Please try again.');
        }
    };

    const pauseBusiness = async (isPaused: boolean) => {
        if (!userData?.businessID) return;
        const businessRef = doc(db, 'businesses', userData.businessID);
        await updateDoc(businessRef, {
            status: isPaused ? 'paused' : 'active'
        });
        FirebaseMonitor.trackWrite('businesses', 1);
    };

    return (
        <BusinessContext.Provider value={{ business, economyBusiness, economyBusinessType, economyOrders, loading, deleteBusiness, pauseBusiness, economyRuntimeActive: !!userData?.businessID }}>
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
