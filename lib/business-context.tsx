'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './auth-context';
import { db } from './firebase';
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
        if (!userData?.businessID) {
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
        }, 5000);

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
                    });
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
                        const activeOrderCount = orders.filter((o) => o.status === 'accepted' || o.status === 'in_progress').length;

                        if (activeOrderCount < totalCapacity) {
                            const pendingOrders = orders
                                .filter((o) => o.status === 'pending')
                                .sort((a, b) => b.totalAmount - a.totalAmount);
                            const slotsAvailable = totalCapacity - activeOrderCount;
                            const toAccept = pendingOrders.slice(0, slotsAvailable);

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

                            const { order: completed, payment, tip, inventoryDeductions } = completeOrder(
                                orderToProcess,
                                qualityScore,
                                businessType
                            );

                            cashEarned += payment + tip;
                            revenueEarned += payment + tip;
                            completedCount += 1;
                            if (qualityScore >= 90) reputationDelta += 1;

                            Object.entries(inventoryDeductions).forEach(([itemId, qty]) => {
                                inventoryDeltas[itemId] = (inventoryDeltas[itemId] || 0) - qty;
                            });

                            updateOrderStatus(businessId, orderToProcess.id, completed);
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

            // Economy tick (every 5 seconds): generate new orders
            if (now - lastEconomyTickRef.current >= 5000) {
                lastEconomyTickRef.current = now;

                const simHour = (() => {
                    const h = new Date().getHours();
                    if (h < 6) return 6;
                    if (h > 22) return 22;
                    return h;
                })();

                const activeCount = orders.filter((o) => o.status === 'accepted' || o.status === 'in_progress').length;
                const newOrders = generateOrdersForTick(businessType, businessState, simHour, activeCount, 15);

                if (newOrders.length > 0) {
                    saveNewOrders(businessId, newOrders);
                }
            }
        }, 1000);

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
