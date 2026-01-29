/**
 * BrightEd Economy Engine — Customer Loyalty System
 * Tracks customer relationships and provides tier-based rewards
 */

export interface CustomerProfile {
    id: string;
    name: string;
    loyaltyScore: number; // 0-100
    currentTier: number; // 0-4
    lastOrderDate: string;
    totalOrders: number;
    lifetimeValue: number;
    preferences: string[]; // Product IDs they prefer
    history: Array<{
        orderId: string;
        date: string;
        quality: number;
        onTime: boolean;
    }>;
}

export interface LoyaltyTier {
    tier: number;
    minScore: number;
    name: string;
    marginBonus: number; // Percentage bonus (0.05 = 5%)
    benefits: string[];
    unlockMessage: string;
    icon: string;
}

export const LOYALTY_TIERS: LoyaltyTier[] = [
    {
        tier: 0,
        minScore: 0,
        name: 'New Customer',
        marginBonus: 0,
        benefits: ['Standard pricing'],
        unlockMessage: 'Welcome! Build trust to unlock rewards.',
        icon: '👤',
    },
    {
        tier: 1,
        minScore: 25,
        name: 'Regular',
        marginBonus: 0.05,
        benefits: ['5% margin bonus', 'Priority notifications'],
        unlockMessage: 'Customer is becoming a regular!',
        icon: '⭐',
    },
    {
        tier: 2,
        minScore: 50,
        name: 'Loyal',
        marginBonus: 0.10,
        benefits: ['10% margin bonus', 'Priority scheduling', 'Exclusive products'],
        unlockMessage: 'Loyal customer unlocked!',
        icon: '💎',
    },
    {
        tier: 3,
        minScore: 75,
        name: 'VIP',
        marginBonus: 0.15,
        benefits: ['15% margin bonus', 'VIP treatment', 'Referral bonuses', 'Bulk discounts'],
        unlockMessage: 'VIP status achieved!',
        icon: '👑',
    },
    {
        tier: 4,
        minScore: 100,
        name: 'Elite Partner',
        marginBonus: 0.20,
        benefits: ['20% margin bonus', 'Guaranteed orders', 'Partnership perks', 'Premium support'],
        unlockMessage: 'Elite partnership established!',
        icon: '🏆',
    },
];

/**
 * Calculate loyalty score change based on service quality
 */
export function calculateLoyaltyChange(
    qualityScore: number, // 0-100
    onTime: boolean,
    previousScore: number
): { delta: number; reason: string } {
    let delta = 0;
    let reason = '';

    // Quality impact
    if (qualityScore >= 90) {
        delta += 15;
        reason = 'Excellent quality';
    } else if (qualityScore >= 75) {
        delta += 10;
        reason = 'Good quality';
    } else if (qualityScore >= 60) {
        delta += 5;
        reason = 'Acceptable quality';
    } else if (qualityScore >= 40) {
        delta -= 10;
        reason = 'Poor quality';
    } else {
        delta -= 20;
        reason = 'Very poor quality';
    }

    // Timing impact
    if (!onTime) {
        delta -= 10;
        reason += ', late delivery';
    }

    // Diminishing returns at high loyalty
    if (previousScore > 80) {
        delta = Math.round(delta * 0.7);
    }

    // Clamp to reasonable bounds
    delta = Math.max(-30, Math.min(20, delta));

    return { delta, reason };
}

/**
 * Get current loyalty tier for a score
 */
export function getLoyaltyTier(score: number): LoyaltyTier {
    // Find highest tier the score qualifies for
    for (let i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
        if (score >= LOYALTY_TIERS[i].minScore) {
            return LOYALTY_TIERS[i];
        }
    }
    return LOYALTY_TIERS[0];
}

/**
 * Update customer loyalty after order
 */
export function updateCustomerLoyalty(
    customer: CustomerProfile,
    orderId: string,
    qualityScore: number,
    onTime: boolean,
    orderValue: number
): {
    updatedCustomer: CustomerProfile;
    loyaltyChange: number;
    tierChanged: boolean;
    newTier?: LoyaltyTier;
    message: string;
} {
    const { delta, reason } = calculateLoyaltyChange(qualityScore, onTime, customer.loyaltyScore);

    const oldTier = getLoyaltyTier(customer.loyaltyScore);
    const newScore = Math.max(0, Math.min(100, customer.loyaltyScore + delta));
    const newTier = getLoyaltyTier(newScore);

    const tierChanged = oldTier.tier !== newTier.tier;

    const updatedCustomer: CustomerProfile = {
        ...customer,
        loyaltyScore: newScore,
        currentTier: newTier.tier,
        lastOrderDate: new Date().toISOString(),
        totalOrders: customer.totalOrders + 1,
        lifetimeValue: customer.lifetimeValue + orderValue,
        history: [
            ...customer.history.slice(-10), // Keep last 10
            {
                orderId,
                date: new Date().toISOString(),
                quality: qualityScore,
                onTime,
            },
        ],
    };

    let message = `${customer.name}: ${reason} (${delta > 0 ? '+' : ''}${delta} loyalty)`;
    if (tierChanged && newTier.tier > oldTier.tier) {
        message += ` - ${newTier.unlockMessage}`;
    }

    return {
        updatedCustomer,
        loyaltyChange: delta,
        tierChanged,
        newTier: tierChanged ? newTier : undefined,
        message,
    };
}

/**
 * Calculate loyalty decay over time (customers forget you if you don't serve them)
 */
export function applyLoyaltyDecay(
    customer: CustomerProfile,
    daysSinceLastOrder: number
): CustomerProfile {
    if (daysSinceLastOrder < 7) return customer; // No decay within a week

    // Decay rate: 1 point per week after first week
    const weeksInactive = Math.floor((daysSinceLastOrder - 7) / 7);
    const decay = Math.min(weeksInactive, customer.loyaltyScore);

    return {
        ...customer,
        loyaltyScore: Math.max(0, customer.loyaltyScore - decay),
        currentTier: getLoyaltyTier(customer.loyaltyScore - decay).tier,
    };
}

/**
 * Calculate margin bonus from loyalty
 */
export function calculateLoyaltyBonus(
    baseAmount: number,
    loyaltyScore: number
): { bonus: number; newTotal: number } {
    const tier = getLoyaltyTier(loyaltyScore);
    const bonus = Math.round(baseAmount * tier.marginBonus);

    return {
        bonus,
        newTotal: baseAmount + bonus,
    };
}

/**
 * Generate customer profile for new customer
 */
export function createCustomerProfile(
    customerId: string,
    customerName: string
): CustomerProfile {
    return {
        id: customerId,
        name: customerName,
        loyaltyScore: 0,
        currentTier: 0,
        lastOrderDate: new Date().toISOString(),
        totalOrders: 0,
        lifetimeValue: 0,
        preferences: [],
        history: [],
    };
}
