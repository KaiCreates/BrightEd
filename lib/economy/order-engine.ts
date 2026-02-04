/**
 * BrightEd Economy Engine — Order Generation & Management
 * Generates orders based on demand, manages fulfillment lifecycle.
 */

import {
    Order,
    OrderItem,
    OrderStatus,
    CustomerType,
    PaymentTerms,
    QualityTier,
    DemandConfig,
    BusinessState,
    ProductTemplate,
    BusinessType,
} from './economy-types';
import { getBusinessType } from './business-templates';
import { generateOrderNarrative, generateConsequenceMessage } from './order-narratives';
import { CustomerProfile, updateCustomerLoyalty, calculateLoyaltyBonus, createCustomerProfile } from './loyalty-system';

// ============================================================================
// ORDER GENERATION
// ============================================================================

/**
 * Generate a unique ID
 */
function generateId(): string {
    return `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Customer name generator for order immersion
 */
const FIRST_NAMES = [
    'Marcus', 'Keisha', 'Andre', 'Diana', 'Tristan', 'Aaliyah', 'Jerome', 'Tanya',
    'Devon', 'Simone', 'Kareem', 'Nadia', 'Dwayne', 'Camille', 'Rashid', 'Zara',
    'Tyrone', 'Jasmine', 'Kwame', 'Nicole', 'Jamal', 'Monique', 'Cedric', 'Latoya',
];

const LAST_NAMES = [
    'Williams', 'Johnson', 'Baptiste', 'Mohammed', 'Singh', 'Chen', 'Ramjohn',
    'Thompson', 'Garcia', 'Lewis', 'Brown', 'Davis', 'Joseph', 'Pierre', 'Ali',
];

function randomCustomerName(): string {
    const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const honorific = Math.random() > 0.8 ? (Math.random() > 0.5 ? 'Mr.' : 'Ms.') : '';
    return `${honorific} ${first} ${last}`.trim();
}

/**
 * Calculate demand multiplier for current hour
 */
function getHourlyDemandMultiplier(config: DemandConfig, hour: number): number {
    return config.hourlyMultipliers[hour] ?? 0.5;
}

/**
 * Calculate market saturation multiplier (diminishing returns)
 * Dampens demand as balance grows to prevent runaway wealth.
 */
function getSaturationMultiplier(balance: number): number {
    if (balance <= 10000) return 1.0;

    // Scale from 1.0 at 10k down to 0.4 at 1M
    const reductionRange = 1000000 - 10000;
    const excess = Math.max(0, balance - 10000);
    const reduction = Math.min(0.6, (excess / reductionRange) * 0.6);

    return 1.0 - reduction;
}

/**
 * Calculate reputation multiplier
 */
function getReputationMultiplier(config: DemandConfig, reputation: number): number {
    // reputation is 0-100, normalize to 0-1
    const normalized = reputation / 100;
    const range = config.reputationCeiling - config.reputationFloor;
    return config.reputationFloor + (normalized * range);
}

/**
 * Randomly select customer type based on probabilities
 */
function selectCustomerType(config: DemandConfig): CustomerType {
    const roll = Math.random();
    let cumulative = 0;
    for (const [type, prob] of Object.entries(config.customerTypeProbabilities)) {
        cumulative += prob;
        if (roll <= cumulative) return type as CustomerType;
    }
    return 'walk_in';
}

/**
 * Select random products for an order
 */
function selectOrderItems(
    products: ProductTemplate[],
    avgItems: number,
    qualityTier: QualityTier,
    inventory: Record<string, number> = {}
): OrderItem[] {
    // Determine number of items (weighted toward avgItems)
    const itemCount = Math.max(1, Math.round(avgItems + (Math.random() - 0.5) * 2));

    const items: OrderItem[] = [];
    const availableProducts = [...products];

    for (let i = 0; i < itemCount && availableProducts.length > 0; i++) {
        // Selection weights: items in stock are 5x more likely to be picked
        const weightedProducts = availableProducts.map(p => {
            const hasStock = (inventory[p.inventoryItemId || ''] || 0) > 0;
            return { product: p, weight: hasStock ? 5 : 1 };
        });

        const totalWeight = weightedProducts.reduce((acc, p) => acc + p.weight, 0);
        let roll = Math.random() * totalWeight;
        let selectedIdx = 0;

        for (let j = 0; j < weightedProducts.length; j++) {
            roll -= weightedProducts[j].weight;
            if (roll <= 0) {
                selectedIdx = j;
                break;
            }
        }

        const product = availableProducts[selectedIdx];

        // Quantity varies by product type
        const quantity = product.baseTimeMinutes < 10
            ? Math.floor(Math.random() * 3) + 1  // Quick items: 1-3
            : 1;  // Slow items: 1

        items.push({
            productId: product.id,
            productName: product.name,
            quantity,
            pricePerUnit: product.basePrice,
            costPerUnit: product.baseCost,
            qualityTier,
        });

        // Remove to avoid duplicates
        availableProducts.splice(selectedIdx, 1);
    }

    return items;
}

/**
 * Calculate order total and cost
 */
function calculateOrderTotals(items: OrderItem[]): { total: number; cost: number } {
    let total = 0;
    let cost = 0;
    for (const item of items) {
        total += item.pricePerUnit * item.quantity;
        cost += item.costPerUnit * item.quantity;
    }
    return { total, cost };
}

/**
 * Generate deadline based on business type
 */
function generateDeadline(businessType: BusinessType, items: OrderItem[]): string {
    let baseMinutes = 30;

    // Sum required time for items
    let requiredTime = 0;
    for (const item of items) {
        const product = businessType.products.find((p: ProductTemplate) => p.id === item.productId);
        if (product) {
            requiredTime += product.baseTimeMinutes * item.quantity;
        }
    }

    // Deadline = required time + buffer
    switch (businessType.category) {
        case 'service':
            baseMinutes = requiredTime + 15; // Appointment style
            break;
        case 'retail':
            baseMinutes = 5; // Immediate
            break;
        case 'food':
            baseMinutes = requiredTime + 10; // Quick turnaround
            break;
        case 'digital':
            baseMinutes = 60 * 24 * 3; // 3 days for projects
            break;
    }

    const deadline = new Date(Date.now() + baseMinutes * 60 * 1000);
    return deadline.toISOString();
}

/**
 * Generate payment terms based on customer type
 */
function generatePaymentTerms(customerType: CustomerType, businessCategory: string): PaymentTerms {
    if (customerType === 'business') {
        // Business customers often pay on terms
        return {
            type: 'net_days',
            netDays: 7,
            collectionRisk: 0.1,
        };
    }

    if (businessCategory === 'digital') {
        // Digital projects: milestone payments
        return {
            type: 'milestone',
            upfrontPercent: 30,
            collectionRisk: 0.05,
        };
    }

    // Most retail/food/service: immediate
    return {
        type: 'immediate',
        collectionRisk: 0,
    };
}

/**
 * Generate a single order with narrative context
 */
export function generateOrder(
    businessType: BusinessType,
    businessState: BusinessState,
    simHour: number,
    customerProfiles?: Map<string, CustomerProfile>
): Order {
    const config = businessType.demandConfig;

    // Select customer
    const customerType = selectCustomerType(config);
    const customerName = randomCustomerName();
    const customerId = `cust_${Math.random().toString(36).slice(2, 10)}`;

    // Check if returning customer
    const existingCustomer = customerProfiles?.get(customerId);
    const isReturning = existingCustomer && existingCustomer.totalOrders > 0;

    // Quality tier based on reputation and customer
    let qualityTier: QualityTier = 'standard';
    if (customerType === 'vip' || (customerType === 'business' && Math.random() > 0.5)) {
        qualityTier = 'premium';
    } else if (businessState.reputation < 30 || customerType === 'walk_in') {
        qualityTier = Math.random() > 0.7 ? 'standard' : 'basic';
    }

    // Select items (stock-aware)
    const items = selectOrderItems(businessType.products, config.avgItemsPerOrder, qualityTier, businessState.inventory);
    const { total, cost } = calculateOrderTotals(items);

    // Apply loyalty bonus if returning customer
    let finalTotal = total;
    if (existingCustomer && existingCustomer.loyaltyScore > 0) {
        const { newTotal } = calculateLoyaltyBonus(total, existingCustomer.loyaltyScore);
        finalTotal = newTotal;
    }

    // Generate deadline and expiry
    const deadline = generateDeadline(businessType, items);
    const expiryMinutes = businessType.category === 'digital' ? 60 * 4 : 10; // 4hrs or 10min
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

    // Payment terms
    const paymentTerms = generatePaymentTerms(customerType, businessType.category);

    // Customer mood
    const moods: Order['customerMood'][] = ['happy', 'neutral', 'neutral', 'impatient'];
    if (customerType === 'vip') moods.push('demanding');
    const customerMood = moods[Math.floor(Math.random() * moods.length)];

    // Loyalty level
    let loyaltyLevel: Order['loyaltyLevel'] = 'new';
    if (existingCustomer) {
        if (existingCustomer.loyaltyScore >= 50) loyaltyLevel = 'loyal';
        else if (existingCustomer.loyaltyScore >= 25) loyaltyLevel = 'regular';
    }

    const order: Order = {
        id: generateId(),
        businessId: businessState.id,
        customerId,
        customerName,
        customerType,
        customerMood,
        items,
        totalAmount: finalTotal,
        costAmount: cost,
        status: 'pending',
        deadline,
        expiresAt,
        paymentTerms,
        paidAmount: 0,
        tipAmount: 0,
        qualityRequirement: qualityTier,
        loyaltyLevel,
        createdAt: new Date().toISOString(),
    };

    // Generate narrative context
    const narrative = generateOrderNarrative(order, businessType.category);
    (order as any).narrative = narrative.context;
    (order as any).narrativeData = narrative;

    return order;
}

/**
 * Generate orders for current tick based on demand
 */
export function generateOrdersForTick(
    businessType: BusinessType,
    businessState: BusinessState,
    simHour: number,
    activeOrderCount: number, // Total current orders (pending + accepted + in_progress)
    tickMinutes: number = 15,
    customerProfiles?: Map<string, CustomerProfile>
): Order[] {
    const config = businessType.demandConfig;
    const maxCap = config.maxConcurrentCustomers || config.maxConcurrentOrders;

    // 1. CAPACITY CAPS (e.g., 50 for Mini Mart)
    if (activeOrderCount >= maxCap) {
        return [];
    }

    // 2. STOCK GRAVITATION LOGIC
    // Customers only gravitate if the business has inventory for what they want.
    const productsInStock = businessType.products.filter(p =>
        !p.requiresInventory || (businessState.inventory?.[p.inventoryItemId || ''] || 0) > 0
    ).length;

    // Scale demand by % of catalog in stock.
    // FIX: Ensure new businesses with minimal stock still get "browsing" traffic or basic demand.
    // Minimum 0.2 (20%) traffic even with 0 stock to allow "lost sales" feedback.
    const stockRatio = productsInStock / Math.max(1, businessType.products.length);
    const stockMultiplier = Math.max(0.2, stockRatio);

    // 3. DEMAND CALCULATION
    const hourlyMultiplier = getHourlyDemandMultiplier(config, simHour);

    // FIX: Boost low reputation floor to ensure new businesses get a chance
    const repMultiplier = Math.max(0.5, getReputationMultiplier(config, businessState.reputation));

    const satisfaction = businessState.customerSatisfaction ?? 70;
    const satisfactionMultiplier = Math.max(0.9, Math.min(1.8, satisfaction / 60));

    const saturationMultiplier = getSaturationMultiplier(businessState.cashBalance);

    // Theoretical 1M Market Pool influence
    // FIX: Ensure baseRate is never effectively zero due to multipliers
    const baseRate = Math.max(2, config.baseOrdersPerHour) * (tickMinutes / 60);
    const attentionBoost = activeOrderCount === 0 ? 1.75 : activeOrderCount < maxCap * 0.4 ? 1.35 : 1;
    const expectedOrders = baseRate
        * hourlyMultiplier
        * repMultiplier
        * satisfactionMultiplier
        * saturationMultiplier
        * stockMultiplier
        * attentionBoost;

    const minFlow = activeOrderCount === 0 ? 1.1 : 0.6;
    const adjustedExpectedOrders = Math.max(expectedOrders, minFlow);

    // 4. GENERATION
    const orders: Order[] = [];
    let remaining = adjustedExpectedOrders;

    while (remaining > 0 && orders.length < 10) {
        if (Math.random() < remaining) {
            if (activeOrderCount + orders.length < maxCap) {
                const newOrder = generateOrder(businessType, businessState, simHour, customerProfiles);
                if (newOrder.items.length > 0) {
                    orders.push(newOrder);
                }
            }
        }
        remaining -= 1;
    }

    return orders;
}

// ============================================================================
// ORDER LIFECYCLE
// ============================================================================

/**
 * Accept an order - player commits to fulfill it
 */
export function acceptOrder(order: Order): Order {
    if (order.status !== 'pending') {
        throw new Error(`Cannot accept order in status: ${order.status}`);
    }

    return {
        ...order,
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
    };
}

/**
 * Reject/Cancel an order
 */
export function rejectOrder(order: Order): { order: Order; reputationPenalty: number } {
    const isAccepted = order.status === 'accepted' || order.status === 'in_progress';

    // VIP and business customers remember rejections
    let penalty = isAccepted ? 3 : 0.5;

    // Grace: Rejecting small pending orders is free
    if (!isAccepted && order.totalAmount < 50) {
        penalty = 0;
    }

    if (order.customerType === 'vip') penalty *= 1.5;
    if (order.customerType === 'business') penalty *= 1.2;

    return {
        order: { ...order, status: 'cancelled' },
        reputationPenalty: Math.ceil(penalty),
    };
}

/**
 * Start working on an order
 */
export function startOrder(order: Order): Order {
    if (order.status !== 'accepted') {
        throw new Error(`Cannot start order in status: ${order.status}`);
    }

    return {
        ...order,
        status: 'in_progress',
        startedAt: new Date().toISOString(),
    };
}

/**
 * Generate a customer review based on quality score
 */
export function generateReview(
    order: Order,
    qualityScore: number,
    failureReason?: string
): { rating: number; text: string } {
    const isSuccess = !failureReason;

    // Rating calculation (1-5 star)
    let rating = 3;
    if (isSuccess) {
        rating = Math.ceil((qualityScore / 100) * 5);
        if (qualityScore > 95) rating = 5;
        if (qualityScore < 40) rating = 2;
    } else {
        rating = failureReason === 'deadline_missed' ? 1 : 2;
    }

    // Caribbean-flavored review fragments
    const praise = [
        "Quality was real nice!", "Proper service, highly recommend.",
        "Best in town for sure.", "Very impressed with the speed.",
        "Everything was sweet!", "Top tier vibes."
    ];
    const neutral = [
        "It was okay.", "Got what I paid for.", "Could be better but not bad.",
        "Average service.", "Fine for now."
    ];
    const complaints = [
        "Took way too long.", "Service was poor man.", "Quality not like before.",
        "Real disappointed.", "Waste of my time.", "Wouldn't come back."
    ];

    let text = "";
    if (rating >= 4) text = praise[Math.floor(Math.random() * praise.length)];
    else if (rating === 3) text = neutral[Math.floor(Math.random() * neutral.length)];
    else text = complaints[Math.floor(Math.random() * complaints.length)];

    if (failureReason === 'deadline_missed') text = "Wait all day and nothing! Terrible.";
    if (failureReason === 'stockout') text = "They never have anything in stock.";

    // Loyalty bonus to text
    if (order.loyaltyLevel === 'loyal' && rating >= 4) text += " Always my go-to spot.";

    return { rating, text };
}

/**
 * Complete an order with quality score and loyalty tracking
 */
export function completeOrder(
    order: Order,
    qualityScore: number, // 0-100
    businessType?: BusinessType, // Optional, but needed for inventory deduction
    customerProfile?: CustomerProfile // Optional, for loyalty tracking
): { 
    order: Order; 
    payment: number; 
    tip: number; 
    inventoryDeductions: Record<string, number>; 
    review: { rating: number; text: string };
    loyaltyUpdate?: {
        customerId: string;
        oldScore: number;
        newScore: number;
        change: number;
        tierChanged: boolean;
        message: string;
    };
} {
    if (order.status !== 'in_progress' && order.status !== 'accepted') {
        throw new Error(`Cannot complete order in status: ${order.status}`);
    }

    // Check if on time
    const deadline = new Date(order.deadline);
    const now = new Date();
    const onTime = now <= deadline;

    // Calculate payment based on quality
    let paymentPercent = 1.0;
    let tip = 0;

    // Quality thresholds
    const qualityThresholds = {
        basic: 40,
        standard: 60,
        premium: 80,
    };

    const requiredQuality = qualityThresholds[order.qualityRequirement];

    if (qualityScore < requiredQuality * 0.5) {
        // Very poor: 50% payment
        paymentPercent = 0.5;
    } else if (qualityScore < requiredQuality) {
        // Below requirement: proportional payment
        paymentPercent = 0.5 + (qualityScore / requiredQuality) * 0.5;
    } else if (qualityScore > 90) {
        // Excellent: full payment + tip
        tip = Math.round(order.totalAmount * 0.15);
    }

    const payment = Math.round(order.totalAmount * paymentPercent);

    // Calculate inventory deductions
    const inventoryDeductions: Record<string, number> = {};
    if (businessType) {
        order.items.forEach(item => {
            const product = businessType.products.find(p => p.id === item.productId);
            if (product?.requiresInventory && product.inventoryItemId) {
                const deduction = (product.inventoryPerUnit || 1) * item.quantity;
                inventoryDeductions[product.inventoryItemId] = (inventoryDeductions[product.inventoryItemId] || 0) + deduction;
            }
        });
    }

    const review = generateReview(order, qualityScore);

    // Update customer loyalty
    let loyaltyUpdate;
    if (customerProfile) {
        const result = updateCustomerLoyalty(
            customerProfile,
            order.id,
            qualityScore,
            onTime,
            order.totalAmount
        );

        loyaltyUpdate = {
            customerId: customerProfile.id,
            oldScore: customerProfile.loyaltyScore,
            newScore: result.updatedCustomer.loyaltyScore,
            change: result.loyaltyChange,
            tierChanged: result.tierChanged,
            message: result.message,
        };

        // Generate consequence message if narrative exists
        if ((order as any).narrativeData) {
            const consequenceMsg = generateConsequenceMessage(
                (order as any).narrativeData,
                qualityScore,
                onTime,
                result.loyaltyChange
            );
            (order as any).consequenceMessage = consequenceMsg;
        }
    }

    return {
        order: {
            ...order,
            status: 'completed',
            completedAt: new Date().toISOString(),
            qualityDelivered: qualityScore,
            paidAmount: payment,
            tipAmount: tip,
            isCollected: true,
            collectedAt: new Date().toISOString(),
        },
        payment,
        tip,
        inventoryDeductions,
        review,
        loyaltyUpdate,
    };
}

/**
 * Fail an order with reason
 */
export function failOrder(
    order: Order,
    reason: 'deadline_missed' | 'stockout' | 'cancelled_by_business'
): { order: Order; refund: number; reputationPenalty: number; review: { rating: number; text: string } } {
    let refund = 0;
    let penalty = 10;

    switch (reason) {
        case 'deadline_missed':
            refund = order.paidAmount; // Full refund of any upfront
            penalty = 12; // Reduced from 20
            break;
        case 'stockout':
            refund = order.paidAmount;
            penalty = 8; // Reduced from 15
            break;
        case 'cancelled_by_business':
            refund = order.paidAmount;
            penalty = 3; // Reduced from 5
            break;
    }

    // Scale penalty by order size (Severity)
    // Small orders (< 50) have reduced impact (Grace Threshold)
    if (order.totalAmount < 50) {
        penalty = Math.ceil(penalty * 0.5);
    }
    // Massive orders (> 1000) have higher stakes
    else if (order.totalAmount > 1000) {
        penalty = Math.ceil(penalty * 1.25);
    }

    // Customer Type scaling
    if (order.customerType === 'vip') penalty = Math.ceil(penalty * 1.5);
    if (order.customerType === 'business') penalty = Math.ceil(penalty * 1.2);

    const review = generateReview(order, 0, reason);

    return {
        order: {
            ...order,
            status: 'failed',
            failedAt: new Date().toISOString(),
        },
        refund,
        reputationPenalty: Math.round(penalty),
        review
    };
}

/**
 * Check for expired pending orders
 */
export function checkExpiredOrders(orders: Order[]): { expired: Order[]; active: Order[] } {
    const now = new Date();
    const expired: Order[] = [];
    const active: Order[] = [];

    for (const order of orders) {
        if (order.status === 'pending' && new Date(order.expiresAt) < now) {
            expired.push({ ...order, status: 'expired' });
        } else {
            active.push(order);
        }
    }

    return { expired, active };
}

/**
 * Check for orders past deadline
 */
export function checkOverdueOrders(orders: Order[]): { overdue: Order[]; onTime: Order[] } {
    const now = new Date();
    const overdue: Order[] = [];
    const onTime: Order[] = [];

    for (const order of orders) {
        if (
            (order.status === 'accepted' || order.status === 'in_progress') &&
            new Date(order.deadline) < now
        ) {
            overdue.push(order);
        } else {
            onTime.push(order);
        }
    }

    return { overdue, onTime };
}

// ============================================================================
// PAYMENT COLLECTION
// ============================================================================

/**
 * Process payments that are due (for net_days terms)
 */
export function collectDuePayments(
    orders: Order[],
    currentDate: Date
): { collected: number; uncollected: Order[]; failedCollections: Order[] } {
    let collected = 0;
    const uncollected: Order[] = [];
    const failedCollections: Order[] = [];

    for (const order of orders) {
        if (order.status !== 'completed') continue;
        if (order.paidAmount <= 0) continue;

        // Skip anything already marked as collected
        if ((order as any).isCollected) continue;

        if (order.paymentTerms.type === 'net_days' && order.paymentTerms.netDays) {
            const completedDate = new Date(order.completedAt!);
            const dueDate = new Date(completedDate.getTime() + order.paymentTerms.netDays * 24 * 60 * 60 * 1000);

            if (currentDate >= dueDate) {
                // Check collection risk
                const risk = order.paymentTerms.collectionRisk ?? 0;
                if (Math.random() > risk) {
                    collected += order.paidAmount;
                } else {
                    failedCollections.push(order);
                }
            } else {
                uncollected.push(order);
            }
        }
    }

    return { collected, uncollected, failedCollections };
}
