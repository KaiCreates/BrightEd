'use client';

import { BrightHeading } from '@/components/system';

interface InventoryPanelProps {
    inventory: Record<string, number>;
}

export default function InventoryPanel({ inventory }: InventoryPanelProps) {
    const items = Object.entries(inventory).filter(([_, qty]) => qty > 0);

    return (
        <div className="duo-card p-6 space-y-6">
            <div className="flex justify-between items-center bg-[var(--bg-secondary)] p-4 rounded-2xl border-2 border-[var(--border-subtle)] border-b-4">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--brand-primary)] mb-0.5">Physical Inventory</div>
                    <BrightHeading level={2} className="text-3xl m-0">Warehouse Stock</BrightHeading>
                </div>
                <div className="bg-[var(--brand-primary)]/10 px-4 py-2 rounded-xl border-2 border-[var(--brand-primary)]/20">
                    <span className="text-xs font-black text-[var(--brand-primary)] tabular-nums">
                        {items.length} SKUs
                    </span>
                </div>
            </div>

            {items.length === 0 ? (
                <div className="py-12 text-center bg-[var(--bg-secondary)]/30 rounded-[2rem] border-2 border-dashed border-[var(--border-subtle)]">
                    <div className="text-4xl mb-4 grayscale opacity-30">📦</div>
                    <p className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50">Warehouse Empty</p>
                    <p className="text-[10px] font-bold text-[var(--text-secondary)] mt-1">Restock supplies from the marketplace.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {items.map(([itemId, quantity]) => (
                        <div key={itemId} className="duo-card p-4 transition-transform hover:translate-y-[-2px] active:translate-y-[0px]">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-[var(--brand-primary)] font-black uppercase tracking-widest mb-1 truncate max-w-[120px]">
                                        {itemId.replace(/_/g, ' ')}
                                    </span>
                                    <span className="text-2xl font-black text-[var(--text-primary)]">
                                        {quantity.toLocaleString()}
                                    </span>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-[var(--bg-secondary)] border-2 border-[var(--border-subtle)] border-b-4 flex items-center justify-center text-2xl">
                                    {quantity > 100 ? '📦' : quantity > 0 ? '🥡' : '⭕'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
