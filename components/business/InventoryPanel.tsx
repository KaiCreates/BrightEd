'use client';

import { BrightLayer, BrightHeading } from '@/components/system';

interface InventoryPanelProps {
    inventory: Record<string, number>;
}

export default function InventoryPanel({ inventory }: InventoryPanelProps) {
    const items = Object.entries(inventory).filter(([_, qty]) => qty > 0);

    return (
        <div className="space-y-4">
            <BrightLayer variant="glass" padding="md">
                <div className="flex justify-between items-center mb-4">
                    <BrightHeading level={4} className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)]">Warehouse Stock</BrightHeading>
                    <span className="text-[10px] px-2 py-0.5 bg-[var(--bg-elevated)] rounded border border-[var(--border-subtle)] font-mono text-[var(--text-secondary)]">
                        {items.length} SKUs
                    </span>
                </div>

                {items.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-[var(--border-subtle)] rounded-xl">
                        <p className="text-xs text-[var(--text-muted)]">No stock in warehouse.<br />Restock from the Supply Chain.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {items.map(([itemId, quantity]) => (
                            <div key={itemId} className="bg-[var(--bg-elevated)]/50 rounded-lg p-3 border border-[var(--border-subtle)] flex items-center justify-between group hover:border-[var(--brand-primary)]/50 transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-tight truncate max-w-[80px]">
                                        {itemId.replace(/_/g, ' ')}
                                    </span>
                                    <span className="text-sm font-black text-[var(--text-primary)]">
                                        {quantity.toLocaleString()}
                                    </span>
                                </div>
                                <div className="w-1.5 h-8 bg-gradient-to-t from-[var(--brand-primary)] to-[var(--brand-accent)] rounded-full opacity-30 group-hover:opacity-100 transition-opacity" />
                            </div>
                        ))}
                    </div>
                )}
            </BrightLayer>
        </div>
    );
}
