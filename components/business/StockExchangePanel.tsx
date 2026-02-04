'use client';

import { useMemo, useState } from 'react';
import { BrightHeading, useDialog } from '@/components/system';
import { BusinessState, updateBusinessFinancials } from '@/lib/economy';
import { calculatePortfolioValue, executeStockTrade, initStockMarketState } from '@/lib/economy/stock-market';
import type { StockListingState } from '@/lib/economy/stock-market';
import { getNetWorthSnapshot } from '@/lib/economy/valuation';

interface StockExchangePanelProps {
    business: BusinessState;
}

export default function StockExchangePanel({ business }: StockExchangePanelProps) {
    const { showAlert } = useDialog();
    const [processingSymbol, setProcessingSymbol] = useState<string | null>(null);

    const market = business.stockMarket ?? initStockMarketState();
    const portfolio = business.stockPortfolio ?? { cashReserved: 0, holdings: [], transactions: [], realizedPnL: 0 };

    const holdingsMap = useMemo(() => {
        return new Map(portfolio.holdings.map((holding) => [holding.symbol, holding]));
    }, [portfolio.holdings]);

    const portfolioValue = calculatePortfolioValue(market, portfolio);

    const buildSparkline = (points: number[], width: number, height: number) => {
        if (points.length < 2) {
            return { line: '', area: '', min: points[0] ?? 0, max: points[0] ?? 0 };
        }

        const min = Math.min(...points);
        const max = Math.max(...points);
        const range = max - min || 1;

        const line = points
            .map((value, index) => {
                const x = (index / (points.length - 1)) * width;
                const y = height - ((value - min) / range) * height;
                return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
            })
            .join(' ');

        const area = `${line} L ${width} ${height} L 0 ${height} Z`;

        return { line, area, min, max };
    };

    const handleTrade = async (listing: StockListingState, type: 'buy' | 'sell', shares: number) => {
        if (shares <= 0) return;

        const holding = holdingsMap.get(listing.symbol);
        if (type === 'sell' && (!holding || holding.shares < shares)) {
            showAlert('Not enough shares to sell.', { title: 'TRADE BLOCKED' });
            return;
        }

        const cost = listing.price * shares;
        if (type === 'buy' && business.cashBalance < cost) {
            showAlert('Not enough cash on hand to place this trade.', { title: 'INSUFFICIENT FUNDS' });
            return;
        }

        setProcessingSymbol(listing.symbol);
        try {
            const result = executeStockTrade({
                portfolio,
                listing,
                type,
                shares
            });

            if (result.error) {
                showAlert(result.error, { title: 'TRADE ERROR' });
                return;
            }

            const cashDelta = result.cashDelta ?? 0;
            const updatedBusiness = {
                ...business,
                cashBalance: business.cashBalance + cashDelta,
                stockPortfolio: result.portfolio
            };
            const snapshot = getNetWorthSnapshot(updatedBusiness);

            await updateBusinessFinancials(business.id, {
                cashDelta,
                stockPortfolio: result.portfolio,
                netWorth: snapshot.netWorth,
                valuation: snapshot.valuation
            });
        } catch (error) {
            showAlert('Trade failed. Please try again.', { title: 'TRADE ERROR' });
        } finally {
            setProcessingSymbol(null);
        }
    };

    return (
        <div className="duo-card p-8 space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--brand-primary)] mb-1">Business Stock Exchange</div>
                    <BrightHeading level={2} className="text-3xl m-0">Market Pulse</BrightHeading>
                    <p className="text-xs text-[var(--text-secondary)] font-bold mt-1 opacity-70">
                        Trade shares and grow your portfolio alongside your operations.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="px-5 py-3 bg-[var(--bg-secondary)] rounded-2xl border-2 border-[var(--border-subtle)] border-b-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Cash</div>
                        <div className="text-xl font-black text-[var(--text-primary)]">฿{business.cashBalance.toLocaleString()}</div>
                    </div>
                    <div className="px-5 py-3 bg-[var(--bg-secondary)] rounded-2xl border-2 border-[var(--border-subtle)] border-b-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Portfolio</div>
                        <div className="text-xl font-black text-[var(--brand-accent)]">฿{portfolioValue.toLocaleString()}</div>
                    </div>
                    <div className="px-5 py-3 bg-[var(--bg-secondary)] rounded-2xl border-2 border-[var(--border-subtle)] border-b-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Realized P/L</div>
                        <div className={`text-xl font-black ${portfolio.realizedPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {portfolio.realizedPnL >= 0 ? '+' : ''}฿{portfolio.realizedPnL.toLocaleString()}
                        </div>
                    </div>
                    <div className="px-5 py-3 bg-[var(--bg-secondary)] rounded-2xl border-2 border-[var(--border-subtle)] border-b-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Market Tick</div>
                        <div className="text-xs font-bold text-[var(--text-secondary)]">
                            {new Date(market.lastTick).toLocaleTimeString()}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {market.listings.map((listing) => {
                    const holding = holdingsMap.get(listing.symbol);
                    const isProcessing = processingSymbol === listing.symbol;
                    const changePositive = listing.changePercent >= 0;
                    const historyPoints = listing.history?.map((point) => point.price) ?? [listing.price];
                    const chart = buildSparkline(historyPoints, 160, 56);
                    const strokeColor = changePositive ? '#22c55e' : '#ef4444';
                    const gradientId = `sparkline-${listing.symbol}`;

                    return (
                        <div key={listing.symbol} className="duo-card p-6 border-2 border-[var(--border-subtle)]/80 bg-[var(--bg-elevated)]/80">
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{listing.sector}</div>
                                    <div className="text-lg font-black text-[var(--text-primary)]">{listing.name}</div>
                                    <div className="text-[11px] font-black text-[var(--brand-primary)]">{listing.symbol}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-[var(--text-primary)]">฿{listing.price}</div>
                                    <div className={`text-[10px] font-black uppercase tracking-widest ${changePositive ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {changePositive ? '▲' : '▼'} {Math.abs(listing.changePercent)}%
                                    </div>
                                </div>
                            </div>

                            <div className="mb-4 text-[11px] font-bold text-[var(--text-secondary)]">
                                {holding ? `${holding.shares} shares • Avg ฿${holding.avgCost}` : 'No holdings yet'}
                            </div>

                            <div className="mb-5">
                                <div className="rounded-2xl border border-[var(--border-subtle)]/70 bg-[var(--bg-secondary)]/40 p-3">
                                    {chart.line ? (
                                        <svg width="100%" height="60" viewBox="0 0 160 56" role="img" aria-label={`${listing.name} price history`}>
                                            <defs>
                                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
                                                    <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
                                                </linearGradient>
                                            </defs>
                                            <path d={chart.area} fill={`url(#${gradientId})`} />
                                            <path d={chart.line} fill="none" stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" />
                                        </svg>
                                    ) : (
                                        <div className="h-[60px] flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                            Waiting for data
                                        </div>
                                    )}
                                    <div className="mt-2 flex justify-between text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                        <span>Low ฿{Math.round(chart.min)}</span>
                                        <span>High ฿{Math.round(chart.max)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    {[1, 5, 10].map((qty) => (
                                        <button
                                            key={`buy-${listing.symbol}-${qty}`}
                                            disabled={isProcessing || business.cashBalance < listing.price * qty}
                                            onClick={() => handleTrade(listing, 'buy', qty)}
                                            className="duo-btn duo-btn-primary w-full text-[10px] py-2"
                                        >
                                            Buy {qty}
                                        </button>
                                    ))}
                                </div>
                                <div className="space-y-2">
                                    <button
                                        disabled={isProcessing || !holding || holding.shares < 1}
                                        onClick={() => handleTrade(listing, 'sell', 1)}
                                        className="duo-btn w-full text-[10px] py-2 border-2 border-[var(--border-subtle)]"
                                    >
                                        Sell 1
                                    </button>
                                    <button
                                        disabled={isProcessing || !holding || holding.shares < 5}
                                        onClick={() => handleTrade(listing, 'sell', 5)}
                                        className="duo-btn w-full text-[10px] py-2 border-2 border-[var(--border-subtle)]"
                                    >
                                        Sell 5
                                    </button>
                                    <button
                                        disabled={isProcessing || !holding}
                                        onClick={() => handleTrade(listing, 'sell', holding?.shares || 0)}
                                        className="duo-btn w-full text-[10px] py-2 border-2 border-red-500/40 text-red-500"
                                    >
                                        Sell All
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
