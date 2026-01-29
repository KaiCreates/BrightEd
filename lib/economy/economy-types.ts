/**
 * BrightEd Economy Engine — Core Type Definitions
 * Order-driven economy where money is earned only through fulfilling orders.
 */

// ============================================================================
// BUSINESS TYPES
// ============================================================================

export type BusinessCategory = 'service' | 'retail' | 'food' | 'digital';

export interface BusinessType {
    id: string;
    category: BusinessCategory;
    name: string;
    description: string;
    icon: string;
    emoji: string;
    startingCapital: number;
    products: ProductTemplate[];
    operatingCosts: OperatingCostTemplate;
    demandConfig: DemandConfig;
    characterGuide: string;  // NPC who explains this business
}

export interface OperatingCostTemplate {
    rentPerDay: number;
    utilitiesPerDay: number;
    staffPerHour?: number;
    licensePerDay?: number;
    ingredientWastePercent?: number;  // Food: % of inventory spoiled daily
    softwarePerMonth?: number;        // Digital: subscription costs
    fuelPerDay?: number;              // Mobile businesses
    maintenanceChance?: number;       // Probability of equipment breakdown
}

// ============================================================================
// PRODUCTS & SERVICES
// ============================================================================

export type QualityTier = 'basic' | 'standard' | 'premium';

export interface ProductTemplate {
    id: string;
    name: string;
    description: string;
    basePrice: number;
    baseCost: number;           // Cost to produce/acquire
    baseTimeMinutes: number;    // Time to fulfill
    category: string;           // Product category within business
    qualityFactors: string[];   // Skills that affect quality
    requiresInventory?: boolean;
    inventoryItemId?: string;   // What inventory item is consumed
    inventoryPerUnit?: number;  // How much inventory consumed per unit
    spoilageHours?: number;     // Food: hours before spoiling
}

export interface PricingTier {
    tier: QualityTier;
    priceMultiplier: number;
    costMultiplier: number;
    timeMultiplier: number;
    reputationRequired: number;
}

export const PRICING_TIERS: Record<QualityTier, PricingTier> = {
    basic: { tier: 'basic', priceMultiplier: 0.8, costMultiplier: 0.7, timeMultiplier: 0.8, reputationRequired: 0 },
    standard: { tier: 'standard', priceMultiplier: 1.0, costMultiplier: 1.0, timeMultiplier: 1.0, reputationRequired: 30 },
    premium: { tier: 'premium', priceMultiplier: 1.5, costMultiplier: 1.3, timeMultiplier: 1.2, reputationRequired: 70 },
};

// ============================================================================
// ORDERS
// ============================================================================

export type OrderStatus =
    | 'pending'       // Generated, waiting for player decision
    | 'accepted'      // Player committed to fulfill
    | 'in_progress'   // Being worked on
    | 'completed'     // Successfully fulfilled
    | 'failed'        // Failed to fulfill
    | 'cancelled'     // Rejected by player or customer
    | 'expired';      // Deadline passed without acceptance

export type CustomerType = 'walk_in' | 'regular' | 'business' | 'vip';

export interface Order {
    id: string;
    businessId: string;

    // Customer info
    customerId: string;
    customerName: string;
    customerType: CustomerType;
    customerMood: 'happy' | 'neutral' | 'impatient' | 'demanding';

    // Order contents
    items: OrderItem[];
    totalAmount: number;
    costAmount: number;

    // Status & timing
    status: OrderStatus;
    deadline: string;           // ISO timestamp
    expiresAt: string;          // When pending order disappears

    // Payment
    paymentTerms: PaymentTerms;
    paidAmount: number;
    tipAmount: number;

    // Collection state (optional)
    isCollected?: boolean;
    collectedAt?: string;

    // Quality
    qualityRequirement: QualityTier;
    qualityDelivered?: number;  // 0-100 score

    // Loyalty
    loyaltyLevel: 'new' | 'regular' | 'loyal';

    // Timestamps
    createdAt: string;
    acceptedAt?: string;
    startedAt?: string;
    completedAt?: string;
    failedAt?: string;

    // Scene triggers
    sceneOnAccept?: string;
    sceneOnComplete?: string;
    sceneOnFail?: string;
}

export interface OrderItem {
    productId: string;
    productName: string;
    quantity: number;
    pricePerUnit: number;
    costPerUnit: number;
    qualityTier: QualityTier;
}

export type PaymentType = 'immediate' | 'on_completion' | 'net_days' | 'milestone';

export interface PaymentTerms {
    type: PaymentType;
    upfrontPercent?: number;      // For milestone (0-100)
    netDays?: number;             // For credit terms
    collectionRisk?: number;      // 0-1, probability of non-payment
}

// ============================================================================
// DEMAND SYSTEM
// ============================================================================

export interface DemandConfig {
    baseOrdersPerHour: number;
    maxConcurrentOrders: number;
    maxConcurrentCustomers?: number; // Total capacity for pending + active
    marketScale?: number;         // Theoretical pool (e.g., 1,000,000)

    // Time-based demand curves
    hourlyMultipliers: Record<number, number>;  // Hour (0-23) -> multiplier

    // Reputation impact
    reputationFloor: number;      // Min orders even at 0 rep
    reputationCeiling: number;    // Max boost from reputation

    // Customer mix
    customerTypeProbabilities: Record<CustomerType, number>;

    // Order characteristics
    avgItemsPerOrder: number;
    orderValueRange: { min: number; max: number };
}

export interface MarketEvent {
    id: string;
    name: string;
    description: string;
    demandMultiplier: number;
    durationHours: number;
    affectedProducts?: string[];  // Specific products, or all if empty
}

// ============================================================================
// EXPENSES
// ============================================================================

export type ExpenseCategory =
    | 'rent'
    | 'utilities'
    | 'staff'
    | 'supplies'
    | 'inventory'
    | 'maintenance'
    | 'license'
    | 'loan_payment'
    | 'tax';

export interface Expense {
    id: string;
    businessId: string;
    category: ExpenseCategory;
    amount: number;
    description: string;
    dueAt: string;
    paidAt?: string;
    recurring: boolean;
    frequency?: 'daily' | 'weekly' | 'monthly';
}

// ============================================================================
// BUSINESS STATE
// ============================================================================

export interface BusinessState {
    id: string;
    playerId: string;
    businessTypeId: string;
    businessName: string;

    branding?: {
        themeColor?: string;
        logoUrl?: string;
        icon?: string;
    };

    // Financials
    cashBalance: number;
    totalRevenue: number;
    totalExpenses: number;

    // Reputation
    reputation: number;          // 0-100
    customerSatisfaction: number; // 0-100
    reviewCount: number;

    // Operations
    operatingHours: { open: number; close: number };
    staffCount: number;
    maxConcurrentOrders: number;

    // Workforce
    employees: Employee[];

    // Inventory & Market
    inventory: Record<string, number>; // ItemId -> Quantity
    marketState: MarketState;

    // NEW: Customer Relationships
    customerProfiles?: Record<string, {
        id: string;
        name: string;
        loyaltyScore: number;
        currentTier: number;
        lastOrderDate: string;
        totalOrders: number;
        lifetimeValue: number;
    }>;

    // Recruitment
    recruitmentPool: Employee[];
    lastRecruitmentTime: string;

    // Payroll
    lastPayrollTime: string;

    // Reviews
    reviews: Review[];

    // Active work
    activeOrders: string[];      // Order IDs

    // History
    ordersCompleted: number;
    ordersFailed: number;

    // Timestamps
    createdAt: string;
    lastActiveAt: string;
}

export interface Review {
    id: string;
    orderId: string;
    customerName: string;
    rating: number; // 1-6
    text: string;
    timestamp: string;
}

// ============================================================================
// WORKFORCE
// ============================================================================

export type JobRole = 'manager' | 'specialist' | 'speedster' | 'trainee';

export interface SkillProgress {
    level: number;           // 1-5
    experience: number;      // Current XP
    experienceToNext: number; // XP needed for next level
    totalExperience?: number; // Lifetime XP in this skill
}

export type Specialization = 
    | 'speed_specialist'     // 25% faster fulfillment
    | 'quality_master'       // 25% quality boost
    | 'customer_relations'   // Better loyalty impact
    | 'inventory_expert'     // Reduced waste
    | 'multitasker';         // Can handle 2 orders simultaneously

export interface Employee {
    id: string;
    name: string;
    role: JobRole;
    salaryPerDay: number;
    stats: {
        speed: number;    // 0-100, reduces fulfillment time
        quality: number;  // 0-100, boosts quality score base
        morale: number;   // 0-100, affects reliability
    };
    skills: Record<string, SkillProgress>; // Skill progression system
    specialization?: Specialization;       // Unlocked at skill level 3
    specializationUnlockedAt?: string;
    tasksCompleted: number;                // Track experience
    unpaidWages: number;
    hiredAt: string;
    currentAssignment?: string;            // Current order/task ID
}

// ============================================================================
// MARKETPLACE
// ============================================================================

export interface MarketItem {
    id: string;
    name: string;
    price: number;
    stock: number; // Max 25
    maxStock: number;
    image?: string;
    icon?: string;
}

export interface MarketState {
    lastRestock: string;
    nextRestock: string;
    items: MarketItem[];
}

// ============================================================================
// FAILURE & CONSEQUENCES
// ============================================================================

export type FailureType =
    | 'deadline_missed'
    | 'quality_below_requirement'
    | 'stockout'
    | 'cash_crisis'
    | 'debt_default'
    | 'license_expired';

export interface FailureConsequence {
    type: FailureType;
    reputationPenalty: number;
    financialPenalty: number;
    sceneId?: string;
    recoveryOptions: RecoveryOption[];
}

export interface RecoveryOption {
    id: string;
    name: string;
    description: string;
    cost: number;
    timeHours: number;
    reputationRestore: number;
    sceneId?: string;
}

export const FAILURE_CONSEQUENCES: Record<FailureType, FailureConsequence> = {
    deadline_missed: {
        type: 'deadline_missed',
        reputationPenalty: 20,
        financialPenalty: 0,  // Full refund
        sceneId: 'order_failed_deadline',
        recoveryOptions: [
            { id: 'apologize', name: 'Personal Apology', description: 'Reach out to customer', cost: 0, timeHours: 0.5, reputationRestore: 5 },
        ],
    },
    quality_below_requirement: {
        type: 'quality_below_requirement',
        reputationPenalty: 10,
        financialPenalty: 0.3, // 30% refund
        recoveryOptions: [
            { id: 'redo', name: 'Redo the Job', description: 'Complete again at no charge', cost: 0, timeHours: 2, reputationRestore: 8 },
        ],
    },
    stockout: {
        type: 'stockout',
        reputationPenalty: 15,
        financialPenalty: 0,
        sceneId: 'order_failed_stockout',
        recoveryOptions: [
            { id: 'rush_order', name: 'Rush Resupply', description: 'Emergency inventory purchase', cost: 50, timeHours: 1, reputationRestore: 5 },
        ],
    },
    cash_crisis: {
        type: 'cash_crisis',
        reputationPenalty: 5,
        financialPenalty: 0,
        sceneId: 'cash_crisis_marcus',
        recoveryOptions: [
            { id: 'emergency_loan', name: 'Emergency Loan', description: 'High interest, quick cash', cost: 0, timeHours: 0, reputationRestore: 0 },
            { id: 'sell_inventory', name: 'Fire Sale', description: 'Sell inventory at 50% value', cost: 0, timeHours: 0, reputationRestore: 0 },
        ],
    },
    debt_default: {
        type: 'debt_default',
        reputationPenalty: 30,
        financialPenalty: 0.1, // 10% penalty
        sceneId: 'debt_default_marcus',
        recoveryOptions: [
            { id: 'restructure', name: 'Restructure Debt', description: 'Extend terms, higher interest', cost: 0, timeHours: 24, reputationRestore: 10 },
        ],
    },
    license_expired: {
        type: 'license_expired',
        reputationPenalty: 5,
        financialPenalty: 50, // Fine
        sceneId: 'license_expired_diana',
        recoveryOptions: [
            { id: 'renew', name: 'Renew License', description: 'Pay renewal + late fee', cost: 100, timeHours: 2, reputationRestore: 5 },
        ],
    },
};
