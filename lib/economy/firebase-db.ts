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
    writeBatch,
    runTransaction,
    arrayUnion
} from 'firebase/firestore';
import {
    BusinessState,
    Order,
    Expense,
    BusinessType,
    Review
} from './economy-types';

const COLLECTIONS = {
    BUSINESSES: 'businesses',
    ORDERS: 'orders',
    EXPENSES: 'expenses',
};

function getDefaultMarketItems() {
    return [
        { id: 'rice_5kg', name: 'Premium Rice (5kg)', price: 25, stock: 120, maxStock: 120, image: '/products/Rice.png', icon: '🍚' },
        { id: 'flour_2kg', name: 'All-Purpose Flour', price: 12, stock: 160, maxStock: 160, image: '/products/Flour.png', icon: '🌾' },
        { id: 'oil_1l', name: 'Vegetable Oil', price: 20, stock: 90, maxStock: 90, image: '/products/CookingOil.png', icon: '🛢️' },
        { id: 'dish_soap', name: 'Sparkle Dish Soap', price: 9, stock: 200, maxStock: 200, image: '/products/DishSoap.png', icon: '🧼' },
        { id: 'tissue_4pk', name: 'Soft Tissue Pack', price: 14, stock: 140, maxStock: 140, image: '/products/toilet_paper.png', icon: '🧻' },
        { id: 'plantain_chips', name: 'Crunchy Chips', price: 6, stock: 300, maxStock: 300, image: '/products/PlantainChips.png', icon: '🍌' },
        { id: 'sugar_1kg', name: 'Cane Sugar', price: 15, stock: 140, maxStock: 140, image: '/products/Surgar.png', icon: '🍬' },
        { id: 'cole_cold', name: 'Cole Cold', price: 8, stock: 240, maxStock: 240, image: '/products/Cole_Cold_copy.png', icon: '🥤' },
        { id: 'fries_pack', name: 'Frozen Fries', price: 10, stock: 180, maxStock: 180, image: '/products/Fries.png', icon: '🍟' },
        { id: 'peppers_fresh', name: 'Fresh Peppers', price: 5, stock: 150, maxStock: 150, image: '/products/Peppers.jpg', icon: '🌶️' },
        { id: 'salt_pack', name: 'Sea Salt', price: 4, stock: 240, maxStock: 240, image: '/products/Salt.png', icon: '🧂' },
    ];
}

export async function ensureMarketRestock(businessId: string) {
    const bizRef = doc(db, COLLECTIONS.BUSINESSES, businessId);

    try {
        const snap = await getDoc(bizRef);
        if (!snap.exists()) return { restocked: false };

        const data: any = snap.data();
        const marketState = data.marketState ?? { lastRestock: '', nextRestock: '', items: [] };

        const now = Date.now();
        const nextRestockMs = marketState?.nextRestock ? new Date(marketState.nextRestock).getTime() : 0;

        if (nextRestockMs && now < nextRestockMs) {
            return { restocked: false, nextRestock: marketState.nextRestock };
        }

        const defaults = getDefaultMarketItems();
        const items = marketState?.items && marketState.items.length > 0 ? marketState.items : defaults;

        const mergedItems = items.map((item: any) => {
            const def = defaults.find((d) => d.id === item.id);
            const mergedMax = Math.max(item.maxStock ?? 0, def?.maxStock ?? 0);
            return {
                ...def,
                ...item,
                image: item.image ?? def?.image,
                icon: item.icon ?? def?.icon,
                maxStock: mergedMax,
                stock: mergedMax,
            };
        });

        const missingDefaults = defaults.filter((d) => !mergedItems.some((i: any) => i.id === d.id));
        const newItems = [...mergedItems, ...missingDefaults];

        const nextRestock = new Date(now + 5 * 60 * 1000).toISOString();

        await updateDoc(bizRef, {
            marketState: {
                lastRestock: new Date(now).toISOString(),
                nextRestock,
                items: newItems,
            },
            updatedAt: serverTimestamp(),
        });

        return { restocked: true, nextRestock };
    } catch (e) {
        console.error("Market restock failed:", e);
        return { restocked: false };
    }
}

// ============================================================================
// BUSINESS PROFILE
// ============================================================================

/**
 * Create a new business with economy profile
 */
export async function createEconomyBusiness(
    userId: string,
    businessName: string,
    businessType: BusinessType,
    branding?: {
        themeColor?: string;
        logoUrl?: string;
        icon?: string;
    }
): Promise<string> {
    const businessRef = doc(collection(db, COLLECTIONS.BUSINESSES));
    const businessId = businessRef.id;

    // Sanitize branding to remove undefined values (Firestore doesn't like them)
    const cleanBranding = branding ? Object.fromEntries(
        Object.entries(branding).filter(([_, v]) => v !== undefined)
    ) : {};

    const initialState: BusinessState = {
        id: businessId,
        playerId: userId,
        businessTypeId: businessType.id,
        businessName,

        branding: cleanBranding,

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

        // Workforce
        employees: [],

        // Inventory & Market
        inventory: {},
        marketState: {
            items: [],
            lastRestock: new Date().toISOString(),
            nextRestock: new Date(Date.now() + 300000).toISOString()
        },

        // Recruitment
        recruitmentPool: [],
        lastRecruitmentTime: new Date().toISOString(),

        // Payroll
        lastPayrollTime: new Date().toISOString(),

        // Reviews
        reviews: [],

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
    // We use a batch to ensure the business is created AND the user record is updated atomically
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', userId);

    batch.set(businessRef, {
        ownerId: userId, // For permission query
        ...initialState,
        branding: cleanBranding,
        employees: [{
            id: `emp_${Date.now()}`,
            name: `${userRef.id.slice(0, 5)} Manager`,
            role: 'manager',
            salaryPerDay: businessType.operatingCosts.staffPerHour ? (businessType.operatingCosts.staffPerHour * 8) : 200,
            stats: { speed: 50, quality: 50, morale: 100 },
            unpaidWages: 0,
            hiredAt: new Date().toISOString()
        }],
        marketState: {
            lastRestock: new Date().toISOString(),
            nextRestock: new Date(Date.now() + 300000).toISOString(),
            items: []
        },
        recruitmentPool: [],
        lastRecruitmentTime: new Date().toISOString(),
        lastPayrollTime: new Date().toISOString(),
        reviews: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Keep compatible with legacy fields
        name: businessName,
        balance: businessType.startingCapital,
        valuation: businessType.startingCapital, // Simple valuation start
        status: 'active',
    });

    batch.update(userRef, {
        hasBusiness: true,
        businessID: businessId,
        xp: increment(100) // Bonus for starting a venture
    });

    await batch.commit();

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
        branding: data.branding ?? {},
        operatingHours: data.operatingHours ?? { open: 8, close: 20 },
        staffCount: data.staffCount ?? 1,
        maxConcurrentOrders: data.maxConcurrentOrders ?? 3,
        inventory: data.inventory ?? {},
        employees: data.employees ?? [],
        marketState: data.marketState ?? { items: [], lastRestock: '', nextRestock: '' },
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
}

/**
 * Update business financials
 */
export async function updateBusinessFinancials(
    businessId: string,
    updates: {
        cashBalance?: number;
        cashDelta?: number;
        reputation?: number;
        reputationDelta?: number;
        customerSatisfactionDelta?: number;
        ordersCompleted?: number;
        ordersCompletedDelta?: number;
        ordersFailed?: number;
        ordersFailedDelta?: number;
        inventory?: Record<string, number>;
        inventoryDeltas?: Record<string, number>;
        lastPayrollTime?: string;
        reviews?: any[];
        newReview?: Review;
        newReviews?: Review[];
        totalRevenue?: number;
        totalRevenueDelta?: number;
        totalExpenses?: number;
        totalExpensesDelta?: number;
    }
) {
    const docRef = doc(db, COLLECTIONS.BUSINESSES, businessId);

    const firestoreUpdates: any = {
        updatedAt: serverTimestamp(),
    };

    // Prefer atomic deltas when provided (prevents stale state overwrites)
    if (updates.cashDelta !== undefined) {
        firestoreUpdates.balance = increment(updates.cashDelta);
        firestoreUpdates.cashBalance = increment(updates.cashDelta);
    } else if (updates.cashBalance !== undefined) {
        firestoreUpdates.balance = updates.cashBalance;
        firestoreUpdates.cashBalance = updates.cashBalance;
    }

    if (updates.totalRevenueDelta !== undefined) {
        firestoreUpdates.totalRevenue = increment(updates.totalRevenueDelta);
    } else if (updates.totalRevenue !== undefined) {
        firestoreUpdates.totalRevenue = updates.totalRevenue;
    }

    if (updates.totalExpensesDelta !== undefined) {
        firestoreUpdates.totalExpenses = increment(updates.totalExpensesDelta);
    } else if (updates.totalExpenses !== undefined) {
        firestoreUpdates.totalExpenses = updates.totalExpenses;
    }

    if (updates.reputationDelta !== undefined) {
        firestoreUpdates.reputation = increment(updates.reputationDelta);
    } else if (updates.reputation !== undefined) {
        firestoreUpdates.reputation = updates.reputation;
    }

    if (updates.customerSatisfactionDelta !== undefined) {
        firestoreUpdates.customerSatisfaction = increment(updates.customerSatisfactionDelta);
    }

    if (updates.ordersCompletedDelta !== undefined) {
        firestoreUpdates.ordersCompleted = increment(updates.ordersCompletedDelta);
    } else if (updates.ordersCompleted !== undefined) {
        firestoreUpdates.ordersCompleted = updates.ordersCompleted;
    }

    if (updates.ordersFailedDelta !== undefined) {
        firestoreUpdates.ordersFailed = increment(updates.ordersFailedDelta);
    } else if (updates.ordersFailed !== undefined) {
        firestoreUpdates.ordersFailed = updates.ordersFailed;
    }

    if (updates.newReviews !== undefined && updates.newReviews.length > 0) {
        firestoreUpdates.reviews = arrayUnion(...updates.newReviews);
        firestoreUpdates.reviewCount = increment(updates.newReviews.length);
    } else if (updates.newReview !== undefined) {
        firestoreUpdates.reviews = arrayUnion(updates.newReview);
        firestoreUpdates.reviewCount = increment(1);
    } else if (updates.reviews !== undefined) {
        firestoreUpdates.reviews = updates.reviews;
    }

    if (updates.inventoryDeltas !== undefined) {
        for (const [itemId, delta] of Object.entries(updates.inventoryDeltas)) {
            firestoreUpdates[`inventory.${itemId}`] = increment(delta);
        }
    } else if (updates.inventory !== undefined) {
        firestoreUpdates.inventory = updates.inventory;
    }

    if (updates.lastPayrollTime !== undefined) firestoreUpdates.lastPayrollTime = updates.lastPayrollTime;

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
