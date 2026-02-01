'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { BrightHeading, useDialog } from '@/components/system';
import { MarketItem, BusinessState } from '@/lib/economy/economy-types';
import { ensureMarketRestock } from '@/lib/economy';
import {
    SupplyDemandCurve,
    calculatePrice,
    getPricingResult,
    simulateMarketDemand
} from '@/lib/economy/pricing-engine';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface MarketplaceProps {
    business: BusinessState;
}

// Initialize supply/demand curves for market items
const initializePricingCurves = (items: MarketItem[]): Map<string, SupplyDemandCurve> => {
    const curves = new Map<string, SupplyDemandCurve>();

    items.forEach(item => {
        curves.set(item.id, {
            productId: item.id,
            basePrice: item.price,
            currentSupply: item.stock,
            currentDemand: Math.floor(item.maxStock * 0.3),
            elasticity: 0.3,
            priceHistory: [{ timestamp: new Date().toISOString(), price: item.price }]
        });
    });

    return curves;
};

export default function Marketplace({ business }: MarketplaceProps) {
    const [timeLeft, setTimeLeft] = useState<string>('00:00');
    const [isRestocking, setIsRestocking] = useState(false);
    const [pricingCurves, setPricingCurves] = useState<Map<string, SupplyDemandCurve>>(new Map());
    const { showAlert } = useDialog();
    const anySrcLoader = ({ src }: { src: string }) => src;

    useEffect(() => {
        if (business.marketState?.items && business.marketState.items.length > 0) {
            const curves = initializePricingCurves(business.marketState.items);
            const hour = new Date().getHours();
            const demandMultiplier = simulateMarketDemand(hour, business.reputation);

            curves.forEach((curve, itemId) => {
                const adjustedDemand = Math.floor(curve.currentDemand * demandMultiplier);
                curves.set(itemId, { ...curve, currentDemand: adjustedDemand });
            });

            setPricingCurves(curves);
        }
    }, [business.marketState?.items, business.reputation]);

    useEffect(() => {
        let mounted = true;
        const tryRestockIfDue = async () => {
            const now = Date.now();
            const nextRestock = business.marketState?.nextRestock ? new Date(business.marketState.nextRestock).getTime() : 0;

            if (!nextRestock || now >= nextRestock) {
                if (!mounted) return;
                setIsRestocking(true);
                try {
                    await ensureMarketRestock(business.id);
                } finally {
                    if (mounted) setIsRestocking(false);
                }
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
                if (!isRestocking) {
                    tryRestockIfDue();
                }
            }
        }, 1000);

        tryRestockIfDue();
        return () => {
            mounted = false;
            clearInterval(timer);
        };
    }, [business.id, business.marketState?.nextRestock, isRestocking]);

    const handleBuy = async (item: MarketItem, quantity: number) => {
        const curve = pricingCurves.get(item.id);
        const dynamicPrice = curve ? calculatePrice(curve) : item.price;
        const cost = dynamicPrice * quantity;

        if (business.cashBalance < cost) {
            showAlert("Insufficient Bcoins! Complete more orders to earn cash for supplies.", { title: 'INSUFFICIENT FUNDS' });
            return;
        }
        if (item.stock < quantity) {
            showAlert("Not enough stock available in the market right now. Wait for the next restock!", { title: 'OUT OF STOCK' });
            return;
        }

        const bizRef = doc(db, 'businesses', business.id);
        const newMarketItems = marketItems.map(i =>
            i.id === item.id ? { ...i, stock: i.stock - quantity, price: Math.round(dynamicPrice) } : i
        );

        if (curve) {
            const updatedCurve = {
                ...curve,
                currentSupply: Math.max(0, curve.currentSupply - quantity),
                currentDemand: curve.currentDemand + Math.floor(quantity * 0.5),
                priceHistory: [
                    ...curve.priceHistory.slice(-20),
                    { timestamp: new Date().toISOString(), price: dynamicPrice }
                ]
            };
            setPricingCurves(new Map(pricingCurves.set(item.id, updatedCurve)));
        }

        await updateDoc(bizRef, {
            [`inventory.${item.id}`]: increment(quantity),
            cashBalance: increment(-cost),
            balance: increment(-cost),
            'marketState.items': newMarketItems
        });
    };

    const getDefaultMarketItems = (): MarketItem[] => [
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

    const marketItems = (business.marketState?.items && business.marketState.items.length > 0
        ? business.marketState.items
        : getDefaultMarketItems()
    ).map(item => ({
        ...item,
        icon: (item as any).icon || '📦',
        image: (item as any).image || getDefaultMarketItems().find(d => d.id === item.id)?.image
    }));

    return (
        <div className="duo-card p-8 space-y-8 flex flex-col h-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--brand-primary)] mb-1">Logistics</div>
                    <BrightHeading level={2} className="text-3xl m-0">Supply Marketplace</BrightHeading>
                    <p className="text-xs text-[var(--text-secondary)] font-bold mt-1 opacity-70">Purchase raw materials at dynamic market rates.</p>
                </div>
                <div className="flex items-center gap-2 px-6 py-3 bg-[var(--bg-secondary)] rounded-2xl border-2 border-[var(--border-subtle)] border-b-4">
                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Next Restock</span>
                    <span className="font-mono font-black text-[var(--brand-primary)] text-lg tabular-nums">{timeLeft}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                {marketItems.map((item) => {
                    const stockPercent = (item.stock / item.maxStock) * 100;
                    const isLowStock = stockPercent < 30;
                    const isSoldOut = item.stock === 0;

                    const curve = pricingCurves.get(item.id);
                    const dynamicPrice = curve ? Math.round(calculatePrice(curve)) : item.price;
                    const pricingResult = curve ? getPricingResult(curve) : null;
                    const priceChanged = dynamicPrice !== item.price;

                    return (
                        <div key={item.id} className="duo-card p-0 overflow-hidden flex flex-col group h-full">
                            {/* Stock Bar */}
                            <div className="absolute top-0 left-0 right-0 h-1.5 z-10 bg-[var(--bg-secondary)]">
                                <div
                                    className={`h-full transition-all duration-700 ${isSoldOut ? 'bg-[var(--state-error)]' : isLowStock ? 'bg-orange-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${stockPercent}%` }}
                                />
                            </div>

                            {/* Image Area */}
                            <div className="aspect-square relative bg-[var(--bg-secondary)]/50 p-6 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                {item.image ? (
                                    <Image
                                        loader={anySrcLoader}
                                        unoptimized
                                        src={item.image}
                                        alt={item.name}
                                        fill
                                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                        className="object-contain filter drop-shadow-xl group-hover:scale-110 transition-transform duration-700"
                                    />
                                ) : (
                                    <div className="text-5xl group-hover:scale-110 transition-transform duration-700">{item.icon}</div>
                                )}

                                <div className={`absolute top-4 right-4 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 shadow-lg backdrop-blur-md ${isSoldOut ? 'bg-red-500/90 text-white border-red-500/20' : 'bg-black/50 text-white border-white/20'}`}>
                                    {isSoldOut ? 'Sold Out' : `${item.stock} left`}
                                </div>

                                {pricingResult && pricingResult.trend !== 'stable' && (
                                    <div className={`absolute top-4 left-4 px-3 py-1 rounded-xl text-[10px] font-black backdrop-blur-md border-2 shadow-lg ${pricingResult.trend === 'rising' ? 'bg-orange-500/80 text-white border-orange-500/20' : 'bg-emerald-500/80 text-white border-emerald-500/20'}`}>
                                        {pricingResult.trend === 'rising' ? '▲ PRICE' : '▼ PRICE'}
                                    </div>
                                )}
                            </div>

                            {/* Details */}
                            <div className="p-5 flex-1 flex flex-col">
                                <h4 className="font-black text-[var(--text-primary)] text-sm mb-2 truncate" title={item.name}>{item.name}</h4>
                                <div className="flex items-baseline gap-2 mb-4">
                                    <span className={`font-black text-2xl ${priceChanged ? 'text-orange-500' : 'text-[var(--brand-primary)]'}`}>
                                        ฿{dynamicPrice}
                                    </span>
                                    {priceChanged && (
                                        <span className="text-xs text-[var(--text-muted)] line-through font-bold opacity-50">
                                            ฿{item.price}
                                        </span>
                                    )}
                                </div>

                                {pricingResult && (
                                    <p className="text-[10px] font-bold text-[var(--text-muted)] mb-6 leading-relaxed opacity-70">
                                        {pricingResult.reason}
                                    </p>
                                )}

                                <div className="mt-auto space-y-3">
                                    <button
                                        disabled={item.stock < 1 || business.cashBalance < dynamicPrice}
                                        onClick={() => handleBuy(item, 1)}
                                        className="duo-btn w-full text-[10px] py-2 border-b-4 border-black/10"
                                    >
                                        Buy 1 Units
                                    </button>
                                    <button
                                        disabled={item.stock < 5 || business.cashBalance < dynamicPrice * 5}
                                        onClick={() => handleBuy(item, 5)}
                                        className="duo-btn duo-btn-primary w-full text-[10px] py-2"
                                    >
                                        Bulk Buy (5)
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
