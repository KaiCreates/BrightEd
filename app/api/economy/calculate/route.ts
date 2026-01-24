import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-server';
import { adminDb } from '@/lib/firebase-admin';
import { z } from 'zod';
import { 
  generateOrdersForTick, 
  acceptOrder, 
  rejectOrder, 
  startOrder, 
  completeOrder, 
  failOrder,
  checkExpiredOrders
} from '@/lib/economy/order-engine';
import { 
  BusinessState,
  Order 
} from '@/lib/economy/economy-types';
import { getBusinessType } from '@/lib/economy/business-templates';

// Request validation schemas
const CalculateOrdersSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  simHour: z.number().min(0).max(23),
  tickMinutes: z.number().min(1).max(60).default(15)
});

const OrderActionSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  orderId: z.string().min(1, 'Order ID is required'),
  action: z.enum(['accept', 'reject', 'start', 'complete', 'fail']),
  qualityScore: z.number().min(0).max(100).optional(),
  reason: z.string().optional()
});

// Get business state from Firestore
async function getBusinessState(businessId: string): Promise<BusinessState | null> {
  try {
    const businessDoc = await adminDb.collection('businesses').doc(businessId).get();
    if (!businessDoc.exists) return null;
    
    const data = businessDoc.data();
    if (!data) return null;

    const toIso = (v: any): string => {
      if (!v) return new Date().toISOString();
      if (typeof v === 'string') return v;
      if (typeof v?.toDate === 'function') return v.toDate().toISOString();
      return new Date().toISOString();
    };

    return {
      id: businessId,
      playerId: data.ownerId,
      businessTypeId: data.businessTypeId || 'retail',
      businessName: data.name || 'Business',

      cashBalance: Number(data.balance ?? 0),
      totalRevenue: Number(data.totalRevenue ?? 0),
      totalExpenses: Number(data.totalExpenses ?? 0),

      reputation: Number(data.reputation ?? 50),
      customerSatisfaction: Number(data.customerSatisfaction ?? 70),
      reviewCount: Number(data.reviewCount ?? 0),

      operatingHours: data.operatingHours || { open: 8, close: 20 },
      staffCount: Number(data.staffCount ?? 1),
      maxConcurrentOrders: Number(data.maxConcurrentOrders ?? 3),

      employees: Array.isArray(data.employees) ? data.employees : [],

      inventory: data.inventory && typeof data.inventory === 'object' ? data.inventory : {},
      marketState: {
        lastRestock: toIso(data.marketState?.lastRestock ?? data.lastRestock),
        nextRestock: toIso(data.marketState?.nextRestock ?? data.nextRestock),
        items: Array.isArray(data.marketState?.items) ? data.marketState.items : (Array.isArray(data.items) ? data.items : [])
      },

      recruitmentPool: Array.isArray(data.recruitmentPool) ? data.recruitmentPool : [],
      lastRecruitmentTime: toIso(data.lastRecruitmentTime),

      lastPayrollTime: toIso(data.lastPayrollTime),
      reviews: Array.isArray(data.reviews) ? data.reviews : [],

      activeOrders: Array.isArray(data.activeOrders) ? data.activeOrders : [],
      ordersCompleted: Number(data.ordersCompleted ?? 0),
      ordersFailed: Number(data.ordersFailed ?? 0),

      createdAt: toIso(data.createdAt),
      lastActiveAt: toIso(data.lastActiveAt)
    };
  } catch (error) {
    console.error('Error getting business state:', error);
    return null;
  }
}

// Update business state in Firestore
async function updateBusinessState(businessId: string, updates: Partial<BusinessState>): Promise<void> {
  try {
    const businessRef = adminDb.collection('businesses').doc(businessId);
    await businessRef.update({
      ...updates,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating business state:', error);
    throw error;
  }
}

// Calculate new orders for a business tick
export async function POST(request: NextRequest) {
  try {
    const decodedToken = await verifyAuth(request);
    const body = await request.json();
    
    const result = CalculateOrdersSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: result.error.format() 
      }, { status: 400 });
    }

    const { businessId, simHour, tickMinutes } = result.data;

    // Get business state
    const businessState = await getBusinessState(businessId);
    if (!businessState) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Verify ownership
    if (businessState.playerId !== decodedToken.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get business type
    const businessType = getBusinessType(businessState.businessTypeId);
    if (!businessType) {
      return NextResponse.json({ error: 'Business type not found' }, { status: 404 });
    }

    // Get current active orders
    const activeOrderCount = businessState.activeOrders?.length || 0;

    // Generate new orders
    const newOrders = generateOrdersForTick(
      businessType,
      businessState,
      simHour,
      activeOrderCount,
      tickMinutes
    );

    // Save new orders to Firestore
    if (newOrders.length > 0) {
      const batch = adminDb.batch();
      const ordersRef = adminDb.collection('businesses').doc(businessId).collection('orders');
      
      newOrders.forEach(order => {
        const orderRef = ordersRef.doc();
        batch.set(orderRef, {
          ...order,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });

      await batch.commit();
    }

    // Check for expired orders
    const allOrdersRef = adminDb.collection('businesses').doc(businessId).collection('orders');
    const allOrdersSnapshot = await allOrdersRef
      .where('status', 'in', ['pending', 'accepted', 'in_progress'])
      .get();
    
    const allOrders = allOrdersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Order));

    const { expired, active } = checkExpiredOrders(allOrders);

    // Update expired orders
    if (expired.length > 0) {
      const updateBatch = adminDb.batch();
      expired.forEach(order => {
        const orderRef = allOrdersRef.doc(order.id);
        updateBatch.update(orderRef, {
          status: 'expired',
          updatedAt: new Date()
        });
      });
      await updateBatch.commit();
    }

    return NextResponse.json({
      success: true,
      newOrders: newOrders.length,
      expiredOrders: expired.length,
      activeOrders: active.length
    });

  } catch (error: any) {
    console.error('Economy calculation error:', error);
    return NextResponse.json({ error: 'Failed to calculate economy' }, { status: 500 });
  }
}

// Handle order actions (accept, reject, start, complete, fail)
export async function PUT(request: NextRequest) {
  try {
    const decodedToken = await verifyAuth(request);
    const body = await request.json();
    
    const result = OrderActionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: result.error.format() 
      }, { status: 400 });
    }

    const { businessId, orderId, action, qualityScore, reason } = result.data;

    // Get business state
    const businessState = await getBusinessState(businessId);
    if (!businessState) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Verify ownership
    if (businessState.playerId !== decodedToken.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get the order
    const orderRef = adminDb.collection('businesses').doc(businessId).collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = { id: orderId, ...orderDoc.data() } as Order;

    let updatedOrder: Order;
    let businessUpdate: Partial<BusinessState> = {};

    // Process the action
    switch (action) {
      case 'accept':
        updatedOrder = acceptOrder(order);
        break;
        
      case 'reject':
        const rejectResult = rejectOrder(order);
        updatedOrder = rejectResult.order;
        businessUpdate.reputation = Math.max(0, businessState.reputation - rejectResult.reputationPenalty);
        break;
        
      case 'start':
        updatedOrder = startOrder(order);
        break;
        
      case 'complete':
        if (qualityScore === undefined) {
          return NextResponse.json({ error: 'Quality score is required for completion' }, { status: 400 });
        }
        const completeResult = completeOrder(order, qualityScore);
        updatedOrder = completeResult.order;
        businessUpdate.cashBalance = businessState.cashBalance + completeResult.payment;
        businessUpdate.ordersCompleted = businessState.ordersCompleted + 1;
        break;
        
      case 'fail':
        const failReason = (reason as 'deadline_missed' | 'stockout' | 'cancelled_by_business') || 'cancelled_by_business';
        const failResult = failOrder(order, failReason);
        updatedOrder = failResult.order;
        businessUpdate.cashBalance = businessState.cashBalance - failResult.refund;
        businessUpdate.reputation = Math.max(0, businessState.reputation - failResult.reputationPenalty);
        businessUpdate.ordersFailed = businessState.ordersFailed + 1;
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update order in Firestore
    await orderRef.update({
      ...updatedOrder,
      updatedAt: new Date()
    });

    // Update business state if needed
    if (Object.keys(businessUpdate).length > 0) {
      await updateBusinessState(businessId, businessUpdate);
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      businessUpdate
    });

  } catch (error: any) {
    console.error('Order action error:', error);
    return NextResponse.json({ error: 'Failed to process order action' }, { status: 500 });
  }
}
