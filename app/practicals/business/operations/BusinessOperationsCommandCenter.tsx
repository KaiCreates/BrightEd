'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { BrightHeading, BrightButton, BrightLayer } from '@/components/system';
import BusinessRegistration from '@/components/business/BusinessRegistration';
import BusinessSectionNav from '@/components/business/BusinessSectionNav';
import {
  CinematicProvider,
  useCinematic,
  DashboardAmbience
} from '@/components/cinematic';
import { OrderDashboard } from '@/components/business/OrderDashboard';
import BusinessCard3D from '@/components/business/BusinessCard3D';
import { useAuth } from '@/lib/auth-context';
import { useBusiness } from '@/lib/business-context';
import { db } from '@/lib/firebase';
import { collection, query, where, doc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import BusinessWorkspace from '@/components/business/BusinessWorkspace';
import OrgChart from '@/components/business/OrgChart';
import PayrollManager from '@/components/business/PayrollManager';
import { BusinessStatsBar } from '@/components/business/BusinessStatsBar';
import InventoryPanel from '@/components/business/InventoryPanel';
import {
  BusinessState,
  Order,
  BusinessType,
  getBusinessType,
  generateOrdersForTick,
  saveNewOrders,
  acceptOrder,
  rejectOrder,
  completeOrder,
  failOrder,
  updateBusinessFinancials,
  updateOrderStatus,
  fetchActiveOrders,
  collectDuePayments
} from '@/lib/economy';

export default function BusinessOperationsCommandCenter() {
  return (
    <CinematicProvider>
      <CommandCenterContent />
    </CinematicProvider>
  );
}

function CommandCenterContent() {
  const { user, userData, loading: authLoading } = useAuth();
  const { economyRuntimeActive } = useBusiness();
  const { showInterrupt } = useCinematic();

  const [business, setBusiness] = useState<BusinessState | null>(null);
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [activeFulfillmentOrder, setActiveFulfillmentOrder] = useState<Order | null>(null);

  const [simHour, setSimHour] = useState(() => {
    const h = new Date().getHours();
    if (h < 6) return 6;
    if (h > 22) return 22;
    return h;
  });
  const lastTickRef = useRef<number>(Date.now());
  const isPausedRef = useRef(false);
  const lastPayrollRunRef = useRef<number>(0);
  const lastAutoWorkRef = useRef<number>(0);
  const lastWageAccrualRef = useRef<number>(0);

  useEffect(() => {
    if (!economyRuntimeActive) return;

    const interval = setInterval(() => {
      const h = new Date().getHours();
      setSimHour(h < 6 ? 6 : h > 22 ? 22 : h);
    }, 60000);

    return () => clearInterval(interval);
  }, [economyRuntimeActive]);

  useEffect(() => {
    if (authLoading || !user) return;

    if (!userData?.businessID) {
      setBusiness(null);
      setLoading(false);
      return;
    }

    const bizRef = doc(db, 'businesses', userData.businessID);

    const unsub = onSnapshot(bizRef, (snap) => {
      if (snap.exists()) {
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
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          lastActiveAt: data.lastActiveAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        };

        setBusiness(bizState);

        if (bizState.lastPayrollTime) {
          const dbTime = new Date(bizState.lastPayrollTime).getTime();
          if (dbTime > lastPayrollRunRef.current) {
            lastPayrollRunRef.current = dbTime;
          }
        }

        if (data.businessTypeId) {
          const type = getBusinessType(data.businessTypeId);
          setBusinessType(type || null);
        }
      } else {
        setBusiness(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [user, userData?.businessID, authLoading]);

  useEffect(() => {
    const businessId = business?.id;
    if (!businessId) return;

    fetchActiveOrders(businessId).then(setOrders);

    const ordersQuery = query(collection(db, 'businesses', businessId, 'orders'));
    const unsub = onSnapshot(ordersQuery, (snap) => {
      const activeOrders = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Order))
        .filter((o) => ['pending', 'accepted', 'in_progress'].includes(o.status))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setOrders(activeOrders);
    });

    return () => unsub();
  }, [business?.id]);

  useEffect(() => {
    if (!business || !businessType) return;
    if (economyRuntimeActive) return;

    const interval = setInterval(() => {
      if (isPausedRef.current) return;

      const now = Date.now();
      const lastRecruit = business.lastRecruitmentTime ? new Date(business.lastRecruitmentTime).getTime() : 0;

      if (now - lastRecruit >= 120000) {
        const currentPool = business.recruitmentPool || [];
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

          const bizRef = doc(db, 'businesses', business.id);
          const updatedPool = [...currentPool, ...newCandidates].slice(0, 10);

          updateDoc(bizRef, {
            recruitmentPool: updatedPool,
            lastRecruitmentTime: new Date().toISOString(),
          });

          if (newCandidates.length > 0) {
            showInterrupt('luka', 'New candidates available in Recruitment!', 'happy');
          }
        }
      }

      if (business.employees && business.employees.length > 0) {
        const hasManager = business.employees.some((e: any) => e.role === 'manager');

        const roleCaps: Record<string, number> = { trainee: 2, speedster: 2, specialist: 3, manager: 4 };
        const totalCapacity = business.employees.reduce((acc: number, e: any) => acc + (roleCaps[e.role] || 2), 0);
        const activeOrderCount = orders.filter((o) => o.status === 'accepted' || o.status === 'in_progress').length;

        if (hasManager && activeOrderCount < totalCapacity) {
          const pendingOrders = orders
            .filter((o) => o.status === 'pending')
            .sort((a, b) => b.totalAmount - a.totalAmount);
          const slotsAvailable = totalCapacity - activeOrderCount;
          const toAccept = pendingOrders.slice(0, slotsAvailable);

          if (toAccept.length > 0) {
            toAccept.forEach((order) => {
              const accepted = { ...order, status: 'accepted', acceptedAt: new Date().toISOString() };
              updateOrderStatus(business.id, order.id, accepted as any);
            });

            if (Math.random() > 0.7) {
              showInterrupt('luka', `Manager accepted ${toAccept.length} orders automatically.`, 'neutral');
            }
          }
        }

        if (now - lastAutoWorkRef.current >= 2000) {
          const acceptedOrders = orders
            .filter((o) => o.status === 'accepted')
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

          if (acceptedOrders.length > 0) {
            const workPower = Math.max(1, Math.floor(business.employees.length / 1.5));
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
                  ([itemId, qty]) => (business.inventory?.[itemId] || 0) >= qty
                );

                if (!hasStock) {
                  const { order: failed, reputationPenalty } = failOrder(orderToProcess, 'stockout');
                  updateOrderStatus(business.id, orderToProcess.id, failed);

                  updateBusinessFinancials(business.id, {
                    reputation: Math.max(0, business.reputation - reputationPenalty),
                  });

                  if (Math.random() > 0.5) {
                    showInterrupt(
                      'keisha',
                      `We're out of stock for ${orderToProcess.customerName}'s order! I had to cancel it.`,
                      'concerned'
                    );
                  }
                  return;
                }

                const avgQuality =
                  business.employees.reduce((acc: number, e: any) => acc + (e.stats?.quality || 50), 0) /
                  business.employees.length;
                const qualityScore = Math.min(100, Math.floor(avgQuality + (Math.random() * 20 - 10)));

                const { order: completed, payment, tip, inventoryDeductions } = completeOrder(
                  orderToProcess,
                  qualityScore,
                  businessType
                );

                const stars = qualityScore >= 95 ? 6 : Math.ceil((qualityScore / 100) * 5);
                const reviewText = stars === 6 ? 'Fast service!' : 'Good auto-service.';
                const newReview = {
                  id: `rev_${Date.now()}_${Math.random()}`,
                  orderId: orderToProcess.id,
                  customerName: orderToProcess.customerName,
                  rating: stars,
                  text: reviewText,
                  timestamp: new Date().toISOString(),
                };

                cashEarned += payment + tip;
                revenueEarned += payment + tip;
                completedCount += 1;
                if (stars >= 5) reputationDelta += 1;

                Object.entries(inventoryDeductions).forEach(([itemId, qty]) => {
                  inventoryDeltas[itemId] = (inventoryDeltas[itemId] || 0) - qty;
                });

                updateOrderStatus(business.id, orderToProcess.id, completed);
              });

              updateBusinessFinancials(business.id, {
                cashDelta: cashEarned,
                totalRevenueDelta: revenueEarned,
                ordersCompletedDelta: completedCount,
                reputationDelta,
                inventoryDeltas,
              });

              if (Math.random() > 0.7) {
                showInterrupt('mendy', `Staff cleared ${ordersToComplete.length} orders. +฿${cashEarned}`, 'neutral');
              }
            }
          }
        }
      }

      if (now - lastTickRef.current >= 5000) {
        lastTickRef.current = now;

        setSimHour((prev) => {
          const next = prev >= 22 ? 6 : prev + 1;
          return next;
        });

        if (business.employees && business.employees.length > 0 && now - lastWageAccrualRef.current >= 30000) {
          lastWageAccrualRef.current = now;
          const bizRef = doc(db, 'businesses', business.id);
          const updatedEmployees = business.employees.map((emp: any) => {
            const hourlyWage = Math.floor(emp.salaryPerDay / 8);
            const newUnpaid = (emp.unpaidWages || 0) + hourlyWage;

            let moraleDrop = newUnpaid > 0 ? 1 : 0;
            if (newUnpaid > emp.salaryPerDay * 2) moraleDrop += 2;

            return {
              ...emp,
              unpaidWages: newUnpaid,
              stats: {
                ...emp.stats,
                morale: Math.max(0, (emp.stats.morale || 100) - moraleDrop),
              },
            };
          });

          updateDoc(bizRef, { employees: updatedEmployees });
        }

        const activeCount = orders.filter((o) => o.status === 'accepted' || o.status === 'in_progress').length;
        const newOrders = generateOrdersForTick(businessType, business, simHour, activeCount, 15);

        if (newOrders.length > 0) {
          saveNewOrders(business.id, newOrders);
          if (Math.random() > 0.7) {
            showInterrupt('luka', `New order from ${newOrders[0].customerName}!`, 'happy');
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [business, businessType, simHour, orders, showInterrupt, economyRuntimeActive]);

  const handleAcceptOrder = async (orderId: string) => {
    if (!business) return;
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    const accepted = acceptOrder(order);
    await updateOrderStatus(business.id, orderId, accepted);

    showInterrupt('luka', 'Order accepted! Watch the deadline.', 'neutral');
  };

  const handleRejectOrder = async (orderId: string) => {
    if (!business) return;
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    const { order: rejected, reputationPenalty } = rejectOrder(order);
    await updateOrderStatus(business.id, orderId, rejected);

    const newRep = Math.max(0, business.reputation - reputationPenalty);
    await updateBusinessFinancials(business.id, { reputation: newRep });

    if (reputationPenalty > 2) {
      showInterrupt('keisha', `${order.customerName} wasn't happy about the rejection.`, 'concerned');
    }
  };

  const handleCompleteOrder = async (orderId: string, customQuality?: number) => {
    if (!business) return;
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    const qualityScore = customQuality ?? Math.floor(60 + Math.random() * 40);
    const { order: completed, payment, tip, inventoryDeductions } = completeOrder(
      order,
      qualityScore,
      businessType ?? undefined
    );

    const currentInv = business.inventory || {};
    const insufficientStock = Object.entries(inventoryDeductions).some(
      ([itemId, qty]) => (currentInv[itemId] || 0) < qty
    );

    if (insufficientStock) {
      showInterrupt('keisha', "Wait! We don't have enough stock to fulfill this order!", 'concerned');
      return;
    }

    const stars = qualityScore >= 95 ? 6 : Math.ceil((qualityScore / 100) * 5);
    const reviewText =
      stars === 6
        ? 'Absolutely legendary service!'
        : stars === 5
          ? 'Great experience, would recommend.'
          : stars === 4
            ? 'Good service.'
            : stars === 3
              ? 'Okay, but could be better.'
              : 'Disappointing.';

    const newReview = {
      id: `rev_${Date.now()}`,
      orderId: orderId,
      customerName: order.customerName,
      rating: stars,
      text: reviewText,
      timestamp: new Date().toISOString(),
    };

    const currentReviews = business.reviews || [];

    await updateOrderStatus(business.id, orderId, completed);

    const inventoryDeltas: Record<string, number> = {};
    Object.entries(inventoryDeductions).forEach(([itemId, qty]) => {
      inventoryDeltas[itemId] = (inventoryDeltas[itemId] || 0) - qty;
    });

    await updateBusinessFinancials(business.id, {
      cashDelta: payment + tip,
      totalRevenueDelta: payment + tip,
      reputation: Math.min(100, business.reputation + (stars >= 5 ? 2 : stars <= 2 ? -2 : 0)),
      ordersCompletedDelta: 1,
      reviews: [newReview, ...currentReviews].slice(0, 20),
      inventoryDeltas,
    });

    if (stars === 6) {
      showInterrupt('luka', `WOAH! A 6-Star Legendary Review from ${order.customerName}!`, 'happy');
    } else if (stars <= 2) {
      showInterrupt('keisha', `Ouch. ${order.customerName} left a ${stars}-star review.`, 'concerned');
    } else if (tip > 0) {
      showInterrupt('mendy', `Awesome! Received ฿${payment} plus a ฿${tip} tip!`, 'happy');
    }

    setActiveFulfillmentOrder(null);
  };

  const handleStartFulfillment = (order: Order) => {
    setActiveFulfillmentOrder(order);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)]" />
      </div>
    );
  }

  if (!business && !isRegistering) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] relative overflow-hidden">
        <DashboardAmbience cashBalance={0} />

        <main className="relative z-10 pt-32 pb-32 px-4 max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-20">
            <div className="max-w-md mx-auto mt-12">
              <BrightLayer
                variant="glass"
                padding="lg"
                className="border-dashed border-2 border-[var(--brand-primary)]/30 backdrop-blur-xl"
              >
                <div className="text-6xl mb-6">🚀</div>
                <BrightHeading level={2} className="mb-4">
                  Empire Awaits
                </BrightHeading>
                <p className="text-[var(--text-secondary)] mb-8 leading-relaxed">
                  Create your first legal entity to start playing through real-world business crises and opportunities.
                </p>
                <BrightButton variant="primary" size="lg" className="w-full" onClick={() => setIsRegistering(true)}>
                  Register First Venture
                </BrightButton>
              </BrightLayer>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  if (isRegistering) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] relative overflow-hidden pt-20">
        <div className="fixed top-8 right-8 z-50">
          <button onClick={() => setIsRegistering(false)} className="text-[var(--text-muted)] hover:text-white">
            ✕ Close
          </button>
        </div>
        <BusinessRegistration onComplete={() => setIsRegistering(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] relative overflow-hidden">
      <DashboardAmbience cashBalance={business!.cashBalance} />

      <BusinessSectionNav />

      <main className="relative z-10 pt-4 md:pt-10 pb-32 px-4 max-w-[1600px] mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Operations</div>
            <BrightHeading level={2} className="leading-tight">
              {business!.businessName}
            </BrightHeading>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30">
              <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Sim Time</div>
              <div className="font-mono font-black text-[var(--text-primary)] tabular-nums">{simHour}:00</div>
            </div>
            <div className="px-4 py-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30">
              <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Type</div>
              <div className="font-black text-[var(--state-success)] truncate max-w-[180px]">{businessType?.name ?? 'Business'}</div>
            </div>
          </div>
        </div>

        {business && (
          <div className="mb-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-4 max-w-sm">
              <BusinessCard3D
                businessName={business.businessName}
                tier="Startup"
                ownerName={user?.displayName || 'Unknown Director'}
                themeColor={business.branding?.themeColor}
                logoUrl={business.branding?.logoUrl}
                icon={business.branding?.icon}
              />
            </div>

            <div className="lg:col-span-8 flex flex-col gap-6 w-full">
              <div className="flex justify-end items-center gap-4">
                <BrightButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    isPausedRef.current = !isPausedRef.current;
                    const btn = document.getElementById('pause-btn-text');
                    if (btn) btn.innerText = isPausedRef.current ? 'RESUME OPERATION' : 'PAUSE OPERATION';
                  }}
                  className="text-[var(--text-muted)] hover:text-white border border-[var(--border-subtle)]"
                >
                  <span className="mr-2">⏸</span> <span id="pause-btn-text">PAUSE OPERATION</span>
                </BrightButton>
                <BrightButton
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    if (confirm('ARE YOU SURE? This will liquidate your business and delete all progress.')) {
                      await deleteDoc(doc(db, 'businesses', business.id));
                    }
                  }}
                  className="bg-red-500/10 text-red-500 border-red-500/50 hover:bg-red-500 hover:text-white"
                >
                  SHUTDOWN
                </BrightButton>
              </div>

              <BusinessStatsBar
                businessState={business}
                pendingRevenue={orders
                  .filter((o) => ['accepted', 'in_progress'].includes(o.status))
                  .reduce((acc, o) => acc + o.totalAmount, 0)}
                earnedToday={business.ordersCompleted * 50}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-10 min-h-[500px]">
            <div>
              <BrightHeading level={4} className="mb-4 text-[var(--text-muted)] tracking-widest uppercase text-xs font-black">
                Operations Console
              </BrightHeading>
              {business && businessType && (
                <OrderDashboard
                  businessState={business}
                  businessType={businessType}
                  orders={orders}
                  onAcceptOrder={handleAcceptOrder}
                  onRejectOrder={handleRejectOrder}
                  onCompleteOrder={handleCompleteOrder}
                  onFulfill={handleStartFulfillment}
                />
              )}
            </div>

            <div>
              <BrightHeading level={4} className="mb-4 text-[var(--text-muted)] tracking-widest uppercase text-xs font-black">
                Activity Feed
              </BrightHeading>
              <BrightLayer variant="glass" padding="none" className="min-h-[200px] relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)] text-sm italic">
                  Awaiting operational telemetry...
                </div>
              </BrightLayer>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-10">
            <div className="grid grid-cols-1 gap-10">
              <div>
                <BrightHeading level={4} className="mb-4 text-[var(--text-muted)] tracking-widest uppercase text-xs font-black">
                  Human Resources
                </BrightHeading>
                {business && <OrgChart business={business} />}
              </div>
              {business && <PayrollManager business={business} />}
            </div>

            <div>
              <BrightHeading level={4} className="mb-4 text-[var(--text-muted)] tracking-widest uppercase text-xs font-black">
                Warehouse Management
              </BrightHeading>
              {business && <InventoryPanel inventory={business.inventory || {}} />}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {activeFulfillmentOrder && businessType && (
            <BusinessWorkspace
              order={activeFulfillmentOrder}
              businessType={businessType}
              onComplete={(quality) => handleCompleteOrder(activeFulfillmentOrder.id, quality)}
              onCancel={() => setActiveFulfillmentOrder(null)}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
