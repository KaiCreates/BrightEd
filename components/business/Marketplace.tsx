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
        { id: 'rice_5kg', name: 'Premium Rice (5kg)', price: 25, stock: 20, maxStock: 20, image: '/products/Rice.png', icon: '🍚' },
        { id: 'flour_2kg', name: 'All-Purpose Flour', price: 12, stock: 25, maxStock: 25, image: '/products/Flour.png', icon: '🌾' },
        { id: 'oil_1l', name: 'Vegetable Oil', price: 20, stock: 15, maxStock: 15, image: '/products/CookingOil.png', icon: '🛢️' },
        { id: 'dish_soap', name: 'Sparkle Dish Soap', price: 9, stock: 30, maxStock: 30, image: '/products/DishSoap.png', icon: '🧼' },
        { id: 'tissue_4pk', name: 'Soft Tissue Pack', price: 14, stock: 20, maxStock: 20, image: '/products/toilet_paper.png', icon: '🧻' },
        { id: 'plantain_chips', name: 'Crunchy Chips', price: 6, stock: 50, maxStock: 50, image: '/products/PlantainChips.png', icon: '🍌' },
        { id: 'sugar_1kg', name: 'Cane Sugar', price: 15, stock: 20, maxStock: 20, image: '/products/Surgar.png', icon: '🍬' },
        { id: 'cole_cold', name: 'Cole Cold', price: 8, stock: 40, maxStock: 40, image: '/products/Cole_Cold_copy.png', icon: '🥤' },
        { id: 'fries_pack', name: 'Frozen Fries', price: 10, stock: 30, maxStock: 30, image: '/products/Fries.png', icon: '🍟' },
        { id: 'peppers_fresh', name: 'Fresh Peppers', price: 5, stock: 25, maxStock: 25, image: '/products/Peppers.jpg', icon: '🌶️' },
        { id: 'salt_pack', name: 'Sea Salt', price: 4, stock: 40, maxStock: 40, image: '/products/Salt.png', icon: '🧂' },
    ];

    const marketItems = (business.marketState?.items && business.marketState.items.length > 0
        ? business.marketState.items
        : getDefaultMarketItems()
    ).map(item => ({
        ...item,
        // Ensure icon exists if missing from DB state
        icon: (item as any).icon || '📦',
        // Fallback for image if older DB state doesn't have it (client-side patch)
        image: (item as any).image || getDefaultMarketItems().find(d => d.id === item.id)?.image
    }));

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
                <div>
                    <BrightHeading level={3}>Global Logistics Market</BrightHeading>
                    <p className="text-[var(--text-secondary)] text-sm">Purchase supplies to fulfill customer orders.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-elevated)] rounded-full border border-[var(--brand-primary)]/30 shadow-[0_0_15px_var(--brand-primary)]/10">
                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Market Refresh</span>
                    <span className="font-mono font-bold text-[var(--brand-primary)] tabular-nums">{timeLeft}</span>
                </div>
            </div>

            <BrightLayer variant="glass" padding="lg" className="border-none bg-transparent">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {marketItems.map((item) => {
                        const stockPercent = (item.stock / item.maxStock) * 100;
                        const isLowStock = stockPercent < 30;
                        const isSoldOut = item.stock === 0;

                        return (
                            <div key={item.id} className="group relative bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden hover:border-[var(--brand-primary)] hover:shadow-lg transition-all duration-300">
                                {/* Stock Bar Overlay */}
                                <div className="absolute top-0 left-0 right-0 h-1 z-10 bg-[var(--bg-elevated)]">
                                    <div
                                        className={`h-full transition-all duration-500 ${isLowStock ? 'bg-[var(--state-error)]' : 'bg-[var(--state-success)]'}`}
                                        style={{ width: `${stockPercent}%` }}
                                    />
                                </div>

                                {/* Image Area */}
                                <div className="aspect-square relative bg-white/5 p-4 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                    {item.image ? (
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-full h-full object-contain filter drop-shadow-lg group-hover:scale-110 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="text-4xl">{item.icon}</div>
                                    )}

                                    <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border backdrop-blur-md ${isSoldOut ? 'bg-[var(--state-error)]/90 text-white border-[var(--state-error)]' : 'bg-black/50 text-white border-white/20'}`}>
                                        {isSoldOut ? 'Sold Out' : `${item.stock} left`}
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="p-4">
                                    <h4 className="font-bold text-[var(--text-primary)] text-sm mb-1 truncate" title={item.name}>{item.name}</h4>
                                    <div className="flex items-baseline gap-1 mb-4">
                                        <span className="text-[var(--brand-accent)] font-black text-base">฿{item.price}</span>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2">
                                        <button
                                            disabled={item.stock < 1 || business.cashBalance < item.price}
                                            onClick={() => handleBuy(item, 1)}
                                            className="bg-[var(--bg-elevated)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg py-1.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Purchase 1 Unit
                                        </button>
                                        <button
                                            disabled={item.stock < 5 || business.cashBalance < item.price * 5}
                                            onClick={() => handleBuy(item, 5)}
                                            className="bg-[var(--brand-primary)]/10 hover:bg-[var(--brand-primary)] hover:text-white text-[var(--brand-primary)] border border-[var(--brand-primary)]/20 rounded-lg py-1.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Bulk Buy (5)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </BrightLayer>
        </div>
    );
}
