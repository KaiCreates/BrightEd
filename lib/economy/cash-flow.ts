/**
 * BrightEd Economy Engine — Operating Costs & Cash Flow
 * Daily expenses, cash flow projection, and financial health checks.
 */

import {
    BusinessState,
    BusinessType,
    Expense,
    ExpenseCategory,
    FailureType,
} from './economy-types';
import './business-templates'; // Type only if needed, or remove if unused entirely. Wait, let's just remove the import.

// ============================================================================
// ECONOMIC STABILIZERS
// ============================================================================

/**
 * Calculate progressive tax based on current balance
 * Brackets:
 * 0-5k: 0%
 * 5k-20k: 5% (on amount above 5k)
 * 20k-50k: 10% (on amount above 20k)
 * 50k+: 15% (on amount above 50k)
 */
export function calculateProgressiveTax(balance: number): number {
    if (balance <= 5000) return 0;

    let tax = 0;
    if (balance > 50000) {
        tax += (balance - 50000) * 0.15;
        balance = 50000;
    }
    if (balance > 20000) {
        tax += (balance - 20000) * 0.10;
        balance = 20000;
    }
    if (balance > 5000) {
        tax += (balance - 5000) * 0.05;
    }

    return Math.round(tax / 30); // Daily prorated tax
}

// ============================================================================
// EXPENSE GENERATION
// ============================================================================

/**
 * Generate daily operating expenses for a business
 */
export function generateDailyExpenses(
    businessState: BusinessState,
    businessType: BusinessType,
    simDate: Date
): Expense[] {
    const expenses: Expense[] = [];
    const costs = businessType.operatingCosts;
    const dueAt = simDate.toISOString();

    // Fixed daily costs
    if (costs.rentPerDay && costs.rentPerDay > 0) {
        expenses.push({
            id: `exp_rent_${simDate.getTime()}`,
            businessId: businessState.id,
            category: 'rent',
            amount: costs.rentPerDay,
            description: 'Daily rent',
            dueAt,
            recurring: true,
            frequency: 'daily',
        });
    }

    if (costs.utilitiesPerDay && costs.utilitiesPerDay > 0) {
        expenses.push({
            id: `exp_util_${simDate.getTime()}`,
            businessId: businessState.id,
            category: 'utilities',
            amount: costs.utilitiesPerDay,
            description: 'Utilities (power, water)',
            dueAt,
            recurring: true,
            frequency: 'daily',
        });
    }

    if (costs.licensePerDay && costs.licensePerDay > 0) {
        expenses.push({
            id: `exp_license_${simDate.getTime()}`,
            businessId: businessState.id,
            category: 'license',
            amount: costs.licensePerDay,
            description: 'Operating license',
            dueAt,
            recurring: true,
            frequency: 'daily',
        });
    }

    if (costs.fuelPerDay && costs.fuelPerDay > 0) {
        expenses.push({
            id: `exp_fuel_${simDate.getTime()}`,
            businessId: businessState.id,
            category: 'supplies',
            amount: costs.fuelPerDay,
            description: 'Fuel costs',
            dueAt,
            recurring: true,
            frequency: 'daily',
        });
    }

    // Staff costs (based on operating hours)
    if (costs.staffPerHour && costs.staffPerHour > 0) {
        const operatingHours = businessState.operatingHours.close - businessState.operatingHours.open;
        const staffCost = costs.staffPerHour * operatingHours * businessState.staffCount;
        expenses.push({
            id: `exp_staff_${simDate.getTime()}`,
            businessId: businessState.id,
            category: 'staff',
            amount: Math.round(staffCost),
            description: `Staff wages (${businessState.staffCount} staff, ${operatingHours}hrs)`,
            dueAt,
            recurring: true,
            frequency: 'daily',
        });
    }

    // Monthly software costs (prorated daily)
    if (costs.softwarePerMonth && costs.softwarePerMonth > 0) {
        const dailySoftware = Math.round(costs.softwarePerMonth / 30);
        expenses.push({
            id: `exp_software_${simDate.getTime()}`,
            businessId: businessState.id,
            category: 'supplies',
            amount: dailySoftware,
            description: 'Software subscriptions',
            dueAt,
            recurring: true,
            frequency: 'daily',
        });
    }

    // Progressive Tax (Economic Scaler)
    const dailyTax = calculateProgressiveTax(businessState.cashBalance);
    if (dailyTax > 0) {
        expenses.push({
            id: `exp_tax_${simDate.getTime()}`,
            businessId: businessState.id,
            category: 'tax',
            amount: dailyTax,
            description: 'Business income tax (progressive)',
            dueAt,
            recurring: false,
        });
    }

    // Random maintenance event (Scales with staff/complexity)
    if (costs.maintenanceChance && Math.random() < costs.maintenanceChance) {
        const complexityMultiplier = 1 + (businessState.employees?.length || 0) * 0.2;
        const maintenanceCost = Math.round((50 + Math.random() * 150) * complexityMultiplier);
        expenses.push({
            id: `exp_maint_${simDate.getTime()}`,
            businessId: businessState.id,
            category: 'maintenance',
            amount: maintenanceCost,
            description: 'Equipment maintenance/repair',
            dueAt,
            recurring: false,
        });
    }

    return expenses;
}

/**
 * Calculate inventory spoilage for food businesses
 */
export function calculateSpoilage(
    businessState: BusinessState,
    businessType: BusinessType
): { spoiledItems: Record<string, number>; lostValue: number } {
    const spoiledItems: Record<string, number> = {};
    let lostValue = 0;

    const wastePercent = businessType.operatingCosts.ingredientWastePercent ?? 0;
    if (wastePercent <= 0) {
        return { spoiledItems, lostValue };
    }

    // Calculate spoilage for each inventory item
    for (const [itemId, quantity] of Object.entries(businessState.inventory)) {
        if (quantity <= 0) continue;

        const spoiled = Math.floor(quantity * wastePercent);
        if (spoiled > 0) {
            spoiledItems[itemId] = spoiled;

            // Find product to get cost
            const product = businessType.products.find(
                p => p.inventoryItemId === itemId || p.id === itemId
            );
            if (product) {
                lostValue += spoiled * product.baseCost;
            }
        }
    }

    return { spoiledItems, lostValue };
}

/**
 * Apply spoilage to inventory
 */
export function applySpoilage(
    inventory: Record<string, number>,
    spoiledItems: Record<string, number>
): Record<string, number> {
    const newInventory = { ...inventory };

    for (const [itemId, spoiled] of Object.entries(spoiledItems)) {
        if (newInventory[itemId]) {
            newInventory[itemId] = Math.max(0, newInventory[itemId] - spoiled);
            if (newInventory[itemId] === 0) {
                delete newInventory[itemId];
            }
        }
    }

    return newInventory;
}

// ============================================================================
// CASH FLOW
// ============================================================================

/**
 * Calculate total pending expenses
 */
export function getTotalPendingExpenses(expenses: Expense[]): number {
    return expenses
        .filter(e => !e.paidAt)
        .reduce((sum, e) => sum + e.amount, 0);
}

/**
 * Pay pending expenses, return updated state
 */
export function payExpenses(
    businessState: BusinessState,
    expenses: Expense[]
): {
    newBalance: number;
    paidExpenses: Expense[];
    unpaidExpenses: Expense[];
    totalPaid: number;
} {
    let balance = businessState.cashBalance;
    const paidExpenses: Expense[] = [];
    const unpaidExpenses: Expense[] = [];
    let totalPaid = 0;

    // Sort by priority: rent > utilities > staff > others
    const priorityOrder: ExpenseCategory[] = ['rent', 'utilities', 'staff', 'license', 'supplies', 'maintenance', 'inventory', 'loan_payment', 'tax'];

    const sortedExpenses = [...expenses].sort((a, b) => {
        return priorityOrder.indexOf(a.category) - priorityOrder.indexOf(b.category);
    });

    for (const expense of sortedExpenses) {
        if (expense.paidAt) {
            paidExpenses.push(expense);
            continue;
        }

        if (balance >= expense.amount) {
            balance -= expense.amount;
            totalPaid += expense.amount;
            paidExpenses.push({
                ...expense,
                paidAt: new Date().toISOString(),
            });
        } else {
            unpaidExpenses.push(expense);
        }
    }

    return {
        newBalance: balance,
        paidExpenses,
        unpaidExpenses,
        totalPaid,
    };
}

/**
 * Project cash flow for next N days
 */
export function projectCashFlow(
    businessState: BusinessState,
    businessType: BusinessType,
    daysAhead: number
): {
    projectedBalance: number;
    dailyBreakdown: Array<{
        day: number;
        expenses: number;
        projectedRevenue: number;
        endBalance: number;
    }>;
    warnings: string[];
} {
    const warnings: string[] = [];
    const dailyBreakdown: Array<{
        day: number;
        expenses: number;
        projectedRevenue: number;
        endBalance: number;
    }> = [];

    let balance = businessState.cashBalance;
    const costs = businessType.operatingCosts;

    // Calculate daily fixed costs
    const dailyFixed =
        (costs.rentPerDay ?? 0) +
        (costs.utilitiesPerDay ?? 0) +
        (costs.licensePerDay ?? 0) +
        (costs.fuelPerDay ?? 0) +
        ((costs.softwarePerMonth ?? 0) / 30);

    // Staff costs estimate
    const operatingHours = businessState.operatingHours.close - businessState.operatingHours.open;
    const dailyStaff = (costs.staffPerHour ?? 0) * operatingHours * businessState.staffCount;

    const totalDailyExpenses = dailyFixed + dailyStaff;

    // Estimate daily revenue based on reputation and demand
    const avgOrderValue = (businessType.demandConfig.orderValueRange.min + businessType.demandConfig.orderValueRange.max) / 2;
    const ordersPerDay = businessType.demandConfig.baseOrdersPerHour * operatingHours;
    const repMultiplier = 0.5 + (businessState.reputation / 100);
    const estimatedDailyRevenue = avgOrderValue * ordersPerDay * repMultiplier * 0.7; // 70% profit margin estimate

    for (let day = 1; day <= daysAhead; day++) {
        const expenses = totalDailyExpenses;
        const revenue = estimatedDailyRevenue;

        balance = balance - expenses + revenue;

        dailyBreakdown.push({
            day,
            expenses: Math.round(expenses),
            projectedRevenue: Math.round(revenue),
            endBalance: Math.round(balance),
        });

        if (balance < 0 && warnings.length === 0) {
            warnings.push(`Cash will run out in approximately ${day} days`);
        }

        if (balance < totalDailyExpenses && warnings.length < 2) {
            warnings.push(`Day ${day}: Balance below daily expenses`);
        }
    }

    return {
        projectedBalance: Math.round(balance),
        dailyBreakdown,
        warnings,
    };
}

// ============================================================================
// FINANCIAL HEALTH
// ============================================================================

export type FinancialHealth = 'critical' | 'struggling' | 'stable' | 'thriving';

/**
 * Assess financial health of business
 */
export function assessFinancialHealth(
    businessState: BusinessState,
    businessType: BusinessType
): {
    health: FinancialHealth;
    score: number; // 0-100
    issues: string[];
    recommendations: string[];
} {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 50; // Start at neutral

    const costs = businessType.operatingCosts;
    const dailyExpenses =
        (costs.rentPerDay ?? 0) +
        (costs.utilitiesPerDay ?? 0) +
        (costs.staffPerHour ?? 0) * 8; // Estimate 8 hours

    // Cash runway
    const runway = dailyExpenses > 0 ? businessState.cashBalance / dailyExpenses : 30;

    if (runway < 1) {
        score -= 40;
        issues.push('Cannot cover today\'s expenses');
    } else if (runway < 3) {
        score -= 25;
        issues.push('Less than 3 days of operating cash');
        recommendations.push('Urgently need more orders or a loan');
    } else if (runway < 7) {
        score -= 10;
        issues.push('Less than a week of cash reserves');
    } else if (runway > 14) {
        score += 15;
    }

    // Reputation impact
    if (businessState.reputation < 20) {
        score -= 20;
        issues.push('Very poor reputation - orders hard to get');
        recommendations.push('Focus on quality over quantity');
    } else if (businessState.reputation < 40) {
        score -= 10;
        issues.push('Below average reputation');
    } else if (businessState.reputation > 70) {
        score += 15;
    } else if (businessState.reputation > 85) {
        score += 25;
    }

    // Order success rate
    const totalOrders = businessState.ordersCompleted + businessState.ordersFailed;
    if (totalOrders > 0) {
        const successRate = businessState.ordersCompleted / totalOrders;
        if (successRate < 0.7) {
            score -= 15;
            issues.push(`Only ${Math.round(successRate * 100)}% order success rate`);
        } else if (successRate > 0.9) {
            score += 10;
        }
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    // Determine health category
    let health: FinancialHealth;
    if (score < 25) {
        health = 'critical';
    } else if (score < 45) {
        health = 'struggling';
    } else if (score < 70) {
        health = 'stable';
    } else {
        health = 'thriving';
    }

    return { health, score, issues, recommendations };
}

/**
 * Check for financial failures that trigger scenes
 */
export function checkFinancialFailures(
    businessState: BusinessState,
    pendingExpenses: Expense[]
): FailureType | null {
    const unpaidRent = pendingExpenses.find(e => e.category === 'rent' && !e.paidAt);
    // Simplified logic

    if (businessState.cashBalance < 0) {
        return 'cash_crisis';
    }

    if (unpaidRent && businessState.cashBalance < unpaidRent.amount) {
        return 'cash_crisis';
    }

    // Check for license expiry
    const licenseDue = pendingExpenses.find(e => e.category === 'license' && !e.paidAt);
    if (licenseDue) {
        const dueDate = new Date(licenseDue.dueAt);
        const now = new Date();
        if (now > dueDate) {
            return 'license_expired';
        }
    }

    return null;
}
