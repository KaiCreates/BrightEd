/**
 * BrightEd Economy Engine — Net Worth & Valuation
 * Converts business assets and performance into a rolling valuation.
 */

import { BusinessState, MarketState } from './economy-types';
import { calculatePortfolioValue } from './stock-market';
import { getToolValue } from './business-tools';

export interface NetWorthBreakdown {
    cash: number;
    inventory: number;
    tools: number;
    stockHoldings: number;
    netWorth: number;
    valuation: number;
}

export function calculateInventoryValue(inventory: Record<string, number>, marketState?: MarketState): number {
    if (!inventory || !marketState?.items?.length) return 0;
    const priceMap = new Map(marketState.items.map((item) => [item.id, item.price]));

    return Object.entries(inventory).reduce((sum, [itemId, qty]) => {
        const unitPrice = priceMap.get(itemId) ?? 0;
        return sum + unitPrice * (qty || 0);
    }, 0);
}

export function getNetWorthSnapshot(business: BusinessState): NetWorthBreakdown {
    const cash = business.cashBalance ?? 0;
    const inventory = calculateInventoryValue(business.inventory || {}, business.marketState);
    const tools = getToolValue(business.ownedTools);
    const stockHoldings = calculatePortfolioValue(business.stockMarket, business.stockPortfolio);

    const netWorth = Math.round(cash + inventory + tools + stockHoldings);

    const reputationMultiplier = 0.9 + Math.min(0.6, (business.reputation || 0) / 100);
    const satisfactionMultiplier = 0.9 + Math.min(0.3, (business.customerSatisfaction || 0) / 100);
    const momentumMultiplier = 1 + Math.min(0.4, (business.ordersCompleted || 0) / 200);

    const valuation = Math.round(netWorth * reputationMultiplier * satisfactionMultiplier * momentumMultiplier);

    return {
        cash,
        inventory,
        tools,
        stockHoldings,
        netWorth,
        valuation,
    };
}
