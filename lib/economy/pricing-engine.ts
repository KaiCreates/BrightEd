/**
 * BrightEd Economy Engine — Dynamic Pricing & Supply/Demand
 * Implements supply/demand curves and dynamic market pricing
 */

export interface SupplyDemandCurve {
    productId: string;
    basePrice: number;
    currentSupply: number;
    currentDemand: number;
    elasticity: number; // How sensitive price is to supply/demand changes (0-1)
    priceHistory: Array<{ timestamp: string; price: number }>;
}

export interface PriceCalculationResult {
    productId: string;
    price: number;
    priceChange: number;
    trend: 'rising' | 'falling' | 'stable';
    reason: string;
}

/**
 * Calculate price based on supply and demand
 * Price increases when demand > supply, decreases when supply > demand
 */
export function calculatePrice(curve: SupplyDemandCurve): number {
    const { basePrice, currentSupply, currentDemand, elasticity } = curve;

    // Avoid division by zero
    if (currentSupply === 0) return basePrice * 2; // Scarcity premium
    if (currentDemand === 0) return basePrice * 0.5; // Fire sale

    // Calculate supply/demand ratio
    const ratio = currentDemand / currentSupply;

    // Apply elasticity to dampen price swings
    // ratio > 1 means demand exceeds supply (price up)
    // ratio < 1 means supply exceeds demand (price down)
    const priceMultiplier = 1 + (ratio - 1) * elasticity;

    // Clamp to reasonable bounds (50% to 200% of base)
    const newPrice = basePrice * priceMultiplier;
    return Math.max(basePrice * 0.5, Math.min(basePrice * 2, newPrice));
}

/**
 * Update supply/demand curve with new values
 */
export function updateCurve(
    curve: SupplyDemandCurve,
    supplyDelta: number,
    demandDelta: number
): SupplyDemandCurve {
    const newSupply = Math.max(0, curve.currentSupply + supplyDelta);
    const newDemand = Math.max(0, curve.currentDemand + demandDelta);

    const newPrice = calculatePrice({
        ...curve,
        currentSupply: newSupply,
        currentDemand: newDemand,
    });

    return {
        ...curve,
        currentSupply: newSupply,
        currentDemand: newDemand,
        priceHistory: [
            ...curve.priceHistory.slice(-20), // Keep last 20 entries
            { timestamp: new Date().toISOString(), price: newPrice },
        ],
    };
}

/**
 * Calculate price trend from history
 */
export function calculateTrend(curve: SupplyDemandCurve): 'rising' | 'falling' | 'stable' {
    if (curve.priceHistory.length < 2) return 'stable';

    const recent = curve.priceHistory.slice(-5);
    const avgRecent = recent.reduce((sum, p) => sum + p.price, 0) / recent.length;

    const older = curve.priceHistory.slice(-10, -5);
    if (older.length === 0) return 'stable';

    const avgOlder = older.reduce((sum, p) => sum + p.price, 0) / older.length;

    const change = ((avgRecent - avgOlder) / avgOlder) * 100;

    if (change > 5) return 'rising';
    if (change < -5) return 'falling';
    return 'stable';
}

/**
 * Generate pricing result with explanation
 */
export function getPricingResult(curve: SupplyDemandCurve): PriceCalculationResult {
    const currentPrice = calculatePrice(curve);
    const basePrice = curve.basePrice;
    const priceChange = ((currentPrice - basePrice) / basePrice) * 100;
    const trend = calculateTrend(curve);

    let reason = '';
    const ratio = curve.currentDemand / Math.max(1, curve.currentSupply);

    if (ratio > 1.5) {
        reason = 'High demand, limited supply';
    } else if (ratio > 1.1) {
        reason = 'Demand exceeds supply';
    } else if (ratio < 0.7) {
        reason = 'Oversupply, low demand';
    } else if (ratio < 0.9) {
        reason = 'Supply exceeds demand';
    } else {
        reason = 'Balanced market conditions';
    }

    return {
        productId: curve.productId,
        price: Math.round(currentPrice),
        priceChange: Math.round(priceChange),
        trend,
        reason,
    };
}

/**
 * Simulate market demand based on time of day and reputation
 */
export function simulateMarketDemand(
    hour: number,
    reputation: number,
    baseMultiplier: number = 1.0
): number {
    // Time-based demand (peak hours: 12-14, 17-19)
    let timeMultiplier = 0.5;
    if (hour >= 12 && hour <= 14) timeMultiplier = 1.5;
    else if (hour >= 17 && hour <= 19) timeMultiplier = 1.3;
    else if (hour >= 8 && hour <= 11) timeMultiplier = 0.8;
    else if (hour >= 15 && hour <= 16) timeMultiplier = 0.7;

    // Reputation impact (0-100 -> 0.5-1.5 multiplier)
    const repMultiplier = 0.5 + (reputation / 100);

    return baseMultiplier * timeMultiplier * repMultiplier;
}

/**
 * Apply market event to supply/demand
 */
export interface MarketEventEffect {
    type: 'supply_shock' | 'demand_surge' | 'price_war' | 'competitor_entry';
    supplyMultiplier: number;
    demandMultiplier: number;
    duration: number; // hours
    description: string;
}

export const MARKET_EVENTS: Record<string, MarketEventEffect> = {
    supply_shortage: {
        type: 'supply_shock',
        supplyMultiplier: 0.5,
        demandMultiplier: 1.2,
        duration: 4,
        description: 'Supply chain disruption - limited stock available',
    },
    demand_surge: {
        type: 'demand_surge',
        supplyMultiplier: 1.0,
        demandMultiplier: 2.0,
        duration: 2,
        description: 'Unexpected demand spike - customers rushing in',
    },
    price_war: {
        type: 'price_war',
        supplyMultiplier: 1.5,
        demandMultiplier: 0.7,
        duration: 6,
        description: 'Competitor price war - market flooded with cheap goods',
    },
    competitor_entry: {
        type: 'competitor_entry',
        supplyMultiplier: 1.3,
        demandMultiplier: 0.8,
        duration: 8,
        description: 'New competitor entered market - demand split',
    },
};

/**
 * Apply market event effect to curve
 */
export function applyMarketEvent(
    curve: SupplyDemandCurve,
    event: MarketEventEffect
): SupplyDemandCurve {
    return {
        ...curve,
        currentSupply: Math.round(curve.currentSupply * event.supplyMultiplier),
        currentDemand: Math.round(curve.currentDemand * event.demandMultiplier),
    };
}
