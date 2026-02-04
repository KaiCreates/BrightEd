/**
 * BrightEd Economy Engine — Stock Market
 * Simulates a lightweight stock exchange for business trading.
 */

import {
    StockListingDefinition,
    StockMarketState,
    StockListingState,
    StockPortfolio,
    StockTransaction,
    StockHolding
} from './economy-types';

export type { StockListingState } from './economy-types';

export const DEFAULT_STOCK_LISTINGS: StockListingDefinition[] = [
    { symbol: 'BRT', name: 'Bright Logistics', sector: 'Logistics', basePrice: 120, volatility: 0.06 },
    { symbol: 'SUN', name: 'Sunspire Renewables', sector: 'Energy', basePrice: 80, volatility: 0.08 },
    { symbol: 'PULSE', name: 'Pulse Health Labs', sector: 'Health', basePrice: 95, volatility: 0.07 },
    { symbol: 'CASA', name: 'Casa Home Supply', sector: 'Retail', basePrice: 65, volatility: 0.05 },
    { symbol: 'NEX', name: 'Nexa Software', sector: 'Technology', basePrice: 150, volatility: 0.1 },
    { symbol: 'COAST', name: 'Coastal Foods', sector: 'Food', basePrice: 55, volatility: 0.06 },
];

export function initStockMarketState(now: Date = new Date()): StockMarketState {
    const nowIso = now.toISOString();
    return {
        lastTick: nowIso,
        listings: DEFAULT_STOCK_LISTINGS.map((listing) => ({
            ...listing,
            price: listing.basePrice,
            changePercent: 0,
            history: [{ at: nowIso, price: listing.basePrice }]
        }))
    };
}

export function initStockPortfolio(): StockPortfolio {
    return {
        cashReserved: 0,
        holdings: [],
        transactions: [],
        realizedPnL: 0
    };
}

function clampPrice(value: number): number {
    return Math.max(1, Math.round(value));
}

export function tickStockMarket(state: StockMarketState, now: Date = new Date()): StockMarketState {
    const nowIso = now.toISOString();
    const listings = state.listings.map((listing) => {
        const swing = (Math.random() * 2 - 1) * listing.volatility;
        const nextPrice = clampPrice(listing.price * (1 + swing));
        const changePercent = ((nextPrice - listing.price) / listing.price) * 100;
        const history = [...listing.history, { at: nowIso, price: nextPrice }].slice(-30);

        return {
            ...listing,
            price: nextPrice,
            changePercent: Math.round(changePercent * 10) / 10,
            history
        };
    });

    return {
        lastTick: nowIso,
        listings
    };
}

export function calculatePortfolioValue(market: StockMarketState | undefined, portfolio: StockPortfolio | undefined): number {
    if (!market || !portfolio) return 0;
    const priceMap = new Map(market.listings.map((listing) => [listing.symbol, listing.price]));

    return portfolio.holdings.reduce((sum, holding) => {
        const price = priceMap.get(holding.symbol) ?? holding.avgCost;
        return sum + price * holding.shares;
    }, 0);
}

export function executeStockTrade(args: {
    portfolio: StockPortfolio;
    listing: StockListingState;
    type: 'buy' | 'sell';
    shares: number;
}): { portfolio: StockPortfolio; trade?: StockTransaction; cashDelta?: number; error?: string } {
    const { portfolio, listing, type, shares } = args;
    if (shares <= 0 || !Number.isFinite(shares)) {
        return { portfolio, error: 'Invalid share amount.' };
    }

    const holdings = [...portfolio.holdings];
    const holdingIdx = holdings.findIndex((h) => h.symbol === listing.symbol);
    const existingHolding = holdingIdx >= 0 ? holdings[holdingIdx] : undefined;
    const price = listing.price;
    const total = Math.round(price * shares);

    if (type === 'buy') {
        const updatedHolding: StockHolding = existingHolding
            ? {
                ...existingHolding,
                shares: existingHolding.shares + shares,
                avgCost: Math.round(((existingHolding.avgCost * existingHolding.shares) + total) / (existingHolding.shares + shares))
            }
            : { symbol: listing.symbol, shares, avgCost: price };

        if (existingHolding) {
            holdings[holdingIdx] = updatedHolding;
        } else {
            holdings.push(updatedHolding);
        }

        const trade: StockTransaction = {
            id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            symbol: listing.symbol,
            type,
            shares,
            price,
            total,
            executedAt: new Date().toISOString()
        };

        return {
            portfolio: {
                ...portfolio,
                holdings,
                transactions: [trade, ...portfolio.transactions].slice(0, 50)
            },
            trade,
            cashDelta: -total
        };
    }

    if (!existingHolding || existingHolding.shares < shares) {
        return { portfolio, error: 'Not enough shares to sell.' };
    }

    const remainingShares = existingHolding.shares - shares;
    const profit = Math.round((price - existingHolding.avgCost) * shares);
    const updatedHoldings = remainingShares > 0
        ? holdings.map((h) => (h.symbol === listing.symbol ? { ...h, shares: remainingShares } : h))
        : holdings.filter((h) => h.symbol !== listing.symbol);

    const trade: StockTransaction = {
        id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        symbol: listing.symbol,
        type,
        shares,
        price,
        total,
        executedAt: new Date().toISOString()
    };

    return {
        portfolio: {
            ...portfolio,
            holdings: updatedHoldings,
            transactions: [trade, ...portfolio.transactions].slice(0, 50),
            realizedPnL: portfolio.realizedPnL + profit
        },
        trade,
        cashDelta: total
    };
}
