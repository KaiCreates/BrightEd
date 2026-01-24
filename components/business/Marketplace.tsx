'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system';
import { MarketItem, BusinessState } from '@/lib/economy/economy-types';
import { updateBusinessFinancials } from '@/lib/economy/firebase-db'; // We might need to export this or use context
import { BCoinIcon } from '@/components/BCoinIcon';
import { doc, updateDoc, Timestamp } from 'firebase/firestore'; // Import directly for now or use db helper
import { db } from '@/lib/firebase';

interface MarketplaceProps {
    business: BusinessState;
}

export default function Marketplace({ business }: MarketplaceProps) {
    const [timeLeft, setTimeLeft] = useState<string>('00:00');
    const [isRestocking, setIsRestocking] = useState(false);

    // Initial Restock Check
    useEffect(() => {
        const checkRestock = async () => {
            const now = Date.now();
            const nextRestock = business.marketState?.nextRestock ? new Date(business.marketState.nextRestock).getTime() : 0;

            if (now >= nextRestock && !isRestocking) {
                // Trigger Restock
                setIsRestocking(true);
                await performRestock();
                setIsRestocking(false);
            }
        };

        const timer = setInterval(() => {
            const now = Date.now();
            const nextRestock = business.marketState?.nextRestock ? new Date(business.marketState.nextRestock).getTime() : 0;

            if (nextRestock > now) {
                const diff = nextRestock - now;
                const m = Math.floor(diff / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
            } else {
                setTimeLeft('Restocking...');
                checkRestock();
            }
        }, 1000);

        checkRestock(); // Run immediately

        return () => clearInterval(timer);
    }, [business]);

    const performRestock = async () => {
        const items = business.marketState?.items || getDefaultMarketItems();

        // Refill stock to max (random variance)
        const newItems = items.map(item => ({
            ...item,
            stock: Math.min(item.maxStock, Math.floor(item.maxStock * 0.8) + Math.floor(Math.random() * (item.maxStock * 0.2)))
        }));

        // Set next restock time (5-10 mins)
        const nextRestock = new Date(Date.now() + (5 + Math.random() * 5) * 60 * 1000).toISOString();

        const bizRef = doc(db, 'businesses', business.id);
        await updateDoc(bizRef, {
            marketState: {
                lastRestock: new Date().toISOString(),
                nextRestock,
                items: newItems
            }
        });
    };

    const handleBuy = async (item: MarketItem, quantity: number) => {
        const cost = item.price * quantity;

        if (business.cashBalance < cost) {
            alert("Insufficient funds!");
            return;
        }
        if (item.stock < quantity) {
            alert("Not enough stock!");
            return;
        }

        // Optimistic UI updates handled by parent subscription usually, but we assume fast DB
        const bizRef = doc(db, 'businesses', business.id);

        // Update Inventory & Market
        const currentInventory = business.inventory || {};
        const newQty = (currentInventory[item.id] || 0) + quantity;

        const newMarketItems = business.marketState.items.map(i =>
            i.id === item.id ? { ...i, stock: i.stock - quantity } : i
        );

        await updateDoc(bizRef, {
            [`inventory.${item.id}`]: newQty,
            cashBalance: business.cashBalance - cost,
            'marketState.items': newMarketItems
        });
    };

    const getDefaultMarketItems = (): MarketItem[] => [
        { id: 'supplies_basic', name: 'Standard Packaging', price: 10, stock: 25, maxStock: 25, icon: '📦' },
        { id: 'supplies_premium', name: 'Premium Gold Box', price: 50, stock: 10, maxStock: 10, icon: '🎁' },
        { id: 'ingredients_fresh', name: 'Fresh Organic Goods', price: 20, stock: 20, maxStock: 20, icon: '🥬' },
        { id: 'components_elec', name: 'Grade-A Electronics', price: 100, stock: 5, maxStock: 5, icon: '🔋' },
    ];

    const marketItems = (business.marketState?.items || getDefaultMarketItems()).map(item => ({
        ...item,
        // Ensure icon exists if missing from DB state
        icon: (item as any).icon || '📦'
    }));

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <BrightHeading level={3}>Global Logistics Market</BrightHeading>
                    <p className="text-[var(--text-secondary)] text-sm">Purchase supplies to fulfill customer orders.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-elevated)] rounded-full border border-[var(--brand-primary)]/30 shadow-[0_0_15px_var(--brand-primary)]/10">
                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Market Refresh</span>
                    <span className="font-mono font-bold text-[var(--brand-primary)] tabular-nums">{timeLeft}</span>
                </div>
            </div>

            <BrightLayer variant="glass" padding="lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {marketItems.map((item) => {
                        const stockPercent = (item.stock / item.maxStock) * 100;
                        const isLowStock = stockPercent < 30;
                        const isSoldOut = item.stock === 0;

                        return (
                            <div key={item.id} className="group relative bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-2xl p-5 hover:border-[var(--brand-primary)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                                {/* Stock Bar */}
                                <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--bg-elevated)]">
                                    <div
                                        className={`h-full transition-all duration-500 ${isLowStock ? 'bg-[var(--state-error)]' : 'bg-[var(--state-success)]'}`}
                                        style={{ width: `${stockPercent}%` }}
                                    />
                                </div>

                                <div className="flex justify-between items-start mb-4 mt-2">
                                    <div className="w-12 h-12 bg-[var(--bg-elevated)] rounded-xl flex items-center justify-center text-2xl shadow-inner">
                                        {(item as any).icon}
                                    </div>
                                    <div className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${isSoldOut ? 'bg-[var(--state-error)]/10 text-[var(--state-error)] border-[var(--state-error)]/20' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]'}`}>
                                        {isSoldOut ? 'Sold Out' : `${item.stock}/${item.maxStock}`}
                                    </div>
                                </div>

                                <h4 className="font-bold text-[var(--text-primary)] mb-1 truncate">{item.name}</h4>
                                <div className="flex items-baseline gap-1 mb-6">
                                    <span className="text-[var(--brand-accent)] font-black text-lg">฿{item.price}</span>
                                    <span className="text-[var(--text-muted)] text-xs">/ unit</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        disabled={item.stock < 1 || business.cashBalance < item.price}
                                        onClick={() => handleBuy(item, 1)}
                                        className="bg-[var(--bg-elevated)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg py-2 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Buy 1
                                    </button>
                                    <button
                                        disabled={item.stock < 5 || business.cashBalance < item.price * 5}
                                        onClick={() => handleBuy(item, 5)}
                                        className="bg-[var(--brand-primary)]/10 hover:bg-[var(--brand-primary)] hover:text-white text-[var(--brand-primary)] border border-[var(--brand-primary)]/20 rounded-lg py-2 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Buy 5
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </BrightLayer>
        </div>
    );
}
