# BrightEd Stories Engine — Architecture & Design

**Role:** Subject-agnostic experiential learning engine. Consequence-based simulations.  
**Separation:** Stories & Simulation System only. Whiteboard = notes, reflection, no timers/economy.  
**Philosophy:** Practice before theory. Friction teaches. Failure allowed. Time matters. Ethics matter.

---

## 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BRIGHTED PLATFORM                                   │
├──────────────────────────────────┬──────────────────────────────────────────┤
│     WHITEBOARD SYSTEM            │     STORIES & SIMULATION SYSTEM           │
│  (Notes, collaboration, reflect) │  (Consequence-based, time, economy, NPCs) │
│  No timers • No economy • Calm   │  ← STORIES ENGINE                         │
└──────────────────────────────────┴──────────────────────────────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
                    ▼                         ▼                         ▼
            ┌───────────────┐         ┌───────────────┐         ┌───────────────┐
            │ Player State  │         │ Time System   │         │ Consequence   │
            │ Skills, Rep,  │         │ Real+Sim      │         │ Engine        │
            │ Resources     │         │ Delays, Penalty│         │ Rules-driven  │
            └───────────────┘         └───────────────┘         └───────────────┘
                    │                         │                         │
                    └─────────────────────────┼─────────────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
                    ▼                         ▼                         ▼
            ┌───────────────┐         ┌───────────────┐         ┌───────────────┐
            │ NPC System    │         │ Difficulty    │         │ Reflection    │
            │ Roles, memory,│         │ Scaling       │         │ Checkpoints   │
            │ Reputation    │         │ Silent adapt  │         │ → Whiteboard  │
            └───────────────┘         └───────────────┘         └───────────────┘
                    │                         │                         │
                    └─────────────────────────┴─────────────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
                    ▼                         ▼                         ▼
            ┌───────────────┐         ┌───────────────┐         ┌───────────────┐
            │ Business &    │         │ Science Labs  │         │ Stock Market  │
            │ Financial     │  ← P1   │ (future)      │         │ (future)      │
            │ Literacy      │         │               │         │               │
            └───────────────┘         └───────────────┘         └───────────────┘
```

**Data flow:**  
Client (Stories tab) → API (`/api/stories/*`) → Engine modules → Prisma/Store → Response.  
Reflection data exports to Whiteboard (structured payload); Whiteboard never drives Stories mechanics.

---

## 2. Core Engine Modules (Responsibilities)

| Module | Path | Responsibility |
|--------|------|----------------|
| **Player State** | `lib/stories-engine/player.ts` | Age/level bracket, skills, reputation (NPCs, institutions, markets), resources (B-Coins, time, inventory, energy), active consequences. Persist across sessions. |
| **Time System** | `lib/stories-engine/time.ts` | Real + simulated hybrid. Delays (registration, loans, market shifts). Offline progression where appropriate. Per-simulation config. No free skip. |
| **Consequence Engine** | `lib/stories-engine/consequence-engine.ts` | Log decisions → resolve rules → immediate/delayed outcomes. Affect money, reputation, access. Rules-driven, not hardcoded. |
| **Resource Manager** | `lib/stories-engine/resources.ts` | B-Coins, inventory, opportunity cost, maintenance, risk exposure. Tight early-game. |
| **NPC System** | `lib/stories-engine/npc.ts` | Roles (banker, supplier, teacher, regulator, client). Memory of past interactions. React to reputation & tone. Bureaucracy, realism. |
| **Difficulty Scaling** | `lib/stories-engine/difficulty.ts` | Scale by age, past decisions, skill mastery, risk appetite. No easy/hard toggle; silent adaptation. |
| **Reflection** | `lib/stories-engine/reflection.ts` | Post-major-event logs, teachable moments, structured export to Whiteboard. Never mid-action. |
| **Event Bus** | `lib/stories-engine/events.ts` | Internal event-driven flow. Decisions, time ticks, consequences, NPC reactions. |

---

## 3. Data Models

### 3.1 Player & Profile (Stories-specific)

```ts
// PlayerProfile — persisted per userId
{
  id, userId,
  ageBracket: 'junior' | 'secondary' | 'senior' | 'adult',
  skills: { financialLiteracy, discipline, communication, ... },  // 0–100
  reputation: { [npcId]: number, [institutionId]: number },
  resources: {
    bCoins: number,
    timeUnits: number,      // simulated time budget
    inventory: { [itemId]: number },
    energy: number
  },
  activeConsequences: Array<{ id, type, expiresAt, effect }>,
  lastSimulatedAt: DateTime,
  createdAt, updatedAt
}
```

### 3.2 Story & Session

```ts
// Story — simulation template (e.g. business_registration)
{ id, slug, name, subject, config: { timeMultiplier, ... } }

// StorySession — active or completed run
{
  id, userId, storyId,
  state: 'active' | 'paused' | 'completed' | 'failed',
  snapshot: { resources, reputation, ... },  // at session start
  startedAt, lastPlayedAt, completedAt,
  difficultyContext: { ... }
}
```

### 3.3 Decisions & Consequences

```ts
// DecisionLog — every meaningful action
{ id, sessionId, choiceId, payload, at: DateTime, resolved: boolean }

// Consequence — immediate or scheduled
{
  id, decisionId, sessionId,
  type: 'immediate' | 'delayed',
  scheduledAt?: DateTime,
  ruleId: string,
  effects: Array<{ system, key, delta }>,  // e.g. { system: 'resources', key: 'bCoins', delta: -50 }
  appliedAt?: DateTime
}
```

### 3.4 NPC & Memory

```ts
// NPC — definition (roles, institution)
{ id, role, institutionId, name, config }

// NPCMemory — per user/NPC
{ id, userId, npcId, interactions: [...], lastInteractionAt, sentiment }
```

### 3.5 Phase 1 Business-Specific

```ts
// BusinessSimState — embedded in session or separate table
{
  registrationStatus: 'none' | 'pending' | 'approved',
  registrationSubmittedAt?: DateTime,
  businessName?: string,
  cashBalance: number,
  inventory: { [productId]: number },
  loans: Array<{ id, principal, rate, dueAt, paid }>,
  taxObligations: Array<{ period, amount, paid, dueAt }>,
  marketExposure: number,
  lastMarketUpdate: DateTime
}
```

---

## 4. Event & Consequence Flow

```
[Player Action] → [API] → [Consequence Engine]
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   [DecisionLog]      [Rule Resolution]      [Effect Application]
         │                    │                    │
         │              ┌─────┴─────┐              │
         │              │ immediate │              │
         │              │ delayed   │              │
         │              └─────┬─────┘              │
         │                    │                    │
         │                    ▼                    ▼
         │             [Consequence]          [Player State]
         │             [NPC Reaction]         [Resources]
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
                    [Reflection Checkpoint?]
                              │
                              ▼
                    [Export to Whiteboard]
```

**Rules examples:**

- Underpay staff → morale drop → productivity loss (delayed).
- Ignore taxes → audit risk (delayed, probability).
- Poor lab procedure → invalid results (immediate).
- Business registration submitted → 5–10 real minutes delay → status = approved.

---

## 5. Time System Design

- **Clock types:** Wall-clock (real) + simulated (in-story days/weeks).
- **Simulated time:** Advances via `timeMultiplier` (e.g. 1 real min = 1 sim day). Configurable per story.
- **Delays:** Stored as `scheduledAt` (real UTC). Background job or on-next-request resolution.
- **Offline:** When user returns, `now - lastPlayedAt` drives simulated time elapsed; consequences applied.
- **Skip:** Never free. Optional “accelerate” costing B-Coins or other trade-offs (design hook).

**Phase 1:**  
Business registration: 5–10 real minutes. Loan approval: delayed. Market shifts: time-based.

---

## 6. NPC Logic Framework

- **Roles:** banker, supplier, teacher, regulator, client.
- **Memory:** Last N interactions, outcomes, tone (polite vs aggressive).
- **Reaction:** `f(reputation, memory, currentRequest)` → disposition, dialogue, approval/denial.
- **Bureaucracy:** Forms, wait times, compliance checks. No cartoon behavior.

---

## 7. Phase 1: Business & Financial Literacy Simulation

**Features:**

- Start small business → register (with delays).
- Manage cash flow, buy/sell from AI companies.
- Pay taxes, take loans.
- Fail realistically (cash flow negative, audit, default).

**Includes:**

- Visual dashboards (cash, inventory, obligations).
- Simple but real accounting logic (revenue, costs, tax, interest).
- Market fluctuations (time-based).
- Ethical dilemmas (e.g. underreport revenue, underpay staff).

**No fantasy.** Caribbean-relevant institution names and scenarios.

---

## 8. Scalability Considerations

- Engine logic **separate from UI**. Same engine for web + future mobile.
- **State machines** for story/session state; **event-driven** internals.
- **Horizontal scaling:** Stateless API; Prisma/DB as source of truth. Optional queue for delayed consequences.
- **Multiplayer-ready:** User-scoped state, NPC memory per user. No shared economy yet.
- **Subject-agnostic:** Stories as templates; business is first subject. Science lab, stock market, etc. plug in later.

---

## 9. Next-Phase Expansion Hooks

- **Science lab:** Lab-specific resources, procedure rules, invalid-results consequence.
- **Stock market:** Market ticker, portfolio, risk exposure.
- **Language immersion:** NPC dialogue, tone, cultural context.
- **Multiplayer:** Shared economies, cooperative stories (design TBD).
- **Whiteboard integration:** Reflection payload schema versioned; Whiteboard consumes via API.

---

## 10. Implementation Map

| Component | Location | Status |
|-----------|----------|--------|
| Data models | `prisma/schema.prisma` | ✅ Done |
| Player state | `lib/stories-engine/player.ts` | ✅ Done |
| Time system | `lib/stories-engine/time.ts` | ✅ Done |
| Consequence engine | `lib/stories-engine/consequence-engine.ts` | ✅ Done |
| Resources | `lib/stories-engine/resources.ts` | ✅ Done |
| NPC | `lib/stories-engine/npc.ts` | ✅ Done |
| Difficulty | `lib/stories-engine/difficulty.ts` | ✅ Done |
| Reflection | `lib/stories-engine/reflection.ts` | ✅ Done |
| Events | `lib/stories-engine/events.ts` | ✅ Done |
| Business sim logic | `lib/stories-engine/simulations/business.ts` | ✅ Done |
| API routes | `app/api/stories/*` | ✅ Done |
| Stories hub | `app/stories/page.tsx` | ✅ Done |
| Business sim UI | `app/stories/business/page.tsx` | ✅ Done |
| Nav: Stories tab | `components/Navigation.tsx` | ✅ Done |

---

## 11. Quick Start

1. **Stories tab** — Nav → Stories. Lists available stories and active/completed sessions.
2. **Business sim** — Start “Business & Financial Literacy”. Create session, register business (7 min delay), view dashboard (cash, B-Coins, registration status).
3. **APIs** — `GET/PATCH /api/stories/profile`, `GET/POST /api/stories/sessions`, `GET/PATCH /api/stories/sessions/[id]`, `POST /api/stories/sessions/[id]/decision`, `POST /api/stories/sessions/[id]/tick`, `GET /api/stories/stories`.
4. **Run** — `npm run dev`, open `/stories`, then `/stories/business`.

---

*Stories Engine — foundational build. Design for seriousness, realism, and long-term impact.*
