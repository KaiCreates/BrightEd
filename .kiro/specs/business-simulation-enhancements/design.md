# Design Document: Business Simulation Enhancements

## Overview

This design document describes a comprehensive enhancement to a business simulation system that integrates six interconnected subsystems: Registration & Onboarding, Economy Mechanics, Employee Systems, Order Engagement, Customer Loyalty, and Financial Feedback. The design emphasizes tight coupling between systems so that player decisions cascade across multiple areas, creating emergent gameplay where strategic choices in one domain affect outcomes in others.

The architecture uses an event-driven model where game state changes trigger cascading updates across dependent systems. A central Game State Manager coordinates updates, ensuring consistency and enabling predictable feedback loops.

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Game State Manager                        │
│  (Coordinates updates, maintains consistency, triggers events)   │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Onboarding  │  │   Economy    │  │  Employees   │
│   System     │  │   System     │  │   System     │
└──────────────┘  └──────────────┘  └──────────────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│    Orders    │  │   Loyalty    │  │  Financial   │
│   System     │  │   System     │  │   System     │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Event Flow

1. **Player Action** → Game State Manager
2. **State Update** → Affected Systems
3. **Cascading Updates** → Dependent Systems
4. **UI Refresh** → Display Changes to Player

### System Interactions

- **Economy ↔ Orders**: Market prices affect order profitability; order volume affects demand curves
- **Employees ↔ Orders**: Employee skills affect fulfillment quality; order complexity affects skill growth
- **Orders ↔ Loyalty**: Fulfillment quality affects customer loyalty; loyalty affects order availability
- **Loyalty ↔ Financial**: Loyal customers provide higher margins; financial health enables loyalty investments
- **Employees ↔ Financial**: Employee salaries are expenses; skilled employees improve profitability
- **Economy ↔ Financial**: Market prices affect revenue; financial health affects pricing strategy

## Components and Interfaces

### 1. Onboarding System

**Purpose**: Guide new players through business creation and initial gameplay

**Components**:
- `BusinessPreviewController`: Manages interactive preview experience
- `TemplateLibrary`: Stores and retrieves business templates
- `TutorialSequence`: Manages tutorial steps and progression
- `OnboardingState`: Tracks player progress through onboarding

**Key Interfaces**:

```
interface BusinessTemplate {
  id: string
  name: string
  description: string
  startingCapital: number
  initialEmployees: Employee[]
  initialInventory: Inventory
  industryType: string
}

interface TutorialStep {
  id: string
  title: string
  description: string
  highlightedElements: UIElement[]
  successCondition: () => boolean
  nextStepId: string | null
}

interface OnboardingState {
  currentStep: TutorialStep | null
  completedSteps: string[]
  isComplete: boolean
  selectedTemplate: BusinessTemplate | null
}
```

### 2. Economy System

**Purpose**: Manage dynamic pricing, supply/demand curves, and market events

**Components**:
- `PricingEngine`: Calculates prices based on supply, demand, and market conditions
- `SupplyDemandCurve`: Models market dynamics for each product
- `EventSystem`: Generates and applies market events
- `MarketState`: Tracks current market conditions

**Key Interfaces**:

```
interface SupplyDemandCurve {
  productId: string
  basePrice: number
  currentSupply: number
  currentDemand: number
  elasticity: number
  calculatePrice(): number
  updateSupply(delta: number): void
  updateDemand(delta: number): void
}

interface MarketEvent {
  id: string
  type: 'competitor_entry' | 'supply_shortage' | 'demand_surge' | 'price_war'
  severity: 'low' | 'medium' | 'high'
  affectedProducts: string[]
  duration: number
  apply(state: GameState): void
}

interface PricingResult {
  productId: string
  price: number
  priceChange: number
  trend: 'rising' | 'falling' | 'stable'
  reason: string
}
```

### 3. Employee System

**Purpose**: Manage employee skills, experience, and specialization

**Components**:
- `EmployeeManager`: Manages employee roster and assignments
- `SkillSystem`: Tracks skill levels and experience
- `SpecializationSystem`: Manages specialization unlocks and bonuses
- `EmployeeState`: Represents individual employee data

**Key Interfaces**:

```
interface Skill {
  id: string
  name: string
  level: number
  experience: number
  experienceToNextLevel: number
}

interface Specialization {
  id: string
  skillId: string
  name: string
  performanceBonus: number
  unlockedTasks: string[]
}

interface Employee {
  id: string
  name: string
  skills: Map<string, Skill>
  specialization: Specialization | null
  salary: number
  currentAssignment: string | null
  awardExperience(skillId: string, amount: number): void
  canPerformTask(taskId: string): boolean
  getPerformanceModifier(taskId: string): number
}
```

### 4. Order System

**Purpose**: Manage customer orders with narrative context and quality evaluation

**Components**:
- `OrderGenerator`: Creates orders with narrative context
- `OrderFulfillmentEngine`: Evaluates fulfillment quality
- `NarrativeEngine`: Generates narrative consequences
- `OrderState`: Represents individual order data

**Key Interfaces**:

```
interface Order {
  id: string
  customerId: string
  productId: string
  quantity: number
  dueDate: number
  baseReward: number
  narrative: string
  requirements: OrderRequirement[]
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
}

interface OrderRequirement {
  type: 'quality' | 'speed' | 'specialization'
  value: number
  description: string
}

interface FulfillmentResult {
  orderId: string
  quality: number // 0-100
  onTime: boolean
  qualityBonus: number
  loyaltyImpact: number
  narrativeConsequence: string
}
```

### 5. Loyalty System

**Purpose**: Track customer loyalty and provide tier-based rewards

**Components**:
- `LoyaltyTracker`: Manages customer loyalty scores
- `LoyaltyTierSystem`: Manages tier progression and benefits
- `LoyaltyRewardEngine`: Calculates loyalty-based bonuses
- `CustomerProfile`: Represents customer data

**Key Interfaces**:

```
interface LoyaltyTier {
  tier: number
  minScore: number
  marginBonus: number
  benefits: string[]
  unlockMessage: string
}

interface CustomerProfile {
  id: string
  name: string
  loyaltyScore: number
  currentTier: number
  lastOrderDate: number
  totalOrders: number
  updateLoyalty(delta: number): void
  getCurrentTier(): LoyaltyTier
  getMarginBonus(): number
}
```

### 6. Financial System

**Purpose**: Track financial metrics and provide forecasting

**Components**:
- `FinancialTracker`: Tracks revenue, expenses, and profit
- `ForecastEngine`: Projects future financial performance
- `MetricsCalculator`: Calculates key financial metrics
- `FinancialState`: Represents financial data

**Key Interfaces**:

```
interface FinancialMetrics {
  revenue: number
  expenses: number
  profit: number
  cashFlow: number
  profitMargin: number
  roi: number
  marketShare: number
}

interface FinancialForecast {
  turn: number
  projectedRevenue: number
  projectedExpenses: number
  projectedProfit: number
  confidence: number
  factors: string[]
}

interface FinancialState {
  currentMetrics: FinancialMetrics
  forecast: FinancialForecast[]
  recordTransaction(type: 'revenue' | 'expense', amount: number, source: string): void
  calculateMetrics(): FinancialMetrics
  generateForecast(turns: number): FinancialForecast[]
}
```

## Data Models

### Core Game State

```
interface GameState {
  businessId: string
  currentTurn: number
  business: Business
  employees: Employee[]
  customers: CustomerProfile[]
  orders: Order[]
  inventory: Inventory
  marketState: MarketState
  financialState: FinancialState
  onboardingState: OnboardingState
}

interface Business {
  id: string
  name: string
  industry: string
  foundedTurn: number
  capital: number
  reputation: number
}

interface Inventory {
  items: Map<string, InventoryItem>
  addItem(productId: string, quantity: number): void
  removeItem(productId: string, quantity: number): void
  getQuantity(productId: string): number
}

interface InventoryItem {
  productId: string
  quantity: number
  costPerUnit: number
}
```

### Persistence Model

All game state must be serializable to JSON for storage and recovery:
- Business data
- Employee roster with skill progression
- Customer profiles with loyalty history
- Financial records
- Completed orders and consequences
- Market state snapshots

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

Before writing the correctness properties, I need to analyze the acceptance criteria for testability. Let me use the prework tool to formalize this analysis.


### Acceptance Criteria Testing Prework

Based on the requirements, I've analyzed each acceptance criterion for testability. The analysis shows that nearly all criteria are testable as properties or examples. Key findings:

- **Template System**: Template selection correctly initializes all business state fields (property)
- **Pricing Engine**: Supply/demand relationships are inverse (property)
- **Employee Skills**: Experience accumulation leads to skill progression (property)
- **Order Quality**: Quality evaluation is deterministic based on inputs (property)
- **Loyalty System**: Loyalty changes are proportional to service quality (property)
- **Financial Metrics**: Metrics are calculated correctly and update within timing constraints (property)
- **System Integration**: Changes in one system cascade to dependent systems (property)

### Property Reflection

After analyzing all criteria, I've identified the following key properties that provide comprehensive coverage without redundancy:

**Core Properties** (non-redundant, high-value):
1. Template initialization round-trip (save/load consistency)
2. Supply/demand inverse relationship
3. Skill progression from experience accumulation
4. Order quality determinism
5. Loyalty score changes from service quality
6. Financial metric calculation accuracy
7. System cascade effects from player actions
8. Forecast accuracy based on current state
9. Specialization bonus application
10. Tier unlock at specific thresholds

These properties cover all major systems and their interactions without duplication.

## Correctness Properties

### Property 1: Template Initialization Round Trip
*For any* business template, creating a business from that template and then saving/loading should produce equivalent business state with all fields (capital, employees, inventory) correctly initialized.

**Validates: Requirements 1.4, 1.5**

### Property 2: Supply/Demand Inverse Relationship
*For any* product with a supply/demand curve, when supply increases while demand remains constant, the calculated price should decrease; conversely, when demand increases while supply remains constant, the price should increase.

**Validates: Requirements 3.2, 3.3**

### Property 3: Skill Progression from Experience
*For any* employee, accumulating experience points in a skill should monotonically increase that skill's level, and reaching experience thresholds should unlock specialization options.

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 4: Order Quality Determinism
*For any* order with fixed requirements (time, quality, specialization), fulfilling it with the same employee and resource allocation should produce the same quality score and loyalty impact.

**Validates: Requirements 8.1, 8.2, 8.3**

### Property 5: Loyalty Score Changes from Service Quality
*For any* customer, providing excellent service (on-time, high quality) should increase loyalty score by 10-20 points, while poor service should decrease it by 15-30 points, and loyalty changes should be proportional to service quality.

**Validates: Requirements 9.1, 9.2**

### Property 6: Financial Metric Calculation Accuracy
*For any* game state, the calculated financial metrics (revenue, expenses, profit, margin) should be consistent with underlying transactions, and metrics should update within 1 game tick of state changes.

**Validates: Requirements 11.1, 11.2, 11.5**

### Property 7: System Cascade Effects
*For any* player action (pricing adjustment, employee investment, loyalty change), the system should cascade effects to dependent systems (demand, quality, order frequency) such that interconnected metrics change appropriately.

**Validates: Requirements 13.1, 13.2, 13.3, 13.4**

### Property 8: Forecast Accuracy
*For any* financial forecast, the projected revenue should be based on current orders and customer loyalty, projected expenses should be based on employee salaries and operational costs, and forecasts should update when market conditions change.

**Validates: Requirements 12.2, 12.3, 12.4**

### Property 9: Specialization Bonus Application
*For any* employee with a specialization, performing a task matching their specialization should apply a 25% performance bonus, while non-specialized employees attempting specialty tasks should apply a 15% penalty.

**Validates: Requirements 6.3, 6.4**

### Property 10: Loyalty Tier Unlock at Thresholds
*For any* customer, reaching loyalty score thresholds (25, 50, 75, 100) should unlock corresponding tier benefits (5%, 10%, 15%, 20% margin bonuses respectively), and tier progression should be monotonic.

**Validates: Requirements 10.1, 10.2, 10.3, 10.4**

## Error Handling

### Validation Errors
- **Invalid Template Selection**: If a template ID doesn't exist, return error and display available templates
- **Insufficient Funds**: If a player attempts to hire employees without capital, prevent action and display cash requirement
- **Invalid Skill Assignment**: If an employee lacks required skill level for specialization, prevent assignment and display requirement
- **Order Fulfillment Failure**: If fulfillment fails due to missing resources, mark order as failed and apply reputation penalty

### State Consistency Errors
- **Cascade Failure**: If a system cascade fails (e.g., price update fails), rollback all changes and log error
- **Persistence Failure**: If save/load fails, maintain last known good state and alert player
- **Timing Violation**: If update exceeds timing constraint (1 game tick), log warning and continue with delayed update

### Recovery Strategies
- **Automatic Retry**: Retry failed operations up to 3 times with exponential backoff
- **Graceful Degradation**: If forecast calculation fails, display last valid forecast with warning
- **State Repair**: On load, validate all state and repair inconsistencies (e.g., negative inventory)

## Testing Strategy

### Dual Testing Approach

This system requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests** (specific examples and edge cases):
- Template initialization with various industry types
- Loyalty tier transitions at exact threshold values
- Employee specialization unlock at skill level 3
- Order failure scenarios (missing resources, late delivery)
- Financial metric edge cases (zero revenue, negative cash flow)
- Market event application and recovery

**Property-Based Tests** (universal properties across all inputs):
- Template round-trip consistency (Property 1)
- Supply/demand inverse relationship (Property 2)
- Skill progression monotonicity (Property 3)
- Order quality determinism (Property 4)
- Loyalty score proportionality (Property 5)
- Financial metric consistency (Property 6)
- System cascade effects (Property 7)
- Forecast accuracy (Property 8)
- Specialization bonus application (Property 9)
- Loyalty tier monotonicity (Property 10)

### Property-Based Testing Configuration

**Framework**: Use a property-based testing library appropriate for the implementation language (e.g., Hypothesis for Python, fast-check for TypeScript, QuickCheck for Haskell)

**Test Configuration**:
- Minimum 100 iterations per property test
- Generators for all domain types (templates, employees, orders, customers)
- Shrinking enabled to find minimal failing examples
- Timeout: 5 seconds per test

**Test Tagging**:
Each property test must include a comment with:
```
Feature: business-simulation-enhancements, Property N: [Property Title]
Validates: Requirements X.Y, X.Z
```

**Example Property Test Structure**:
```
// Feature: business-simulation-enhancements, Property 2: Supply/Demand Inverse Relationship
// Validates: Requirements 3.2, 3.3
test("supply_demand_inverse_relationship", () => {
  forAll(
    arbitrarySupplyDemandCurve(),
    (curve) => {
      const initialPrice = curve.calculatePrice();
      
      // Increase supply, demand constant
      curve.updateSupply(100);
      const priceAfterSupplyIncrease = curve.calculatePrice();
      
      // Reset and increase demand instead
      curve.updateSupply(-100);
      curve.updateDemand(100);
      const priceAfterDemandIncrease = curve.calculatePrice();
      
      return priceAfterSupplyIncrease < initialPrice &&
             priceAfterDemandIncrease > initialPrice;
    }
  );
});
```

### Test Coverage Goals

- **Functional Coverage**: All 10 correctness properties implemented as property tests
- **Edge Case Coverage**: Unit tests for boundary conditions (tier thresholds, skill levels, etc.)
- **Integration Coverage**: Tests verifying system cascades and interconnections
- **Performance Coverage**: Tests verifying timing constraints (1 game tick updates)

