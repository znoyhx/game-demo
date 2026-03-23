# AGENTS.md

## 1. Project Identity

**Project Name:** PixelForge Agent

**Product Goal:**  
Build a web-first, pixel-art, multi-agent RPG platform that supports:
- world generation
- quest generation
- NPC memory and interaction
- adaptive enemy tactics
- dynamic events
- explainable AI decisions
- auto-save and auto-load
- strong modularity and testability

This repository implements the competition MVP first, then evolves toward a polished demo build.

---

## 2. Source of Truth

Before making changes, always read these files in order:

1. `docs/prd.md`
2. `docs/architecture.md`
3. `docs/backlog.md`

If any implementation conflicts with the PRD, architecture, or backlog, prefer:
1. PRD intent
2. architecture constraints
3. current milestone scope in backlog

Do not invent major features outside the MVP unless explicitly requested.

---

## 3. Product Priorities

When making tradeoffs, optimize in this order:

1. **Playable MVP demo loop**
2. **Auto-save / auto-load reliability**
3. **Strict modular architecture**
4. **Debuggability and testability**
5. **Visible AI behavior**
6. **Visual polish**
7. **Feature expansion**

This is a competition project. Favor a stable and demoable vertical slice over broad but incomplete functionality.

---

## 4. Core Development Principles

### 4.1 Vertical Slice First
Prefer building complete playable slices over isolated subsystems.

Good:
- one playable area with one NPC, one quest, one save/load flow

Bad:
- half-built combat, half-built world generation, unfinished UI, no end-to-end loop

### 4.2 Mock First, LLM Later
Use deterministic mocks and schemas before connecting any real model.

For every agent-capable module:
- define input schema
- define output schema
- define deterministic mock behavior
- define fallback behavior on failure

Do not block implementation on live model access.

### 4.3 Testability Is a Feature
Every major module must be independently testable without requiring a full playthrough.

Always design for:
- direct state injection
- mock world loading
- debug shortcuts
- fixed seeds for repeatability
- replayable scenarios where practical

### 4.4 Explainability Is Visible Product Value
Important AI-driven decisions should be inspectable or explainable, especially:
- NPC attitude changes
- enemy tactic switching
- quest branch changes
- player model updates
- dynamic event triggers

### 4.5 Persistence Is Core, Not Optional
Auto-save and auto-load are part of the main product promise.

Any stateful feature must consider:
- serialization
- versioning
- restoration
- corruption handling
- compatibility with future save migrations

---

## 5. Architecture Rules

The codebase must remain split into these layers:

1. **UI Rendering Layer**
2. **Interaction / Controller Layer**
3. **Game State Layer**
4. **Agent Orchestration Layer**
5. **Rules Engine Layer**
6. **Persistence Layer**

### Non-negotiable boundaries

- UI components must not directly mutate persistence or deep domain state.
- UI should dispatch actions or call controllers, not embed business rules.
- Agent modules must not directly manipulate React components or rendering code.
- Persistence must not depend on page/component structure.
- Combat logic and NPC logic must remain separate domain modules.
- Map and quest systems should communicate through explicit events or state transitions, not hidden cross-import hacks.
- Structured schemas are required at domain boundaries.
- Any agent-like output must be validated before entering game state.

### Preferred communication patterns

- central store for app/game state
- domain actions
- event bus for cross-module events
- typed schemas for contracts
- pure functions for state transitions where possible

---

## 6. Expected Repository Shape

Prefer this structure unless a better one is justified:

```text
src/
  app/
  pages/
    Home/
    Game/
    Debug/
    Review/
  components/
    layout/
    pixel-ui/
    map/
    npc/
    quest/
    combat/
    debug/
  core/
    agents/
    rules/
    state/
    persistence/
    events/
    schemas/
    mocks/
    utils/
    types/
  assets/
  styles/

docs/
  prd.md
  architecture.md
  backlog.md
  contracts.md

tests/
  unit/
  integration/


Do not place domain logic inside page components if it can live in src/core.

7. Tech Expectations
Unless otherwise specified, prefer:

Frontend: React + TypeScript + Vite
Routing: React Router
State: Zustand or Redux Toolkit
Validation: Zod or equivalent schema validation
Tests: Vitest for unit/integration, Testing Library for UI where needed
Rendering: Phaser or PixiJS compatible structure
Persistence: IndexedDB preferred for richer save data, localStorage acceptable for MVP bootstrap
Lint/Format: ESLint + Prettier

Keep dependencies minimal and purposeful.

8. Definition of Done
A task is not complete unless all applicable items are satisfied:

Code compiles
Lint passes
Relevant tests are added/updated
Existing tests still pass
Behavior matches the PRD/backlog scope
No obvious layer violation is introduced
Debug/test hooks are included when relevant
Documentation is updated when contracts or architecture change

When finishing a task, report:

what changed
what tests were run
any remaining risks or follow-ups

9. Required Workflow for Non-trivial Tasks
For any meaningful change, follow this sequence:

Step 1: Understand context

Read:

docs/prd.md
docs/architecture.md
relevant section in docs/backlog.md

Step 2: Make a short plan

Before coding, produce a concise plan including:

target files
implementation approach
risks or tradeoffs

Step 3: Implement incrementally

Prefer small, reviewable changes.
Avoid giant, multi-concern edits unless explicitly requested.

Step 4: Validate

Run relevant commands such as:

build
lint
tests

Step 5: Summarize

Report:

completed scope
validation results
next recommended step

10. Coding Rules
General
Prefer TypeScript strict typing.
Prefer pure functions for rules and transitions.
Avoid hidden mutable globals.
Keep components focused and composable.
Do not duplicate domain constants across modules.

State
Keep game state normalized where practical.
Separate view state from domain state.
Use selectors/helpers instead of leaking store internals everywhere.

Schemas
Define schemas for:

world
area
quest
NPC
combat encounter
event
save file
agent input/output payloads

Validate external or agent-produced data before use.

Errors
Fail safely.
Provide reasonable fallbacks.
Never let non-critical AI failures crash the app.
Log useful debug information in dev mode.

Save System
All save-related changes must consider:

version field
migration path
validation on load
fallback for corrupted/incompatible saves

11. Testing Rules
Unit tests are expected for:
rule evaluation
state transitions
save serialization/deserialization
tactic selection logic
quest status updates
relationship/trust updates

Integration tests are expected for:
area switch triggers auto-save
quest completion updates NPC/game state
reload restores recent save
combat end generates review state
debug tools can inject scenario state

Preferred testing traits:
deterministic
mock-driven
minimal external dependency
fixed inputs
small surface area

Do not rely on live model calls in tests.

12. Debug Mode Requirements
This project must maintain a strong internal debug workflow.

A /debug route or equivalent developer entry should support, over time:

world state viewer
save manager
quest controls
NPC relation editor
event trigger panel
combat simulator entry
player model injection
agent decision log inspection

When building new systems, consider whether they need debug controls.

13. Competition MVP Scope Guardrails
For MVP, prioritize only what is needed for a compelling demo:

Must support:

web app shell
pixel-style game UI
one world generation flow or stable template flow
at least 3 areas
at least 5 NPCs
at least 1 boss encounter
1 main quest + 3 side quests
NPC memory-aware dialogue
3 enemy tactic modes
dynamic events
auto-save + auto-load
debug entry
post-battle or post-run review page

Avoid premature work on:

multiplayer
full map editor
account system
cloud sync
image generation pipeline
overly complex skill trees

14. Agent Module Guidance
The project concept includes these agent roles:

World Architect Agent
Quest Designer Agent
Level Builder Agent
NPC Brain Agent
Enemy Tactician Agent
Game Master Agent
Player Model Agent
Explain & Coach Agent

For implementation:
start each agent as an interface + schema + mock implementation
keep prompts/templates/config separate from UI
log agent decisions in a structured way where feasible
expose simplified decision rationale in debug or review UI

Agent output handling:
validate outputs
normalize outputs
reject malformed outputs
fall back to templates/mocks when needed

15. UI and UX Expectations
The UI should support a pixel-art fantasy adventure feel, not an admin dashboard feel.

Prioritize:

clear main game scene
visible quest/status panel
readable dialogue area
obvious interaction affordances
strong demo readability at 1920x1080

When uncertain, optimize for live presentation clarity.

16. Documentation Update Rules
Update documentation when:

a new module boundary is introduced
a contract/schema changes
a milestone is completed
a new debug workflow is added
persistence behavior changes

At minimum, update:

docs/backlog.md when scope or milestone status changes
docs/architecture.md when architecture or contracts change

17. Anti-Patterns to Avoid
Do not:

bury core logic inside React components
couple save/load logic to specific pages
make model calls directly from UI components
skip schema validation for generated content
build broad unfinished systems with no playable loop
remove mock pathways before real integrations are stable
introduce silent cross-module dependencies
make debug-only hacks the production path
break determinism in tests without strong reason

18. Preferred Delivery Style
When asked to implement something:

restate the goal briefly
propose a short plan
implement cleanly
run validation
summarize results and next steps

When a task is too large:

split it into concrete substeps
complete the highest-value portion first
leave clear follow-up notes

19. First Milestone Bias
If starting from a fresh repository, bias toward this sequence:

scaffold app and tooling
create architecture/backlog/contracts docs
set up store and schemas
load mock world
render one area
add one NPC interaction
update one quest
add auto-save/load
add /debug
expand to 3-area MVP

20. Final Instruction
Build PixelForge Agent like a real competition-ready game product:

demoable
modular
testable
resilient
explainable

Whenever there is uncertainty, choose the option that makes the project:

easier to demo
easier to test
easier to extend
less fragile

