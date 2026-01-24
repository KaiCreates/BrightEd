/**
 * BrightEd Economy Engine — Firebase Data Layer
 * Handles persistence for businesses, orders, and expenses using Firestore.
 */

import { db } from '@/lib/firebase';
import {
    collection,
    doc,
    setDoc,
    updateDoc,
    getDoc,
    getDocs,
    query,
    where,
    addDoc,
    orderBy,
    limit,
    serverTimestamp,
    increment,
    writeBatch
} from 'firebase/firestore';
import {
    BusinessState,
    Order,
    Expense,
    BusinessType
} from './economy-types';

const COLLECTIONS = {
    BUSINESSES: 'businesses',
    ORDERS: 'orders',
    EXPENSES: 'expenses',
};

// ============================================================================
// BUSINESS PROFILE
// ============================================================================

/**
 * Create a new business with economy profile
 */
export async function createEconomyBusiness(
    userId: string,
    businessName: string,
    businessType: BusinessType
): Promise<string> {
    const businessRef = doc(collection(db, COLLECTIONS.BUSINESSES));
    const businessId = businessRef.id;

    const initialState: BusinessState = {
        id: businessId,
        playerId: userId,
        businessTypeId: businessType.id,
        businessName,

        // Financials
        cashBalance: businessType.startingCapital,
        totalRevenue: 0,
        totalExpenses: 0,

        // Stats
        reputation: 50,
        customerSatisfaction: 70,
        reviewCount: 0,

        // Operations
        operatingHours: { open: 8, close: 20 },
        staffCount: 1,
        maxConcurrentOrders: businessType.demandConfig.maxConcurrentOrders,

        // Inventory
        inventory: {},

        // Active work
        activeOrders: [],

        // History
        ordersCompleted: 0,
        ordersFailed: 0,

        // Timestamps
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
    };

    // Create document in Firestore
    // We flatten the structure for Firestore but keep types consistent
    await setDoc(businessRef, {
        ownerId: userId, // For permission query
        ...initialState,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Keep compatible with legacy fields
        name: businessName,
        balance: businessType.startingCapital,
        valuation: businessType.startingCapital, // Simple valuation start
        status: 'active',
    });

    return businessId;
}

/**
 * Fetch business state
 */
export async function fetchBusinessState(businessId: string): Promise<BusinessState | null> {
    const docRef = doc(db, COLLECTIONS.BUSINESSES, businessId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) return null;

    const data = snap.data();

    // Map Firestore fields back to BusinessState
    return {
        id: snap.id,
        playerId: data.ownerId,
        businessTypeId: data.businessTypeId,
        businessName: data.name,
        cashBalance: data.balance ?? 0,
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
}

/**
 * Update business financials
 */
export async function updateBusinessFinancials(
    businessId: string,
    updates: {
        cashBalance?: number;
        reputation?: number;
        ordersCompleted?: number;
        ordersFailed?: number;
        inventory?: Record<string, number>;
    }
) {
    const docRef = doc(db, COLLECTIONS.BUSINESSES, businessId);

    const firestoreUpdates: any = {
        updatedAt: serverTimestamp(),
    };

    if (updates.cashBalance !== undefined) {
        firestoreUpdates.balance = updates.cashBalance;
        firestoreUpdates.cashBalance = updates.cashBalance;
    }
    if (updates.reputation !== undefined) firestoreUpdates.reputation = updates.reputation;
    if (updates.ordersCompleted !== undefined) firestoreUpdates.ordersCompleted = updates.ordersCompleted;
    if (updates.ordersFailed !== undefined) firestoreUpdates.ordersFailed = updates.ordersFailed;
    if (updates.inventory !== undefined) firestoreUpdates.inventory = updates.inventory;

    await updateDoc(docRef, firestoreUpdates);
}

// ============================================================================
// ORDERS
// ============================================================================

/**
 * Save new orders (batch)
 */
export async function saveNewOrders(businessId: string, orders: Order[]) {
    const batch = writeBatch(db);

    for (const order of orders) {
        const orderRef = doc(collection(db, COLLECTIONS.BUSINESSES, businessId, COLLECTIONS.ORDERS), order.id);
        batch.set(orderRef, {
            ...order,
            createdAt: serverTimestamp(),
        });
    }

    await batch.commit();
}

/**
 * Update order status
 */
export async function updateOrderStatus(
    businessId: string,
    orderId: string,
    updates: Partial<Order>
) {
    const orderRef = doc(db, COLLECTIONS.BUSINESSES, businessId, COLLECTIONS.ORDERS, orderId);
    await updateDoc(orderRef, {
        ...updates,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Fetch active orders
 */
export async function fetchActiveOrders(businessId: string): Promise<Order[]> {
    const ordersRef = collection(db, COLLECTIONS.BUSINESSES, businessId, COLLECTIONS.ORDERS);

    // FIX: Removed orderBy to prevent "Missing Index" errors on multiple fields
    // Sorting is done in-memory
    const q = query(
        ordersRef,
        where('status', 'in', ['pending', 'accepted', 'in_progress'])
    );

    const snap = await getDocs(q);
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));

    // Sort in memory: newest first
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ============================================================================
// EXPENSES
// ============================================================================

/**
 * Save expenses
 */
export async function saveExpenses(businessId: string, expenses: Expense[]) {
    const batch = writeBatch(db);

    for (const expense of expenses) {
        const expRef = doc(collection(db, COLLECTIONS.BUSINESSES, businessId, COLLECTIONS.EXPENSES), expense.id);
        batch.set(expRef, {
            ...expense,
            createdAt: serverTimestamp(),
        });
    }

    await batch.commit();
}

/**
 * Mark expense paid
 */
export async function payExpense(businessId: string, expenseId: string) {
    const expRef = doc(db, COLLECTIONS.BUSINESSES, businessId, COLLECTIONS.EXPENSES, expenseId);
    await updateDoc(expRef, {
        paidAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
    });
}
