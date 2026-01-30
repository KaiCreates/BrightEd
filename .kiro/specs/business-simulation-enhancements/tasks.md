# Implementation Plan: Business Simulation Enhancements

## Overview

This implementation plan breaks down the business simulation enhancements into discrete TypeScript coding tasks. The approach follows an incremental strategy: build core systems first, add interconnections, then implement UI and feedback layers. Each task builds on previous work, with property-based tests validating correctness at each step.

The implementation prioritizes system integration—ensuring that changes in one system cascade appropriately to dependent systems. Testing tasks are marked optional to allow for faster MVP development if needed.

## Tasks

- [x] 1. Set up project structure and core types
  - Create TypeScript project structure with src/, tests/, and types/ directories
  - Define core interfaces: GameState, Business, Employee, Customer, Order, FinancialState
  - Set up testing framework (Jest or Vitest) with property-based testing library (fast-check)
  - Create utility types for common patterns (Skill, Specialization, LoyaltyTier)
  - _Requirements: 1.1, 2.1, 3.1, 5.1, 7.1, 9.1, 11.1_

- [ ] 2. Implement Onboarding System
  - [-] 2.1 Create BusinessTemplate and TemplateLibrary classes
    - Implement template data structure with all required fields
    - Create template library with predefined templates (Tech Startup, Retail Shop, Manufacturing)
    - Implement template selection and validation
    - _Requirements: 1.3, 1.4_
  
  - [ ] 2.2 Write property test for template initialization round trip
    - **Property 1: Template Initialization Round Trip**
    - **Validates: Requirements 1.4, 1.5**
  
  - [ ] 2.3 Create TutorialSequence and OnboardingState classes
    - Implement tutorial step definitions and progression logic
    - Create onboarding state tracking
    - Implement step completion and unlock logic
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ] 2.4 Write unit tests for onboarding flow
    - Test template initialization with various templates
    - Test tutorial step progression
    - Test error handling for invalid selections
    - _Requirements: 1.4, 2.3_

- [ ] 3. Implement Economy System - Pricing Engine
  - [ ] 3.1 Create SupplyDemandCurve class
    - Implement price calculation based on supply and demand
    - Implement supply and demand update methods
    - Implement elasticity and base price properties
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [ ] 3.2 Write property test for supply/demand inverse relationship
    - **Property 2: Supply/Demand Inverse Relationship**
    - **Validates: Requirements 3.2, 3.3**
  
  - [ ] 3.3 Create PricingEngine class
    - Implement price calculation for all products
    - Implement price history tracking
    - Implement trend indicator calculation
    - _Requirements: 3.1, 3.5, 3.6_
  
  - [ ] 3.4 Write unit tests for pricing calculations
    - Test price changes with various supply/demand ratios
    - Test trend indicator accuracy
    - Test edge cases (zero supply, zero demand)
    - _Requirements: 3.1, 3.6_

- [ ] 4. Implement Economy System - Market Events
  - [ ] 4.1 Create MarketEvent and EventSystem classes
    - Implement market event types (competitor_entry, supply_shortage, demand_surge, price_war)
    - Implement event generation with probability and severity
    - Implement event application to game state
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [ ] 4.2 Write unit tests for market events
    - Test event generation and notification
    - Test event effects on supply and demand
    - Test event response tracking
    - _Requirements: 4.1, 4.5_

- [ ] 5. Implement Employee System - Skill Progression
  - [ ] 5.1 Create Skill and Employee classes
    - Implement skill tracking with level and experience
    - Implement experience award logic based on task difficulty
    - Implement skill level progression from experience
    - _Requirements: 5.1, 5.2_
  
  - [ ] 5.2 Write property test for skill progression from experience
    - **Property 3: Skill Progression from Experience**
    - **Validates: Requirements 5.1, 5.2, 5.3**
  
  - [ ] 5.3 Create SpecializationSystem class
    - Implement specialization unlock at skill level 3
    - Implement specialization assignment and bonus application
    - Implement role-specific task unlocking
    - _Requirements: 5.3, 5.4, 6.1, 6.2_
  
  - [ ] 5.4 Write unit tests for employee skills and specialization
    - Test experience award and skill progression
    - Test specialization unlock at level 3
    - Test specialization bonus application (25% for match, 15% penalty for non-match)
    - _Requirements: 5.1, 6.3, 6.4_

- [ ] 6. Implement Order System - Order Generation and Quality
  - [ ] 6.1 Create Order and OrderGenerator classes
    - Implement order data structure with narrative context
    - Implement order generation with random narrative context
    - Implement order requirement definition (quality, speed, specialization)
    - _Requirements: 7.1, 7.2_
  
  - [ ] 6.2 Create OrderFulfillmentEngine class
    - Implement fulfillment quality evaluation based on time, resources, and employee skills
    - Implement quality bonus and penalty calculation
    - Implement failure detection and reputation penalty
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ] 6.3 Write property test for order quality determinism
    - **Property 4: Order Quality Determinism**
    - **Validates: Requirements 8.1, 8.2, 8.3**
  
  - [ ] 6.4 Create NarrativeEngine class
    - Implement narrative consequence generation for excellent fulfillment
    - Implement narrative consequence generation for poor fulfillment
    - Implement consequence application to loyalty and order availability
    - _Requirements: 7.3, 7.4, 7.5_
  
  - [ ] 6.5 Write unit tests for order fulfillment
    - Test quality evaluation with various inputs
    - Test narrative consequence generation
    - Test failure handling and reputation penalties
    - _Requirements: 8.1, 8.5_

- [ ] 7. Implement Loyalty System
  - [ ] 7.1 Create CustomerProfile and LoyaltyTracker classes
    - Implement customer profile with loyalty score tracking
    - Implement loyalty score updates (increase 10-20 for excellent, decrease 15-30 for poor)
    - Implement loyalty decay over time without orders
    - _Requirements: 9.1, 9.2, 9.5_
  
  - [ ] 7.2 Write property test for loyalty score changes from service quality
    - **Property 5: Loyalty Score Changes from Service Quality**
    - **Validates: Requirements 9.1, 9.2**
  
  - [ ] 7.3 Create LoyaltyTierSystem class
    - Implement loyalty tier progression (tier 1 at 25, tier 2 at 50, tier 3 at 75, tier 4 at 100)
    - Implement tier-specific benefits (5%, 10%, 15%, 20% margin bonuses)
    - Implement tier unlock notifications and benefit application
    - _Requirements: 9.3, 10.1, 10.2, 10.3, 10.4_
  
  - [ ] 7.4 Write property test for loyalty tier unlock at thresholds
    - **Property 10: Loyalty Tier Unlock at Thresholds**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4**
  
  - [ ] 7.5 Create LoyaltyRewardEngine class
    - Implement higher-margin opportunity calculation for loyal customers
    - Implement exclusive product availability for high-tier customers
    - Implement referral bonus calculation
    - _Requirements: 9.4, 10.1, 10.2, 10.3, 10.4_
  
  - [ ] 7.6 Write unit tests for loyalty system
    - Test loyalty score updates with various service qualities
    - Test tier progression at exact thresholds
    - Test benefit application and margin bonuses
    - _Requirements: 9.1, 9.2, 10.1_

- [ ] 8. Implement Financial System - Metrics and Tracking
  - [ ] 8.1 Create FinancialTracker and MetricsCalculator classes
    - Implement transaction recording (revenue and expense)
    - Implement financial metric calculation (revenue, expenses, profit, margin, ROI, market share)
    - Implement metric update within 1 game tick
    - _Requirements: 11.1, 11.2, 11.5_
  
  - [ ] 8.2 Write property test for financial metric calculation accuracy
    - **Property 6: Financial Metric Calculation Accuracy**
    - **Validates: Requirements 11.1, 11.2, 11.5**
  
  - [ ] 8.3 Create ForecastEngine class
    - Implement 5-turn financial forecast generation
    - Implement revenue projection based on orders and customer loyalty
    - Implement expense projection based on employee salaries and operational costs
    - Implement forecast update on market condition changes
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
  
  - [ ] 8.4 Write property test for forecast accuracy
    - **Property 8: Forecast Accuracy**
    - **Validates: Requirements 12.2, 12.3, 12.4**
  
  - [ ] 8.5 Write unit tests for financial system
    - Test metric calculation with various transaction types
    - Test forecast generation and updates
    - Test edge cases (zero revenue, negative cash flow)
    - _Requirements: 11.1, 12.1_

- [ ] 9. Implement System Integration and Cascading Effects
  - [ ] 9.1 Create GameStateManager class
    - Implement central state management and update coordination
    - Implement event-driven architecture for cascading updates
    - Implement state consistency validation
    - _Requirements: 13.1, 13.2, 13.3, 13.4_
  
  - [ ] 9.2 Implement pricing → demand cascade
    - When pricing changes, update customer demand and order frequency
    - Update financial projections based on new demand
    - _Requirements: 13.1_
  
  - [ ] 9.3 Implement employee investment → quality cascade
    - When employee skills improve, update order fulfillment quality
    - Update customer loyalty based on improved quality
    - _Requirements: 13.2_
  
  - [ ] 9.4 Implement loyalty → order cascade
    - When customer loyalty increases, increase order frequency and margin opportunities
    - Update financial projections based on new order patterns
    - _Requirements: 13.3_
  
  - [ ] 9.5 Implement market event → multi-system cascade
    - When market events occur, update pricing, demand, and employee workload simultaneously
    - Update financial projections based on cascading effects
    - _Requirements: 13.4_
  
  - [ ] 9.6 Write property test for system cascade effects
    - **Property 7: System Cascade Effects**
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.4**
  
  - [ ] 9.7 Write integration tests for system interconnections
    - Test pricing adjustment cascades to demand and projections
    - Test employee investment cascades to quality and loyalty
    - Test loyalty changes cascade to orders and revenue
    - Test market events cascade across all systems
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [ ] 10. Implement UI Integration and Display
  - [ ] 10.1 Create dashboard components for financial metrics
    - Implement metric display with current values and trends
    - Implement metric breakdown showing contributing factors
    - Implement forecast display with 5-turn projections
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 12.1_
  
  - [ ] 10.2 Create employee management UI
    - Implement employee profile display with skills and specialization
    - Implement team composition view with role distribution and skill gaps
    - Implement specialization assignment interface
    - _Requirements: 5.5, 6.5_
  
  - [ ] 10.3 Create customer profile UI
    - Implement customer profile display with loyalty tier and score
    - Implement loyalty reward display
    - Implement order history and margin bonus display
    - _Requirements: 9.4, 10.5_
  
  - [ ] 10.4 Create order display and fulfillment UI
    - Implement order display with narrative context and requirements
    - Implement fulfillment quality summary with impact explanation
    - Implement consequence display showing loyalty and reputation changes
    - _Requirements: 7.2, 8.5_
  
  - [ ] 10.5 Create interconnection visualization
    - Implement display of system interconnections and cascading effects
    - Implement impact preview when player hovers over decisions
    - _Requirements: 13.5_

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all unit tests pass
  - Ensure all property-based tests pass with minimum 100 iterations
  - Verify no console errors or warnings
  - Ask the user if questions arise

- [ ] 12. Implement persistence and save/load
  - [ ] 12.1 Create GameStatePersistence class
    - Implement JSON serialization of all game state
    - Implement save to local storage or database
    - Implement load from storage with state validation
    - _Requirements: 1.5_
  
  - [ ] 12.2 Write property test for save/load round trip
    - **Property 1: Template Initialization Round Trip** (extended to full game state)
    - **Validates: Requirements 1.5**
  
  - [ ] 12.3 Write unit tests for persistence
    - Test save and load with various game states
    - Test state validation and repair on load
    - Test error handling for corrupted saves
    - _Requirements: 1.5_

- [ ] 13. Implement error handling and recovery
  - [ ] 13.1 Add validation for all state transitions
    - Validate template selection
    - Validate employee assignments
    - Validate order fulfillment
    - _Requirements: 1.4, 6.1, 8.1_
  
  - [ ] 13.2 Implement cascade failure recovery
    - Implement rollback on cascade failures
    - Implement error logging and reporting
    - _Requirements: 13.1, 13.2, 13.3, 13.4_
  
  - [ ] 13.3 Implement state consistency checks
    - Validate financial metrics consistency
    - Validate employee skill consistency
    - Validate loyalty score consistency
    - _Requirements: 11.1, 5.1, 9.1_

- [ ] 14. Final checkpoint - Ensure all tests pass and systems integrate
  - Ensure all unit tests pass
  - Ensure all property-based tests pass
  - Verify system cascades work correctly
  - Verify UI displays all interconnections
  - Ask the user if questions arise

## Notes

- All tasks are required and include comprehensive testing from the start
- Each task references specific requirements for traceability
- Property-based tests validate universal correctness properties across all inputs
- Unit tests validate specific examples and edge cases
- Checkpoints ensure incremental validation and catch integration issues early
- System integration tasks (9.x) are critical for the interconnected gameplay experience
- UI tasks (10.x) should be implemented after core systems are working and tested

