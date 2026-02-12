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
    updateOrderStatus,
    StockMarketState,
    StockPortfolio,
} from '@/lib/economy';
import { getNetWorthSnapshot } from '@/lib/economy/valuation';
import { initStockMarketState, initStockPortfolio, tickStockMarket } from '@/lib/economy/stock-market';

interface BusinessData {
    id: string;
    name: string;
    ownerId: string;
    valuation: number;
    balance: number;
    cashflow: number;
    employees: number | unknown[]; // Can be number or array
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
    const lastStockTickRef = useRef<number>(0);

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
                    const data = snapshot.data();
                    if (!data) return;

                    setBusiness({ id: snapshot.id, ...data } as unknown as BusinessData);
                    isPausedRef.current = data.status === 'paused';

                    /* eslint-disable @typescript-eslint/no-explicit-any */
                    const econ: BusinessState = {
                        id: snapshot.id,
                        playerId: (data.ownerId as string) || '',
                        businessTypeId: (data.businessTypeId as string) || '',
                        businessName: (data.name as string) || '',
                        branding: (data.branding as Record<string, unknown>) ?? {},
                        cashBalance: typeof data.balance === 'number' ? data.balance : (typeof data.cashBalance === 'number' ? data.cashBalance : 0),
                        totalRevenue: (data.totalRevenue as number) ?? 0,
                        totalExpenses: (data.totalExpenses as number) ?? 0,
                        reputation: (data.reputation as number) ?? 50,
                        customerSatisfaction: (data.customerSatisfaction as number) ?? 70,
                        reviewCount: (data.reviewCount as number) ?? 0,
                        operatingHours: (data.operatingHours as { open: number; close: number }) ?? { open: 8, close: 20 },
                        staffCount: (data.staffCount as number) ?? 1,
                        maxConcurrentOrders: (data.maxConcurrentOrders as number) ?? 3,
                        inventory: (data.inventory as Record<string, number>) ?? {},
                        employees: (data.employees as any[]) ?? [],
                        marketState: (data.marketState as any) ?? { lastRestock: '', nextRestock: '', items: [] },
                        ownedTools: (data.ownedTools as string[]) ?? [],
                        stockMarket: (data.stockMarket as any) ?? initStockMarketState(),
                        stockPortfolio: (data.stockPortfolio as any) ?? initStockPortfolio(),
                        netWorth: (data.netWorth as number) ?? (data.valuation as number) ?? 0,
                        valuation: (data.valuation as number) ?? 0,
                        recruitmentPool: (data.recruitmentPool as any[]) ?? [],
                        lastRecruitmentTime: (data.lastRecruitmentTime as string) ?? '',
                        lastPayrollTime: (data.lastPayrollTime as string) ?? '',
                        reviews: (data.reviews as any[]) ?? [],
                        activeOrders: (data.activeOrders as string[]) ?? [],
                        ordersCompleted: (data.ordersCompleted as number) ?? 0,
                        ordersFailed: (data.ordersFailed as number) ?? 0,
                        createdAt: (data.createdAt as any)?.toDate?.()?.toISOString?.() || (data.createdAt as string) || new Date().toISOString(),
                        lastActiveAt: (data.lastActiveAt as any)?.toDate?.()?.toISOString?.() || (data.lastActiveAt as string) || new Date().toISOString(),
                    };
                    /* eslint-enable @typescript-eslint/no-explicit-any */

                    economyBusinessRef.current = econ;
                    const econType = data.businessTypeId ? (getBusinessType(data.businessTypeId as string) || null) : null;
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
                .map((d) => ({ id: d.id, ...d.data() } as unknown as Order))
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
                const result = await ensureMarketRestock(businessId) as { restocked?: boolean; nextRestock?: string };
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

                let workingState = businessState;
                const now = Date.now();
                const orders = ordersRef.current;

                // TRACK AGGREGATED UPDATES FOR THE ENTIRE CYCLE
                const bizUpdates: Record<string, unknown> & {
                    cashDelta: number;
                    totalRevenueDelta: number;
                    ordersCompletedDelta: number;
                    ordersFailedDelta: number;
                    reputationDelta: number;
                    customerSatisfactionDelta: number;
                    inventoryDeltas: Record<string, number>;
                    newReviews: unknown[];
                } = {
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

                // Stock market tick (every 60 seconds)
                if (now - lastStockTickRef.current >= 60000) {
                    const updatedMarket = tickStockMarket(
                        workingState.stockMarket ?? initStockMarketState(),
                        new Date()
                    );
                    lastStockTickRef.current = now;
                    workingState = { ...workingState, stockMarket: updatedMarket };
                    bizUpdates.stockMarket = updatedMarket;
                    hasBizUpdates = true;
                }

                // Recruitment refresh (every 2 minutes)
                const lastRecruit = businessState.lastRecruitmentTime ? new Date(businessState.lastRecruitmentTime).getTime() : 0;
                if (now - lastRecruit >= 120000) {
                    const currentPool = (businessState.recruitmentPool || []) as unknown[];
                    if (currentPool.length < 10) {
                        const numNew = Math.floor(Math.random() * 2) + 2;
                        const newCandidates: unknown[] = [];

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

                        if (!db) return;
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
                        const employees = (businessState.employees || []) as Array<{ role: string; stats?: { quality: number } }>;
                        const hasManager = employees.some((e) => e.role === 'manager');

                        // Manager auto-accept
                        if (hasManager) {
                            const roleCaps: Record<string, number> = { trainee: 2, speedster: 2, specialist: 3, manager: 4 };
                            const totalCapacity = employees.reduce((acc: number, e) => acc + (roleCaps[e.role] || 2), 0);

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
                                        const accepted: Partial<Order> = {
                                            ...order,
                                            status: 'accepted' as const,
                                            acceptedAt: new Date().toISOString()
                                        };
                                        updateOrderStatus(businessId, order.id, accepted);
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
                            const allNewReviews: unknown[] = [];

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
                                    employees.reduce((acc: number, e) => acc + (e.stats?.quality || 50), 0) /
                                    Math.max(1, employees.length);
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
                                    allInventoryDeltas[itemId] = (Number(allInventoryDeltas[itemId]) || 0) - Number(qty);
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
                    if (!db) return;
                    const bizRef = doc(db, 'businesses', businessId);
                    const updatedEmployees = businessState.employees.map((emp: { salaryPerDay: number; unpaidWages?: number; stats?: { morale: number } }) => {
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

                if (shouldSyncToFirebase) {
                    const derivedInventory: Record<string, number> = { ...(workingState.inventory || {}) };
                    Object.entries(bizUpdates.inventoryDeltas || {}).forEach(([itemId, delta]) => {
                        const currentQty = derivedInventory[itemId] || 0;
                        const nextQty = currentQty + (delta as number);
                        if (nextQty > 0) {
                            derivedInventory[itemId] = nextQty;
                        } else {
                            delete derivedInventory[itemId];
                        }
                    });

                    const derivedState: BusinessState = {
                        ...workingState,
                        cashBalance: workingState.cashBalance + (bizUpdates.cashDelta || 0),
                        inventory: derivedInventory,
                        stockMarket: (bizUpdates.stockMarket as unknown) as StockMarketState || workingState.stockMarket,
                        stockPortfolio: (bizUpdates.stockPortfolio as unknown) as StockPortfolio || workingState.stockPortfolio,
                        ownedTools: (bizUpdates.ownedTools as string[]) || workingState.ownedTools,
                    };

                    const netWorthSnapshot = getNetWorthSnapshot(derivedState);
                    if (netWorthSnapshot.netWorth !== workingState.netWorth || netWorthSnapshot.valuation !== workingState.valuation) {
                        bizUpdates.netWorth = netWorthSnapshot.netWorth;
                        bizUpdates.valuation = netWorthSnapshot.valuation;
                        hasBizUpdates = true;
                    }
                }

                if (hasBizUpdates && shouldSyncToFirebase) {
                    lastFirebaseSyncRef.current = now;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    updateBusinessFinancials(businessId, bizUpdates as any).catch(console.error);
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
            if (!db) return;
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
        if (!db || !userData?.businessID) return;
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
