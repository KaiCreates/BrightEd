'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './auth-context';
import { db, isFirebaseReady } from './firebase';
import { collection, doc, onSnapshot, query, updateDoc, writeBatch } from 'firebase/firestore';
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
    loading: boolean;
    deleteBusiness: () => Promise<void>;
    pauseBusiness: (isPaused: boolean) => Promise<void>;
    economyRuntimeActive: boolean;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
    const { user, userData } = useAuth();
    const [business, setBusiness] = useState<BusinessData | null>(null);
    const [loading, setLoading] = useState(true);

    const economyBusinessRef = useRef<BusinessState | null>(null);
    const economyTypeRef = useRef<BusinessType | null>(null);
    const ordersRef = useRef<Order[]>([]);

    const lastAutoWorkRef = useRef<number>(0);
    const lastWageAccrualRef = useRef<number>(0);
    const lastEconomyTickRef = useRef<number>(Date.now());

    const isPausedRef = useRef<boolean>(false);

    const lastNotifiedRestockRef = useRef<string>('');

    useEffect(() => {
        if (!user || !userData?.hasBusiness || !userData?.businessID || !isFirebaseReady || !db) {
            setBusiness(null);
            setLoading(false);
            return;
        }

        const businessRef = doc(db, 'businesses', userData.businessID);
        const unsubscribe = onSnapshot(
            businessRef,
            (snapshot) => {
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
                    economyTypeRef.current = data.businessTypeId ? (getBusinessType(data.businessTypeId) || null) : null;
                } else {
                    setBusiness(null);
                    economyBusinessRef.current = null;
                    economyTypeRef.current = null;
                    isPausedRef.current = false;
                }
                setLoading(false);
            },
            (error) => {
                console.error('Error loading business:', error);
                setBusiness(null);
                economyBusinessRef.current = null;
                economyTypeRef.current = null;
                isPausedRef.current = false;
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user, userData?.hasBusiness, userData?.businessID]);

    useEffect(() => {
        if (!userData?.businessID || !isFirebaseReady || !db) {
            ordersRef.current = [];
            return;
        }

        const ordersQuery = query(collection(db, 'businesses', userData.businessID, 'orders'));
        const unsub = onSnapshot(ordersQuery, (snap) => {
            const activeOrders = snap.docs
                .map((d) => ({ id: d.id, ...d.data() } as any))
                .filter((o: any) => ['pending', 'accepted', 'in_progress'].includes(o.status))
                .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            ordersRef.current = activeOrders as Order[];
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

                            let cashEarned = 0;
                            let revenueEarned = 0;
                            let completedCount = 0;
                            let reputationDelta = 0;
                            const inventoryDeltas: Record<string, number> = {};

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
                                    const { order: failed, reputationPenalty } = failOrder(orderToProcess, 'stockout');
                                    updateOrderStatus(businessId, orderToProcess.id, failed);

                                    updateBusinessFinancials(businessId, {
                                        reputation: Math.max(0, businessState.reputation - reputationPenalty),
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

                                cashEarned += payment + tip;
                                revenueEarned += payment + tip;
                                completedCount += 1;

                                // Reputation impact from review rating
                                // 5 stars = +2, 4 stars = +1, 3 stars = 0, 2 stars = -2, 1 star = -5
                                const ratingRepDeltas: Record<number, number> = { 5: 2, 4: 1, 3: 0, 2: -2, 1: -5 };
                                reputationDelta += (ratingRepDeltas[review.rating] || 0);

                                Object.entries(inventoryDeductions).forEach(([itemId, qty]) => {
                                    inventoryDeltas[itemId] = (inventoryDeltas[itemId] || 0) - qty;
                                });

                                updateOrderStatus(businessId, orderToProcess.id, completed);

                                // Save user review atomically
                                const firestoreReview = {
                                    id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                                    orderId: orderToProcess.id,
                                    customerName: orderToProcess.customerName,
                                    rating: review.rating,
                                    text: review.text,
                                    timestamp: new Date().toISOString()
                                };

                                updateBusinessFinancials(businessId, {
                                    newReview: firestoreReview,
                                    customerSatisfactionDelta: (review.rating - 3) * 5 // Shift satisfaction +/- based on review
                                });
                            });

                            if (completedCount > 0) {
                                updateBusinessFinancials(businessId, {
                                    cashDelta: cashEarned,
                                    totalRevenueDelta: revenueEarned,
                                    ordersCompletedDelta: completedCount,
                                    reputationDelta,
                                    inventoryDeltas,
                                });
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
                                updateOrderStatus(businessId, order.id, failed);

                                // Save negative review
                                updateBusinessFinancials(businessId, {
                                    reputationDelta: -reputationPenalty,
                                    ordersFailedDelta: 1,
                                    newReview: {
                                        id: `rev_fail_${Date.now()}`,
                                        orderId: order.id,
                                        customerName: order.customerName,
                                        rating: review.rating,
                                        text: review.text,
                                        timestamp: new Date().toISOString()
                                    }
                                });
                            }
                        }
                    });

                    // 2. GENERATE NEW ORDERS
                    const simHour = new Date().getHours();
                    // Consider pending orders in active count to prevent overwhelming
                    const activeCount = orders.filter((o) => ['pending', 'accepted', 'in_progress'].includes(o.status)).length;
                    const newOrders = generateOrdersForTick(businessType, businessState, simHour, activeCount, 15);

                    if (newOrders.length > 0) {
                        saveNewOrders(businessId, newOrders);
                    }
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
    };

    return (
        <BusinessContext.Provider value={{ business, loading, deleteBusiness, pauseBusiness, economyRuntimeActive: !!userData?.businessID }}>
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
