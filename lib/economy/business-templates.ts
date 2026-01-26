/**
 * BrightEd Economy Engine — Business Templates
 * 4 complete business types with Caribbean-themed products and services.
 */

import { BusinessType, ProductTemplate, OperatingCostTemplate, DemandConfig } from './economy-types';

// ============================================================================
// SERVICE BUSINESS: Hair Styling Salon
// ============================================================================

const SALON_PRODUCTS: ProductTemplate[] = [
    {
        id: 'haircut_basic',
        name: 'Basic Haircut',
        description: 'Simple trim and style',
        basePrice: 40,
        baseCost: 5,
        baseTimeMinutes: 30,
        category: 'cuts',
        qualityFactors: ['precision', 'speed'],
    },
    {
        id: 'haircut_fade',
        name: 'Fade & Design',
        description: 'Precision fade with optional design',
        basePrice: 65,
        baseCost: 8,
        baseTimeMinutes: 45,
        category: 'cuts',
        qualityFactors: ['precision', 'creativity'],
    },
    {
        id: 'braids_simple',
        name: 'Simple Braids',
        description: 'Basic cornrows or box braids',
        basePrice: 120,
        baseCost: 25,
        baseTimeMinutes: 120,
        category: 'braiding',
        qualityFactors: ['patience', 'technique'],
    },
    {
        id: 'braids_intricate',
        name: 'Intricate Styles',
        description: 'Complex patterns with extensions',
        basePrice: 250,
        baseCost: 60,
        baseTimeMinutes: 240,
        category: 'braiding',
        qualityFactors: ['patience', 'technique', 'creativity'],
    },
    {
        id: 'color_highlights',
        name: 'Highlights',
        description: 'Partial color treatment',
        basePrice: 100,
        baseCost: 30,
        baseTimeMinutes: 90,
        category: 'color',
        qualityFactors: ['color_theory', 'precision'],
    },
    {
        id: 'color_full',
        name: 'Full Color',
        description: 'Complete color transformation',
        basePrice: 180,
        baseCost: 55,
        baseTimeMinutes: 150,
        category: 'color',
        qualityFactors: ['color_theory', 'precision'],
    },
];

const SALON_COSTS: OperatingCostTemplate = {
    rentPerDay: 60,
    utilitiesPerDay: 20,
    staffPerHour: 15,
    maintenanceChance: 0.02,
};

const SALON_DEMAND: DemandConfig = {
    baseOrdersPerHour: 1.5,
    maxConcurrentOrders: 5,
    maxConcurrentCustomers: 20,
    marketScale: 1000000,
    hourlyMultipliers: {
        8: 0.5, 9: 0.8, 10: 1.0, 11: 1.2, 12: 0.8,
        13: 0.6, 14: 1.0, 15: 1.3, 16: 1.5, 17: 1.2,
        18: 0.8, 19: 0.4, 20: 0.2,
    },
    reputationFloor: 0.3,
    reputationCeiling: 2.0,
    customerTypeProbabilities: { walk_in: 0.4, regular: 0.45, business: 0.05, vip: 0.1 },
    avgItemsPerOrder: 1.2,
    orderValueRange: { min: 40, max: 300 },
};

export const BUSINESS_SALON: BusinessType = {
    id: 'salon',
    category: 'service',
    name: 'Hair Styling Salon',
    description: 'Build your reputation one client at a time. Time is your product — manage your appointments wisely.',
    icon: '/business/salon.png',
    emoji: '💇🏽',
    startingCapital: 800,
    products: SALON_PRODUCTS,
    operatingCosts: SALON_COSTS,
    demandConfig: SALON_DEMAND,
    characterGuide: 'luka',
};

// ============================================================================
// RETAIL BUSINESS: Mini Mart
// ============================================================================

const MINIMART_PRODUCTS: ProductTemplate[] = [
    {
        id: 'grocery_rice',
        name: 'Rice (5kg)',
        description: 'Staple grain',
        basePrice: 35,
        baseCost: 25,
        baseTimeMinutes: 2,
        category: 'grocery',
        qualityFactors: [],
        requiresInventory: true,
        inventoryItemId: 'rice_5kg',
        inventoryPerUnit: 1,
    },
    {
        id: 'grocery_flour',
        name: 'Flour (2kg)',
        description: 'All-purpose flour',
        basePrice: 18,
        baseCost: 12,
        baseTimeMinutes: 1,
        category: 'grocery',
        qualityFactors: [],
        requiresInventory: true,
        inventoryItemId: 'flour_2kg',
        inventoryPerUnit: 1,
    },
    {
        id: 'grocery_oil',
        name: 'Cooking Oil (1L)',
        description: 'Vegetable cooking oil',
        basePrice: 28,
        baseCost: 20,
        baseTimeMinutes: 1,
        category: 'grocery',
        qualityFactors: [],
        requiresInventory: true,
        inventoryItemId: 'oil_1l',
        inventoryPerUnit: 1,
    },
    {
        id: 'beverage_water',
        name: 'Bottled Water',
        description: 'Refreshing purified water',
        basePrice: 5,
        baseCost: 2,
        baseTimeMinutes: 1,
        category: 'beverages',
        qualityFactors: [],
        requiresInventory: true,
        inventoryItemId: 'water_bottle',
        inventoryPerUnit: 1,
    },
    {
        id: 'beverage_juice',
        name: 'Local Juice Box',
        description: 'Tropical fruit punch',
        basePrice: 8,
        baseCost: 4,
        baseTimeMinutes: 1,
        category: 'beverages',
        qualityFactors: [],
        requiresInventory: true,
        inventoryItemId: 'juice_box',
        inventoryPerUnit: 1,
    },
    {
        id: 'beverage_soda',
        name: 'Soft Drink',
        description: 'Carbonated refreshment',
        basePrice: 10,
        baseCost: 5,
        baseTimeMinutes: 1,
        category: 'beverages',
        qualityFactors: [],
        requiresInventory: true,
        inventoryItemId: 'soda_can',
        inventoryPerUnit: 1,
    },
    {
        id: 'household_soap',
        name: 'Dish Soap',
        description: 'Cleaning essential',
        basePrice: 15,
        baseCost: 9,
        baseTimeMinutes: 1,
        category: 'household',
        qualityFactors: [],
        requiresInventory: true,
        inventoryItemId: 'dish_soap',
        inventoryPerUnit: 1,
    },
    {
        id: 'household_tissue',
        name: 'Toilet Paper (4-pack)',
        description: 'Bathroom essential',
        basePrice: 22,
        baseCost: 14,
        baseTimeMinutes: 1,
        category: 'household',
        qualityFactors: [],
        requiresInventory: true,
        inventoryItemId: 'tissue_4pk',
        inventoryPerUnit: 1,
    },
    {
        id: 'snack_chips',
        name: 'Plantain Chips',
        description: 'Crunchy local snack',
        basePrice: 12,
        baseCost: 6,
        baseTimeMinutes: 1,
        category: 'snacks',
        qualityFactors: [],
        requiresInventory: true,
        inventoryItemId: 'plantain_chips',
        inventoryPerUnit: 1,
    },
    {
        id: 'grocery_sugar',
        name: 'Cane Sugar (1kg)',
        description: 'Sweet local sugar',
        basePrice: 15,
        baseCost: 10,
        baseTimeMinutes: 1,
        category: 'grocery',
        qualityFactors: [],
        requiresInventory: true,
        inventoryItemId: 'sugar_1kg',
        inventoryPerUnit: 1,
    },
    {
        id: 'beverage_cole_cold',
        name: 'Cole Cold',
        description: 'Refreshing local soda',
        basePrice: 10,
        baseCost: 5,
        baseTimeMinutes: 1,
        category: 'beverages',
        qualityFactors: [],
        requiresInventory: true,
        inventoryItemId: 'cole_cold',
        inventoryPerUnit: 1,
    },
    {
        id: 'snack_fries',
        name: 'Pack of Fries',
        description: 'Quick-fry side dish',
        basePrice: 15,
        baseCost: 10,
        baseTimeMinutes: 3,
        category: 'snacks',
        qualityFactors: [],
        requiresInventory: true,
        inventoryItemId: 'fries_pack',
        inventoryPerUnit: 1,
    },
    {
        id: 'grocery_peppers',
        name: 'Fresh Peppers',
        description: 'Spicy local peppers',
        basePrice: 10,
        baseCost: 5,
        baseTimeMinutes: 1,
        category: 'grocery',
        qualityFactors: [],
        requiresInventory: true,
        inventoryItemId: 'peppers_fresh',
        inventoryPerUnit: 1,
    },
    {
        id: 'grocery_salt',
        name: 'Sea Salt',
        description: 'Essential seasoning',
        basePrice: 8,
        baseCost: 4,
        baseTimeMinutes: 1,
        category: 'grocery',
        qualityFactors: [],
        requiresInventory: true,
        inventoryItemId: 'salt_pack',
        inventoryPerUnit: 1,
    },
];

const MINIMART_COSTS: OperatingCostTemplate = {
    rentPerDay: 100,
    utilitiesPerDay: 35,
    staffPerHour: 12,
    maintenanceChance: 0.01,
};

const MINIMART_DEMAND: DemandConfig = {
    baseOrdersPerHour: 10,
    maxConcurrentOrders: 15,
    maxConcurrentCustomers: 50,
    marketScale: 1000000,
    hourlyMultipliers: {
        6: 0.3, 7: 0.6, 8: 1.0, 9: 0.8, 10: 0.7, 11: 0.9, 12: 1.3,
        13: 0.9, 14: 0.7, 15: 0.8, 16: 1.2, 17: 1.5, 18: 1.8, 19: 1.2,
        20: 0.8, 21: 0.5, 22: 0.3,
    },
    reputationFloor: 0.2,
    reputationCeiling: 1.8,
    customerTypeProbabilities: { walk_in: 0.7, regular: 0.25, business: 0.03, vip: 0.02 },
    avgItemsPerOrder: 4,
    orderValueRange: { min: 15, max: 150 },
};

export const BUSINESS_MINIMART: BusinessType = {
    id: 'minimart',
    category: 'retail',
    name: 'Mini Mart',
    description: 'Stock smart, price right. Your capital is tied up in inventory — manage it wisely or watch it spoil.',
    icon: '/business/minimart.png',
    emoji: '🏪',
    startingCapital: 1500,
    products: MINIMART_PRODUCTS,
    operatingCosts: MINIMART_COSTS,
    demandConfig: MINIMART_DEMAND,
    characterGuide: 'andre',
};

// ============================================================================
// FOOD BUSINESS: Food Truck
// ============================================================================

const FOODTRUCK_PRODUCTS: ProductTemplate[] = [
    {
        id: 'doubles',
        name: 'Doubles',
        description: 'Classic Trinidad street food — bara with curried channa',
        basePrice: 15,
        baseCost: 5,
        baseTimeMinutes: 3,
        category: 'mains',
        qualityFactors: ['consistency', 'seasoning'],
        requiresInventory: true,
        inventoryItemId: 'doubles_prep',
        inventoryPerUnit: 1,
        spoilageHours: 8,
    },
    {
        id: 'roti_chicken',
        name: 'Chicken Roti',
        description: 'Tender chicken in dhalpuri roti',
        basePrice: 45,
        baseCost: 18,
        baseTimeMinutes: 8,
        category: 'mains',
        qualityFactors: ['consistency', 'seasoning', 'presentation'],
        requiresInventory: true,
        inventoryItemId: 'roti_chicken_prep',
        inventoryPerUnit: 1,
        spoilageHours: 6,
    },
    {
        id: 'roti_veg',
        name: 'Vegetable Roti',
        description: 'Seasoned vegetables in dhalpuri',
        basePrice: 35,
        baseCost: 12,
        baseTimeMinutes: 6,
        category: 'mains',
        qualityFactors: ['consistency', 'seasoning'],
        requiresInventory: true,
        inventoryItemId: 'roti_veg_prep',
        inventoryPerUnit: 1,
        spoilageHours: 6,
    },
    {
        id: 'bake_shark',
        name: 'Bake & Shark',
        description: 'Fried shark in fluffy bake with all the toppings',
        basePrice: 55,
        baseCost: 22,
        baseTimeMinutes: 10,
        category: 'mains',
        qualityFactors: ['frying_skill', 'presentation'],
        requiresInventory: true,
        inventoryItemId: 'shark_prep',
        inventoryPerUnit: 1,
        spoilageHours: 4,
    },
    {
        id: 'pelau',
        name: 'Pelau Plate',
        description: 'One-pot rice with pigeon peas and chicken',
        basePrice: 40,
        baseCost: 15,
        baseTimeMinutes: 5,
        category: 'mains',
        qualityFactors: ['seasoning', 'consistency'],
        requiresInventory: true,
        inventoryItemId: 'pelau_prep',
        inventoryPerUnit: 1,
        spoilageHours: 5,
    },
    {
        id: 'mauby',
        name: 'Mauby',
        description: 'Traditional bark drink, cool and bittersweet',
        basePrice: 10,
        baseCost: 3,
        baseTimeMinutes: 1,
        category: 'drinks',
        qualityFactors: [],
        requiresInventory: true,
        inventoryItemId: 'mauby_batch',
        inventoryPerUnit: 1,
        spoilageHours: 24,
    },
    {
        id: 'sorrel',
        name: 'Sorrel Drink',
        description: 'Tangy hibiscus drink with spices',
        basePrice: 12,
        baseCost: 4,
        baseTimeMinutes: 1,
        category: 'drinks',
        qualityFactors: [],
        requiresInventory: true,
        inventoryItemId: 'sorrel_batch',
        inventoryPerUnit: 1,
        spoilageHours: 24,
    },
    {
        id: 'coconut_water',
        name: 'Fresh Coconut Water',
        description: 'Straight from the shell',
        basePrice: 15,
        baseCost: 5,
        baseTimeMinutes: 2,
        category: 'drinks',
        qualityFactors: [],
        requiresInventory: true,
        inventoryItemId: 'coconut',
        inventoryPerUnit: 1,
        spoilageHours: 48,
    },
];

const FOODTRUCK_COSTS: OperatingCostTemplate = {
    rentPerDay: 0, // Mobile
    utilitiesPerDay: 0,
    fuelPerDay: 45,
    licensePerDay: 8,
    ingredientWastePercent: 0.12, // 12% daily spoilage
    maintenanceChance: 0.03,
};

const FOODTRUCK_DEMAND: DemandConfig = {
    baseOrdersPerHour: 6,
    maxConcurrentOrders: 10,
    maxConcurrentCustomers: 30,
    marketScale: 1000000,
    hourlyMultipliers: {
        6: 0.2, 7: 0.5, 8: 0.8, 9: 0.4, 10: 0.3, 11: 1.2, 12: 2.0,
        13: 1.8, 14: 0.8, 15: 0.4, 16: 0.5, 17: 1.0, 18: 1.5, 19: 1.2,
        20: 0.6, 21: 0.3,
    },
    reputationFloor: 0.4,
    reputationCeiling: 2.5,
    customerTypeProbabilities: { walk_in: 0.85, regular: 0.12, business: 0.02, vip: 0.01 },
    avgItemsPerOrder: 1.5,
    orderValueRange: { min: 10, max: 80 },
};

export const BUSINESS_FOODTRUCK: BusinessType = {
    id: 'foodtruck',
    category: 'food',
    name: 'Food Truck',
    description: 'Rush hours make or break you. Prep smart, serve fast, and pray for no rain. Waste is your enemy.',
    icon: '/business/foodtruck.png',
    emoji: '🚚',
    startingCapital: 700,
    products: FOODTRUCK_PRODUCTS,
    operatingCosts: FOODTRUCK_COSTS,
    demandConfig: FOODTRUCK_DEMAND,
    characterGuide: 'luka',
};

// ============================================================================
// DIGITAL BUSINESS: Freelance Design
// ============================================================================

const FREELANCE_PRODUCTS: ProductTemplate[] = [
    {
        id: 'logo_basic',
        name: 'Basic Logo',
        description: 'Simple text-based or icon logo',
        basePrice: 150,
        baseCost: 0,
        baseTimeMinutes: 180,
        category: 'branding',
        qualityFactors: ['creativity', 'technical_skill', 'communication'],
    },
    {
        id: 'logo_full',
        name: 'Full Brand Package',
        description: 'Logo + color palette + typography + guidelines',
        basePrice: 450,
        baseCost: 0,
        baseTimeMinutes: 480,
        category: 'branding',
        qualityFactors: ['creativity', 'technical_skill', 'communication', 'strategy'],
    },
    {
        id: 'flyer',
        name: 'Flyer/Poster',
        description: 'Single promotional print',
        basePrice: 80,
        baseCost: 0,
        baseTimeMinutes: 90,
        category: 'print',
        qualityFactors: ['creativity', 'layout'],
    },
    {
        id: 'brochure',
        name: 'Brochure (Tri-fold)',
        description: 'Multi-panel print design',
        basePrice: 180,
        baseCost: 0,
        baseTimeMinutes: 180,
        category: 'print',
        qualityFactors: ['creativity', 'layout', 'copywriting'],
    },
    {
        id: 'social_post',
        name: 'Social Media Post',
        description: 'Single graphic for Instagram/Facebook',
        basePrice: 40,
        baseCost: 0,
        baseTimeMinutes: 45,
        category: 'digital',
        qualityFactors: ['creativity', 'trend_awareness'],
    },
    {
        id: 'social_pack',
        name: 'Social Media Pack',
        description: '10 posts + stories templates',
        basePrice: 300,
        baseCost: 0,
        baseTimeMinutes: 360,
        category: 'digital',
        qualityFactors: ['creativity', 'trend_awareness', 'consistency'],
    },
    {
        id: 'website_landing',
        name: 'Landing Page Design',
        description: 'Single-page website mockup',
        basePrice: 350,
        baseCost: 0,
        baseTimeMinutes: 300,
        category: 'web',
        qualityFactors: ['ux_skill', 'creativity', 'technical_skill'],
    },
    {
        id: 'presentation',
        name: 'Pitch Deck',
        description: '10-15 slide presentation design',
        basePrice: 200,
        baseCost: 0,
        baseTimeMinutes: 180,
        category: 'business',
        qualityFactors: ['layout', 'storytelling'],
    },
];

const FREELANCE_COSTS: OperatingCostTemplate = {
    rentPerDay: 0, // Work from home
    utilitiesPerDay: 0,
    softwarePerMonth: 120, // Creative Cloud, etc.
    maintenanceChance: 0.01,
};

const FREELANCE_DEMAND: DemandConfig = {
    baseOrdersPerHour: 0.3,
    maxConcurrentOrders: 5,
    maxConcurrentCustomers: 10,
    marketScale: 1000000,
    hourlyMultipliers: {
        9: 1.2, 10: 1.5, 11: 1.3, 12: 0.8, 13: 0.6,
        14: 1.0, 15: 1.4, 16: 1.2, 17: 0.8, 18: 0.4,
    },
    reputationFloor: 0.1, // Heavily reputation-dependent
    reputationCeiling: 3.0,
    customerTypeProbabilities: { walk_in: 0.2, regular: 0.3, business: 0.4, vip: 0.1 },
    avgItemsPerOrder: 1.3,
    orderValueRange: { min: 40, max: 500 },
};

export const BUSINESS_FREELANCE: BusinessType = {
    id: 'freelance_design',
    category: 'digital',
    name: 'Freelance Design Studio',
    description: 'Your reputation is everything. Deliver quality, meet deadlines, and watch referrals roll in. Miss a deadline and watch them dry up.',
    icon: '/business/freelance.png',
    emoji: '🎨',
    startingCapital: 400,
    products: FREELANCE_PRODUCTS,
    operatingCosts: FREELANCE_COSTS,
    demandConfig: FREELANCE_DEMAND,
    characterGuide: 'luka',
};

// ============================================================================
// BUSINESS REGISTRY
// ============================================================================

export const ALL_BUSINESS_TYPES: BusinessType[] = [
    BUSINESS_SALON,
    BUSINESS_MINIMART,
    BUSINESS_FOODTRUCK,
    BUSINESS_FREELANCE,
];

export const BUSINESS_TYPE_MAP: Record<string, BusinessType> = {
    salon: BUSINESS_SALON,
    minimart: BUSINESS_MINIMART,
    foodtruck: BUSINESS_FOODTRUCK,
    freelance_design: BUSINESS_FREELANCE,
};

export function getBusinessType(id: string): BusinessType | undefined {
    return BUSINESS_TYPE_MAP[id];
}

export function getBusinessTypesByCategory(category: string): BusinessType[] {
    return ALL_BUSINESS_TYPES.filter(b => b.category === category);
}

export function getProductsForBusiness(businessTypeId: string): ProductTemplate[] {
    const business = getBusinessType(businessTypeId);
    return business?.products ?? [];
}
