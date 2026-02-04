'use client';

import { useMemo, useState } from 'react';
import { BrightHeading, useDialog } from '@/components/system';
import { BusinessState, BusinessType, updateBusinessFinancials } from '@/lib/economy';
import { getNetWorthSnapshot } from '@/lib/economy/valuation';
import { getToolById, getToolMarketForBusiness } from '@/lib/economy/business-tools';
import type { BusinessTool } from '@/lib/economy/economy-types';

interface BusinessToolMarketProps {
    business: BusinessState;
    businessType: BusinessType | null;
}

export default function BusinessToolMarket({ business, businessType }: BusinessToolMarketProps) {
    const { showAlert } = useDialog();
    const [purchasingId, setPurchasingId] = useState<string | null>(null);

    const tools = useMemo(() => {
        if (!businessType) return [];
        return getToolMarketForBusiness(businessType.category);
    }, [businessType]);

    const ownedTools = new Set(business.ownedTools || []);

    const handlePurchase = async (toolId: string) => {
        const tool = getToolById(toolId);
        if (!tool) return;

        if (ownedTools.has(tool.id)) return;
        if (business.cashBalance < tool.cost) {
            showAlert('Insufficient cash to purchase this tool. Complete more orders or sell inventory.', {
                title: 'INSUFFICIENT FUNDS'
            });
            return;
        }

        setPurchasingId(tool.id);
        try {
            const updatedTools = [...ownedTools, tool.id];
            const cashDelta = -tool.cost;
            const updatedBusiness = {
                ...business,
                cashBalance: business.cashBalance + cashDelta,
                ownedTools: updatedTools
            };
            const snapshot = getNetWorthSnapshot(updatedBusiness);

            await updateBusinessFinancials(business.id, {
                cashDelta,
                ownedTools: updatedTools,
                netWorth: snapshot.netWorth,
                valuation: snapshot.valuation
            });
        } catch (error) {
            showAlert('Purchase failed. Please try again.', { title: 'PURCHASE ERROR' });
        } finally {
            setPurchasingId(null);
        }
    };

    return (
        <div className="duo-card p-8 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--brand-primary)] mb-1">General Market</div>
                    <BrightHeading level={2} className="text-3xl m-0">Business Tool Vault</BrightHeading>
                    <p className="text-xs text-[var(--text-secondary)] font-bold mt-1 opacity-70">
                        Upgrade your systems with tools tailored to your business model.
                    </p>
                </div>
                <div className="px-5 py-3 bg-[var(--bg-secondary)] rounded-2xl border-2 border-[var(--border-subtle)] border-b-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Available Cash</div>
                    <div className="text-xl font-black text-[var(--brand-primary)]">฿{business.cashBalance.toLocaleString()}</div>
                </div>
            </div>

            {tools.length === 0 ? (
                <div className="py-16 text-center bg-[var(--bg-secondary)]/30 rounded-[2rem] border-2 border-dashed border-[var(--border-subtle)]">
                    <div className="text-4xl mb-4 grayscale opacity-30">🧰</div>
                    <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">No upgrades available</p>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-2">Check back as your business evolves.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {tools.map((tool: BusinessTool) => {
                        const isOwned = ownedTools.has(tool.id);
                        const isPurchasing = purchasingId === tool.id;
                        return (
                            <div key={tool.id} className="duo-card p-5 border-2 border-[var(--border-subtle)]/80 bg-[var(--bg-elevated)]/80">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{tool.category}</div>
                                        <div className="text-lg font-black text-[var(--text-primary)] mt-1">{tool.name}</div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isOwned ? 'bg-emerald-500/15 text-emerald-500' : 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'}`}>
                                        {isOwned ? 'Owned' : `฿${tool.cost}`}
                                    </div>
                                </div>
                                <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed mb-4">{tool.description}</p>
                                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--brand-accent)] mb-5">
                                    {tool.boostLabel}
                                </div>
                                <button
                                    disabled={isOwned || isPurchasing}
                                    onClick={() => handlePurchase(tool.id)}
                                    className={`duo-btn w-full text-[10px] py-2 ${isOwned ? 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-subtle)]' : 'duo-btn-primary'}`}
                                >
                                    {isOwned ? 'Installed' : isPurchasing ? 'Processing...' : 'Purchase Upgrade'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
