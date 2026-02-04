/**
 * BrightEd Economy Engine — Business Tool Market
 * Defines tools/upgrades available in the general business market.
 */

import { BusinessTool, BusinessCategory } from './economy-types';

export const BUSINESS_TOOLS: BusinessTool[] = [
    {
        id: 'pos_terminal_suite',
        name: 'POS Terminal Suite',
        description: 'Streamlined checkout with real-time sales tracking and receipt automation.',
        cost: 620,
        category: 'operations',
        boostLabel: 'Faster checkout • fewer order delays',
        businessCategories: ['retail', 'food']
    },
    {
        id: 'smart_scheduling_ai',
        name: 'Smart Scheduling AI',
        description: 'Auto-optimizes appointment flow and buffers deadlines during rush hours.',
        cost: 480,
        category: 'operations',
        boostLabel: '+15% deadline buffer',
        businessCategories: ['service', 'digital']
    },
    {
        id: 'inventory_scanner',
        name: 'Inventory Scanner Grid',
        description: 'Instant stock visibility with barcode scan workflows.',
        cost: 410,
        category: 'operations',
        boostLabel: 'Reduced stockouts',
        businessCategories: ['retail', 'food']
    },
    {
        id: 'social_growth_pack',
        name: 'Social Growth Pack',
        description: 'Campaign templates and micro-influencer briefs for better brand reach.',
        cost: 350,
        category: 'marketing',
        boostLabel: '+2 reputation per 5★ review'
    },
    {
        id: 'automation_stack',
        name: 'Automation Stack',
        description: 'Automate repetitive tasks with lightweight bots and workflow triggers.',
        cost: 760,
        category: 'technology',
        boostLabel: 'Faster fulfillment cycles',
        businessCategories: ['digital', 'service']
    },
    {
        id: 'client_success_os',
        name: 'Client Success OS',
        description: 'Follow-up scripts, feedback dashboards, and retention playbooks.',
        cost: 520,
        category: 'marketing',
        boostLabel: 'Higher loyalty retention'
    },
    {
        id: 'compliance_toolkit',
        name: 'Compliance Toolkit',
        description: 'Automated filing reminders and audit-ready checklists.',
        cost: 540,
        category: 'compliance',
        boostLabel: 'Lower regulatory risk'
    },
    {
        id: 'talent_accelerator',
        name: 'Talent Accelerator',
        description: 'Rapid training modules that sharpen staff skills in weeks.',
        cost: 460,
        category: 'talent',
        boostLabel: '+5 employee quality'
    },
    {
        id: 'eco_packaging',
        name: 'Eco Packaging Kit',
        description: 'Sustainable packaging upgrades that impress eco-conscious buyers.',
        cost: 280,
        category: 'operations',
        boostLabel: 'Boosts customer satisfaction',
        businessCategories: ['food', 'retail']
    },
    {
        id: 'studio_upgrade',
        name: 'Studio Upgrade',
        description: 'Lighting and recording improvements for premium client delivery.',
        cost: 690,
        category: 'technology',
        boostLabel: 'Higher project quality',
        businessCategories: ['digital', 'service']
    }
];

export function getToolMarketForBusiness(category: BusinessCategory): BusinessTool[] {
    return BUSINESS_TOOLS.filter((tool) => !tool.businessCategories || tool.businessCategories.includes(category));
}

export function getToolById(id: string): BusinessTool | undefined {
    return BUSINESS_TOOLS.find((tool) => tool.id === id);
}

export function getToolValue(ids: string[] | undefined): number {
    if (!ids || ids.length === 0) return 0;
    return ids.reduce((sum, id) => {
        const tool = getToolById(id);
        if (!tool) return sum;
        return sum + Math.round(tool.cost * 0.6);
    }, 0);
}
