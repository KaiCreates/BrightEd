'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { BrightHeading, BrightButton, BrightLayer } from '@/components/system';
import { BCoinIcon } from '@/components/BCoinIcon';
import BusinessRegistration from '@/components/business/BusinessRegistration';
import {
  CinematicProvider,
  useCinematic,
  DashboardAmbience,
  StatReactor
} from '@/components/cinematic';
import { OrderDashboard } from '@/components/business/OrderDashboard';
import BusinessCard3D from '@/components/business/BusinessCard3D';
import { useAuth } from '@/lib/auth-context';
import { useBusiness } from '@/lib/business-context';
import { db } from '@/lib/firebase';
import { collection, query, where, doc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import BusinessFeed from '@/components/business/BusinessFeed';
import BusinessWorkspace from '@/components/business/BusinessWorkspace';
import Marketplace from '@/components/business/Marketplace';
import OrgChart from '@/components/business/OrgChart';
import EmployeeShop from '@/components/business/EmployeeShop';
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
  assessFinancialHealth
} from '@/lib/economy';

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function BusinessCommandCenter() {
  return (
    <CinematicProvider>
      <CommandCenterContent />
    </CinematicProvider>
  );
}

// ============================================================================
// CONTENT COMPONENT (Inside Cinematic Context)
// ============================================================================

function CommandCenterContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showInterrupt, playScene } = useCinematic();

  const [business, setBusiness] = useState<BusinessState | null>(null);
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [activeFulfillmentOrder, setActiveFulfillmentOrder] = useState<Order | null>(null);

  // Simulation state
  const [simHour, setSimHour] = useState(8);
  const lastTickRef = useRef<number>(Date.now());
  const isPausedRef = useRef(false);
  const lastPayrollRunRef = useRef<number>(0);
  const lastAutoWorkRef = useRef<number>(0);

  // 1. Listen for Business Data
  useEffect(() => {
    if (authLoading || !user) return;

    // Listen for user's business
    const q = query(collection(db, "businesses"), where("ownerId", "==", user.uid));

    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        // Found business
        const data = snap.docs[0].data();
        const bizState: BusinessState = {
          id: snap.docs[0].id,
          playerId: data.ownerId,
          businessTypeId: data.businessTypeId,
          businessName: data.name,
          cashBalance: data.balance ?? data.cashBalance ?? 0,
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

        // Sync local ref to DB state if DB is newer (e.g. page reload)
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
  }, [user, authLoading]);

  // 2. Fetch Active Orders
  useEffect(() => {
    if (!business) return;

    fetchActiveOrders(business.id).then(setOrders);

    const ordersQuery = query(collection(db, 'businesses', business.id, 'orders'));
    const unsub = onSnapshot(ordersQuery, (snap) => {
      const activeOrders = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Order))
        .filter((o) => ['pending', 'accepted', 'in_progress'].includes(o.status))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setOrders(activeOrders);
    });

    return () => unsub();
  }, [business?.id]);

  // 3. Economy Game Loop
  useEffect(() => {
    if (!business || !businessType) return;

    const interval = setInterval(() => {
      if (isPausedRef.current) return;

      const now = Date.now();
      const lastRecruit = business.lastRecruitmentTime ? new Date(business.lastRecruitmentTime).getTime() : 0;

      // RECRUITMENT REFRESH: Every 2 minutes (120000ms)
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
              name: ['Alex', 'Sam', 'Jordan', 'Taylor', 'Casey', 'Riley'][Math.floor(Math.random() * 6)] + ' ' +
                ['Smith', 'Doe', 'Lee', 'Wong', 'Garcia', 'Patel'][Math.floor(Math.random() * 6)],
              role: role,
              salaryPerDay: Math.floor(baseStat * 1.5),
              stats: {
                speed: role === 'speedster' ? baseStat + 20 : baseStat,
                quality: role === 'specialist' ? baseStat + 20 : baseStat,
                morale: 80
              },
              hiredAt: new Date().toISOString()
            });
          }

          const bizRef = doc(db, 'businesses', business.id);
          const updatedPool = [...currentPool, ...newCandidates].slice(0, 10);

          updateDoc(bizRef, {
            recruitmentPool: updatedPool,
            lastRecruitmentTime: new Date().toISOString()
          });

          if (newCandidates.length > 0) {
            showInterrupt('luka', 'New candidates available in Recruitment!', 'happy');
          }
        }
      }

      // PAYROLL CHECK: Every 2 game-days
      if (now - lastPayrollRunRef.current >= 1800000) {
        if (business.employees && business.employees.length > 0) {
          const totalSalary = business.employees.reduce((acc: number, emp: any) => acc + emp.salaryPerDay * 2, 0);

          lastPayrollRunRef.current = now;

          const newBizBalance = business.cashBalance - totalSalary;

          updateBusinessFinancials(business.id, {
            cashBalance: newBizBalance,
            lastPayrollTime: new Date(now).toISOString()
          });

          if (newBizBalance < 0) {
            showInterrupt('marcus', `Payroll of ฿${totalSalary} processed. Warning: Business account overdrawn!`, 'concerned');
          } else {
            showInterrupt('mendy', `Payroll of ฿${totalSalary} processed for ${business.employees.length} staff.`, 'neutral');
          }
        }
      }

      // AUTO-FULFILLMENT & MANAGER LOGIC
      // Cooldown: 2 seconds (2000ms)

      if (business.employees && business.employees.length > 0) {
        const hasManager = business.employees.some((e: any) => e.role === 'manager');

        // 1. Calculate Capacity
        const roleCaps: Record<string, number> = { 'trainee': 2, 'speedster': 2, 'specialist': 3, 'manager': 4 };
        const totalCapacity = business.employees.reduce((acc: number, e: any) => acc + (roleCaps[e.role] || 2), 0);
        const activeOrderCount = orders.filter(o => o.status === 'accepted' || o.status === 'in_progress').length;

        // 2. Manager Auto-Accept (If capacity allows)
        // Check pending orders only
        if (hasManager && activeOrderCount < totalCapacity) {
          const pendingOrders = orders.filter(o => o.status === 'pending').sort((a, b) => b.totalAmount - a.totalAmount); // Prioritize value
          const slotsAvailable = totalCapacity - activeOrderCount;

          // Process up to slotsAvailable
          const toAccept = pendingOrders.slice(0, slotsAvailable);

          if (toAccept.length > 0) {
            toAccept.forEach(order => {
              const accepted = { ...order, status: 'accepted', acceptedAt: new Date().toISOString() };
              updateOrderStatus(business.id, order.id, accepted as any);
            });

            if (Math.random() > 0.7) {
              showInterrupt('luka', `Manager accepted ${toAccept.length} orders automatically.`, 'neutral');
            }
          }
        }

        // 3. Employee Work (Auto-Complete)
        if (now - lastAutoWorkRef.current >= 2000) {
          const acceptedOrders = orders.filter(o => o.status === 'accepted').sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

          if (acceptedOrders.length > 0) {
            // Scaling: Allow processing multiple orders if you have a large team
            const workPower = Math.max(1, Math.floor(business.employees.length / 1.5));
            const ordersToComplete = acceptedOrders.slice(0, workPower);

            if (ordersToComplete.length > 0) {
              lastAutoWorkRef.current = now;

              let totalPay = 0;

              // Batch updates logic
              const batchFinancials: {
                cashBalance: number;
                reputation: number;
                ordersCompleted: number;
                reviews: any[];
                inventory: Record<string, number>;
              } = {
                cashBalance: business.cashBalance,
                reputation: business.reputation,
                ordersCompleted: business.ordersCompleted,
                reviews: business.reviews || [],
                inventory: { ...business.inventory }
              };

              ordersToComplete.forEach(orderToProcess => {
                // Check stock before auto-processing
                const reqInventory: Record<string, number> = {};
                orderToProcess.items.forEach(item => {
                  const product = businessType.products.find(p => p.id === item.productId);
                  if (product?.requiresInventory && product.inventoryItemId) {
                    reqInventory[product.inventoryItemId] = (reqInventory[product.inventoryItemId] || 0) + (product.inventoryPerUnit || 1) * item.quantity;
                  }
                });

                const hasStock = Object.entries(reqInventory).every(([itemId, qty]) => (business.inventory?.[itemId] || 0) >= qty);

                if (!hasStock) {
                  // Proactively fail the order if no stock (instead of skipping)
                  const { order: failed, reputationPenalty } = failOrder(orderToProcess, 'stockout');
                  updateOrderStatus(business.id, orderToProcess.id, failed);

                  // Small reputation hit for stockout
                  updateBusinessFinancials(business.id, {
                    reputation: Math.max(0, business.reputation - reputationPenalty)
                  });

                  if (Math.random() > 0.5) {
                    showInterrupt('keisha', `We're out of stock for ${orderToProcess.customerName}'s order! I had to cancel it.`, 'concerned');
                  }
                  return;
                }

                // Calculate Quality
                const avgQuality = business.employees.reduce((acc: number, e: any) => acc + (e.stats?.quality || 50), 0) / business.employees.length;
                const qualityScore = Math.min(100, Math.floor(avgQuality + (Math.random() * 20 - 10)));

                const { order: completed, payment, tip, inventoryDeductions } = completeOrder(orderToProcess, qualityScore, businessType);

                // Review
                const stars = qualityScore >= 95 ? 6 : Math.ceil((qualityScore / 100) * 5);
                const reviewText = stars === 6 ? "Fast service!" : "Good auto-service.";
                const newReview = {
                  id: `rev_${Date.now()}_${Math.random()}`,
                  orderId: orderToProcess.id,
                  customerName: orderToProcess.customerName,
                  rating: stars,
                  text: reviewText,
                  timestamp: new Date().toISOString()
                };

                // Accumulate
                batchFinancials.cashBalance += (payment + tip);
                batchFinancials.reputation = Math.min(100, batchFinancials.reputation + (stars >= 5 ? 1 : 0));
                batchFinancials.ordersCompleted += 1;
                batchFinancials.reviews.unshift(newReview);
                totalPay += payment;

                // Apply inventory deductions to local state for batching
                Object.entries(inventoryDeductions).forEach(([itemId, qty]) => {
                  batchFinancials.inventory[itemId] = Math.max(0, (batchFinancials.inventory[itemId] || 0) - qty);
                });

                updateOrderStatus(business.id, orderToProcess.id, completed);
              });

              // Trim reviews
              batchFinancials.reviews = batchFinancials.reviews.slice(0, 20);

              // Single Financial Update
              updateBusinessFinancials(business.id, {
                cashBalance: batchFinancials.cashBalance,
                reputation: batchFinancials.reputation,
                ordersCompleted: batchFinancials.ordersCompleted,
                reviews: batchFinancials.reviews,
                inventory: batchFinancials.inventory
              });

              // Occasional interrupt
              if (Math.random() > 0.7) {
                showInterrupt('mendy', `Staff cleared ${ordersToComplete.length} orders. +฿${totalPay}`, 'neutral');
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

        const activeCount = orders.filter((o) => o.status === 'accepted' || o.status === 'in_progress').length;
        const newOrders = generateOrdersForTick(
          businessType,
          business,
          simHour,
          activeCount,
          15
        );

        if (newOrders.length > 0) {
          saveNewOrders(business.id, newOrders);
          if (Math.random() > 0.7) {
            showInterrupt('luka', `New order from ${newOrders[0].customerName}!`, 'happy');
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [business, businessType, simHour, orders, showInterrupt]);

  // Order Handlers
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
    const { order: completed, payment, tip, inventoryDeductions } = completeOrder(order, qualityScore, businessType ?? undefined);

    // Validate stock manually just in case
    const currentInv = business.inventory || {};
    const insufficientStock = Object.entries(inventoryDeductions).some(([itemId, qty]) => (currentInv[itemId] || 0) < qty);

    if (insufficientStock) {
      showInterrupt('keisha', "Wait! We don't have enough stock to fulfill this order!", 'concerned');
      return;
    }

    const stars = qualityScore >= 95 ? 6 : Math.ceil((qualityScore / 100) * 5);
    const reviewText = stars === 6 ? 'Absolutely legendary service!' :
      stars === 5 ? 'Great experience, would recommend.' :
        stars === 4 ? 'Good service.' :
          stars === 3 ? 'Okay, but could be better.' : 'Disappointing.';

    const newReview = {
      id: `rev_${Date.now()}`,
      orderId: orderId,
      customerName: order.customerName,
      rating: stars,
      text: reviewText,
      timestamp: new Date().toISOString()
    };

    const currentReviews = business.reviews || [];

    await updateOrderStatus(business.id, orderId, completed);

    const updatedInventory = { ...currentInv };
    Object.entries(inventoryDeductions).forEach(([itemId, qty]) => {
      updatedInventory[itemId] = Math.max(0, (updatedInventory[itemId] || 0) - qty);
    });

    await updateBusinessFinancials(business.id, {
      cashBalance: business.cashBalance + payment + tip,
      reputation: Math.min(100, business.reputation + (stars >= 5 ? 2 : stars <= 2 ? -2 : 0)),
      ordersCompleted: business.ordersCompleted + 1,
      reviews: [newReview, ...currentReviews].slice(0, 20),
      inventory: updatedInventory
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

  // --- RENDER ---

  // Gatekeeper: No business found
  if (!business && !isRegistering) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] relative overflow-hidden">
        <DashboardAmbience cashBalance={0} />

        <main className="relative z-10 pt-32 pb-32 px-4 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-20"
          >
            <div className="max-w-md mx-auto mt-12">
              <BrightLayer variant="glass" padding="lg" className="border-dashed border-2 border-[var(--brand-primary)]/30 backdrop-blur-xl">
                <div className="text-6xl mb-6">🚀</div>
                <BrightHeading level={2} className="mb-4">Empire Awaits</BrightHeading>
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

  // Registration Mode
  if (isRegistering) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] relative overflow-hidden pt-20">
        <div className="fixed top-8 right-8 z-50">
          <button onClick={() => setIsRegistering(false)} className="text-[var(--text-muted)] hover:text-white">✕ Close</button>
        </div>
        <BusinessRegistration
          onComplete={() => setIsRegistering(false)}
        />
      </div>
    );
  }

  // Dashboard Mode
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] relative overflow-hidden">
      {/* Ambient Background reacting to health */}
      <DashboardAmbience cashBalance={business!.cashBalance} />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-20 bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border-subtle)] z-50 flex items-center px-4">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <Link href="/stories" className="text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2">
            <span>←</span> STORIES
          </Link>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Sim Time</span>
              <span className="font-mono font-bold text-[var(--text-primary)]">{simHour}:00</span>
            </div>
            <div className="h-4 w-px bg-[var(--border-subtle)]" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest text-[var(--state-success)]">
                {businessType?.name ?? 'Business'}
              </span>
              <span className="font-bold text-[var(--text-primary)]">{business!.businessName}</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-28 pb-32 px-4 max-w-[1600px] mx-auto">

        {/* Top: HQ Section (Business Card + Controls + Stats) */}
        {business && (
          <div className="mb-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            {/* Identity Card */}
            <div className="lg:col-span-4 max-w-sm">
              <BusinessCard3D
                businessName={business.businessName}
                tier="Startup"
                ownerName={user?.displayName || "Unknown Director"}
              />
            </div>

            {/* Stats & Controls */}
            <div className="lg:col-span-8 flex flex-col gap-6 w-full">
              {/* Control Panel */}
              <div className="flex justify-end items-center gap-4">
                <BrightButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    isPausedRef.current = !isPausedRef.current;
                    // Force re-render UI toggle text
                    const btn = document.getElementById('pause-btn-text');
                    if (btn) btn.innerText = isPausedRef.current ? "RESUME OPERATION" : "PAUSE OPERATION";
                  }}
                  className="text-[var(--text-muted)] hover:text-white border border-[var(--border-subtle)]"
                >
                  <span className="mr-2">⏸</span> <span id="pause-btn-text">PAUSE OPERATION</span>
                </BrightButton>
                <BrightButton
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    if (confirm("ARE YOU SURE? This will liquidate your business and delete all progress.")) {
                      await deleteDoc(doc(db, 'businesses', business.id));
                    }
                  }}
                  className="bg-red-500/10 text-red-500 border-red-500/50 hover:bg-red-500 hover:text-white"
                >
                  SHUTDOWN
                </BrightButton>
              </div>

              {/* Stats Bar */}
              <BusinessStatsBar
                businessState={business}
                pendingRevenue={orders.filter(o => ['accepted', 'in_progress'].includes(o.status)).reduce((acc, o) => acc + o.totalAmount, 0)}
                earnedToday={business.ordersCompleted * 50}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* COLUMN 1: OPERATIONS (7/12) */}
          <div className="lg:col-span-7 space-y-10">
            <div>
              <BrightHeading level={4} className="mb-4 text-[var(--text-muted)] tracking-widest uppercase text-xs font-black">Operations Console</BrightHeading>
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
              <BrightHeading level={4} className="mb-4 text-[var(--text-muted)] tracking-widest uppercase text-xs font-black">Activity Feed</BrightHeading>
              <BrightLayer variant="glass" padding="none" className="min-h-[200px] relative overflow-hidden">
                {/* Placeholder for real feed */}
                <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)] text-sm italic">
                  Awaiting operational telemetry...
                </div>
              </BrightLayer>
            </div>
          </div>

          {/* COLUMN 2: HQ & ORGANIZATION (5/12) */}
          <div className="lg:col-span-5 space-y-10">
            <div>
              <BrightHeading level={4} className="mb-4 text-[var(--text-muted)] tracking-widest uppercase text-xs font-black">Human Resources</BrightHeading>
              {business && <OrgChart business={business} />}
            </div>

            {/* Warehouse here keeps things compact */}
            <div>
              <BrightHeading level={4} className="mb-4 text-[var(--text-muted)] tracking-widest uppercase text-xs font-black">Warehouse Management</BrightHeading>
              {business && <InventoryPanel inventory={business.inventory || {}} />}
            </div>
          </div>
        </div>

        {/* RECRUITMENT HUB - Now Horizontal Scroll Chain */}
        <div className="mt-16 space-y-6">
          <div className="border-b border-[var(--border-subtle)] pb-4">
            <BrightHeading level={4} className="text-[var(--text-muted)] tracking-widest uppercase text-xs font-black">Recruitment Hub</BrightHeading>
          </div>
          {business && <EmployeeShop business={business} />}
        </div>

        {/* SUPPLY CHAIN - Full width below Recruitment */}
        <div className="mt-16 space-y-6">
          <div className="border-b border-[var(--border-subtle)] pb-4">
            <BrightHeading level={4} className="text-[var(--text-muted)] tracking-widest uppercase text-xs font-black">Supply Chain Ecosystem</BrightHeading>
          </div>
          {business && <Marketplace business={business} />}
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
