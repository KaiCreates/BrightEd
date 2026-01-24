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
import { useAuth } from '@/lib/auth-context';
import { useBusiness } from '@/lib/business-context';
import { db } from '@/lib/firebase';
import { collection, query, where, doc, onSnapshot } from 'firebase/firestore';
import BusinessFeed from '@/components/business/BusinessFeed';
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

import BusinessWorkspace from '@/components/business/BusinessWorkspace';

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

  // 1. Listen for Business Data
  useEffect(() => {
    if (authLoading || !user) return;

    // Listen for user's business
    // We assume mostly 1 business for now in this MVP, or take the first one
    const q = query(collection(db, "businesses"), where("ownerId", "==", user.uid));

    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        // Found business
        const data = snap.docs[0].data();
        const bizState: BusinessState = {
          id: snap.docs[0].id,
          playerId: data.ownerId,
          businessTypeId: data.businessTypeId,
          businessName: data.name, // Use 'name' for backward compat
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
          activeOrders: data.activeOrders ?? [],
          ordersCompleted: data.ordersCompleted ?? 0,
          ordersFailed: data.ordersFailed ?? 0,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          lastActiveAt: data.lastActiveAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        };

        setBusiness(bizState);

        // Load business type template
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

    // In a real app we'd listen to the subcollection, but for MVP fetch is fine
    // Or we could set up another listener
    fetchActiveOrders(business.id).then(setOrders);

    // Set up subcollection listener for real-time order updates
    const q = query(collection(db, "businesses", business.id, "orders"));
    const unsub = onSnapshot(q, (snap) => {
      const activeOrders = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Order))
        .filter(o => ['pending', 'accepted', 'in_progress'].includes(o.status))
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
      if (now - lastTickRef.current >= 5000) { // Tick every 5 seconds (simulates 15 mins)
        lastTickRef.current = now;

        // Advance time
        setSimHour(prev => {
          const next = prev >= 22 ? 6 : prev + 1; // 6am to 10pm cycle
          return next;
        });

        // Generate orders
        const activeCount = orders.filter(o => o.status === 'accepted' || o.status === 'in_progress').length;
        const newOrders = generateOrdersForTick(
          businessType,
          business,
          simHour,
          activeCount,
          15 // 15 mins per tick
        );

        if (newOrders.length > 0) {
          saveNewOrders(business.id, newOrders);

          // Cinematic interrupt for first order of the batch
          if (Math.random() > 0.7) {
            showInterrupt('luka', `New order from ${newOrders[0].customerName}!`, 'happy');
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [business, businessType, simHour, orders.length, showInterrupt]);

  // Order Handlers
  const handleAcceptOrder = async (orderId: string) => {
    if (!business) return;
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const accepted = acceptOrder(order);
    await updateOrderStatus(business.id, orderId, accepted);

    showInterrupt('luka', 'Order accepted! Watch the deadline.', 'neutral');
  };

  const handleRejectOrder = async (orderId: string) => {
    if (!business) return;
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const { order: rejected, reputationPenalty } = rejectOrder(order);
    await updateOrderStatus(business.id, orderId, rejected);

    // Update reputation
    const newRep = Math.max(0, business.reputation - reputationPenalty);
    await updateBusinessFinancials(business.id, { reputation: newRep });

    if (reputationPenalty > 2) {
      showInterrupt('keisha', `${order.customerName} wasn't happy about the rejection.`, 'concerned');
    }
  };

  const handleCompleteOrder = async (orderId: string, customQuality?: number) => {
    if (!business) return;
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Use simulated quality score or randomize if skipped
    const qualityScore = customQuality ?? Math.floor(60 + Math.random() * 40);

    const { order: completed, payment, tip } = completeOrder(order, qualityScore);
    await updateOrderStatus(business.id, orderId, completed);

    // Update financials
    await updateBusinessFinancials(business.id, {
      cashBalance: business.cashBalance + payment + tip,
      reputation: Math.min(100, business.reputation + (qualityScore > 80 ? 2 : 0)),
      ordersCompleted: business.ordersCompleted + 1
    });

    if (tip > 0) {
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

      <main className="relative z-10 pt-32 pb-32 px-4 max-w-7xl mx-auto">
        {/* Order Dashboard containing Stats + Queue */}
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

        {/* Additional sections like Leaderboard or upgrades could go here */}
        <div className="mt-12 grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <BrightHeading level={4} className="mb-4">Activity Feed</BrightHeading>
            <BrightLayer variant="glass" padding="none" className="h-64 overflow-hidden relative">
              <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)] pointer-events-none z-10">
                Activity feed coming soon
              </div>
              {/* Placeholder for feed */}
            </BrightLayer>
          </div>
          <div>
            <BrightHeading level={4} className="mb-4">Market Trends</BrightHeading>
            <BrightLayer variant="glass" padding="md">
              <p className="text-sm text-[var(--text-secondary)]">Demand is normal. No major market events detected.</p>
            </BrightLayer>
          </div>
        </div>
      </main>

    </div>
  );
}
