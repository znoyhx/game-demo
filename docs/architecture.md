---

## `docs/architecture.md`


# PixelForge Agent Architecture
Version: v0.3
Status: Active architecture draft

---

# 1. Purpose

This document translates `docs/prd.md` into an implementation architecture for PixelForge Agent.

Architecture goals:

- support a competition-ready web demo
- preserve strict modularity and low coupling
- make all core systems independently testable
- support deterministic mock-first development
- treat save/load and recovery as first-class capabilities
- allow later migration from mock logic to real LLM-backed agents
- keep the system easy to demo, debug, and extend

---

# 2. Architecture Summary

PixelForge Agent uses a layered architecture with explicit boundaries:

1. **UI Rendering Layer**
2. **Interaction / Controller Layer**
3. **Game State Layer**
4. **Agent Orchestration Layer**
5. **Rules Engine Layer**
6. **Persistence Layer**

Supporting systems:

- event bus
- schema validation
- debug tooling
- mock data and scenario injection
- logs and review payload generation

Core principle:

> UI renders and dispatches actions.  
> Controllers coordinate use cases.  
> State stores normalized game data.  
> Rules evaluate legality and transitions.  
> Agents produce structured content or decisions.  
> Persistence serializes and restores the world safely.

---

# 3. High-Level System View

```text
User Input
   |
   v
UI Rendering Layer
   |
   v
Interaction / Controller Layer
   |
   +--------------------+
   |                    |
   v                    v
Game State Layer   Agent Orchestration Layer
   |                    |
   v                    v
Rules Engine Layer <----+
   |
   v
Persistence Layer
   |
   v
Storage (IndexedDB / localStorage)
````

Cross-cutting:

* schemas validate all boundary payloads
* event bus propagates domain events
* debug tools can inject state directly
* review/explain systems consume logs and state snapshots

---

# 4. Layer Definitions

## 4.1 UI Rendering Layer

### Responsibility

Render the game interface and present the current world state.

### Includes

* home/start page
* game scene
* Phaser-based pixel scene canvas wrapper
* runtime-generated sprite sheet registry and animation adapter
* scene entity rendering layer for player / NPC / portal / event nodes
* dialogue panel
* quest panel
* combat panel
* debug page
* review page
* pixel-styled layout components

### Must do

* read data from selectors/hooks
* dispatch user intents
* render current system state clearly
* surface save/load, area, NPC, quest, combat, and explanation data
* accept pre-shaped presentation models so DOM placeholders can later swap to Phaser/Pixi renderers without moving domain rules into components
* support isolated renderer slices and debug preview compositions so map layers, marker overlays, dialogue panels, and quest panels can be tested without full progression
* keep generated or real art assets behind renderer-only adapters so sprite swaps do not leak into rules, state, controllers, or persistence

### Must not do

* contain core business rules
* directly mutate persistent state
* construct save payloads
* decide quest legality
* decide combat tactics
* execute agent logic inline

### Example components

* `GameLayout`
* `MapViewport`
* `AreaSceneStage`
* `PhaserAreaSceneViewport`
* `PixelAreaScene`
* `DialoguePanel`
* `QuestSidebar`
* `CombatPanel`
* `SaveStatusIndicator`
* `DebugControlPanel`
* `ReviewSummaryPanel`

---

## 4.2 Interaction / Controller Layer

### Responsibility

Translate user actions and system triggers into coordinated use cases.

### Includes

* action handlers
* use-case services
* route-level orchestration
* startup flows
* scene transition handlers
* dialogue interaction coordinators
* combat start/end coordinators

### Typical controller jobs

* load world on startup
* choose fallback path when save is missing or invalid
* execute NPC interaction flow
* trigger quest transition after dialogue
* trigger auto-save after important events
* launch combat encounter
* generate review payload after encounter

### Must do

* call domain state actions
* invoke rules checks
* invoke agent services through interfaces
* emit domain events
* trigger persistence writes through persistence service

### Must not do

* own long-term state as hidden mutable variables
* bypass schema validation
* embed rendering logic

### Example services

* `startupController`
* `worldCreationController`
* `dialogueController`
* `questProgressController`
* `combatController`
* `saveController`
* `areaDebugController`
* `questDebugController`
* `debugScenarioController`

---

## 4.3 Game State Layer

### Responsibility

Hold the current in-memory game state in a structured, typed form.

### Includes

* world state
* area state
* quest state
* NPC state
* player profile state
* combat state
* event state
* save metadata
* UI-local state where appropriate

### Recommended shape

State should be split into domain slices or stores:

* `worldStore`
* `areaStore`
* `questStore`
* `npcStore`
* `playerStore`
* `combatStore`
* `eventStore`
* `saveStore`
* `uiStore`

### Principles

* separate domain state from transient UI state
* normalize where useful
* expose selectors and actions
* keep write paths explicit
* allow deterministic test setup

### Must do

* store validated objects only
* expose typed actions/selectors
* support state hydration from save payloads
* support snapshot export for save/review/debug

### Must not do

* hide domain rules in arbitrary setters
* accept raw unvalidated agent output directly

---

## 4.4 Agent Orchestration Layer

### Responsibility

Provide structured interfaces for all agent-like systems.

### Supported conceptual agents

* World Architect Agent
* Quest Designer Agent
* Level Builder Agent
* NPC Brain Agent
* Enemy Tactician Agent
* Game Master Agent
* Player Model Agent
* Explain & Coach Agent

### MVP implementation strategy

Mock-first:

* each agent starts as an interface
* backed by deterministic mock/template implementations
* real LLM-backed implementations may be added later behind the same interface

### Responsibilities

* accept typed inputs
* validate inputs
* execute mock or live strategy
* validate outputs
* normalize outputs
* return structured domain-safe payloads

### Must do

* isolate prompt/config logic from UI
* return schema-valid outputs
* support failure fallback
* emit decision logs when useful

### Must not do

* write directly to store
* touch browser rendering
* bypass rules engine for legality-sensitive outcomes

### Example interfaces

* `WorldArchitectService`
* `QuestDesignerService`
* `NpcBrainService`
* `EnemyTacticianService`
* `GameMasterService`
* `PlayerModelService`
* `ExplainCoachService`

---

## 4.5 Rules Engine Layer

### Responsibility

Enforce legality, progression, and deterministic game logic.

### Includes

* quest transition checks
* area unlock conditions
* dialogue gating rules
* trust/relationship updates
* event trigger evaluation
* combat tactic selection rules
* boss phase transition rules
* reward and failure handling
* save compatibility checks
* state migration helpers

### Key property

Rules should be mostly pure and testable.

### Must do

* serve as the authoritative place for game logic
* evaluate transitions from explicit inputs
* return structured results
* remain deterministic under controlled inputs

### Must not do

* depend on UI
* require live models
* perform side-effect-heavy persistence operations

### Example modules

* `questRules`
* `areaRules`
* `npcRules`
* `combatRules`
* `eventRules`
* `saveRules`
* `reviewRules`

---

## 4.6 Persistence Layer

### Responsibility

Serialize, validate, store, restore, and migrate game state.

### Includes

* save snapshot creation
* load validation
* versioning
* migration
* backup handling
* storage adapter
* autosave policy execution

### Storage strategy

MVP:

* `localStorage` acceptable for bootstrap simplicity
* `IndexedDB` preferred once save data grows

Recommended abstraction:

* `StorageAdapter` interface
* `LocalStorageAdapter`
* `IndexedDbAdapter`

### Must do

* validate on load
* attach version metadata
* preserve latest valid save
* support manual and auto-save
* handle invalid/corrupt payloads gracefully

### Must not do

* depend on page/component tree
* serialize raw UI-only noise unnecessarily

---

# 5. Cross-Cutting Systems

## 5.1 Event Bus

### Purpose

Decouple systems through explicit domain events.

### Typical events

* `WORLD_LOADED`
* `AREA_ENTERED`
* `NPC_INTERACTED`
* `QUEST_UPDATED`
* `EVENT_TRIGGERED`
* `COMBAT_STARTED`
* `TACTIC_CHANGED`
* `COMBAT_ENDED`
* `SAVE_CREATED`
* `SAVE_RESTORED`
* `PLAYER_MODEL_UPDATED`

### Uses

* trigger autosave after key domain changes
* notify review generator
* drive event triggers
* keep modules loosely coupled

### Design guideline

Use explicit typed events, not anonymous string hacks spread everywhere.

---

## 5.2 Schema Validation

### Purpose

Protect system boundaries from malformed or unstable data.

### Validate:

* mock fixtures
* save payloads
* agent outputs
* controller inputs where necessary
* migration outputs

### Recommendation

Use Zod or equivalent.

---

## 5.3 Debug Tooling

### Purpose

Enable short-path verification of every main system.

### Debug route capabilities

* world state viewer
* area jump / unlock / relock / environment controls
* save manager
* quest controls
* quest log inspection
* quest dependency graph inspection
* NPC relation editor
* direct NPC dialogue opening
* NPC trust / relationship / memory injection
* deterministic NPC branch testing with rollback
* event trigger panel
* combat entry simulator
* forced combat tactic / boss phase controls
* seeded player-pattern combat simulation
* combat log replay and reconstruction summary
* player model injection
* decision log panel

### Principle

Every major domain should be injectable or inspectable without full gameplay traversal.

---

## 5.4 Logging and Review Data

### Purpose

Make AI and rules behavior visible for demo, explanation, and debugging.

### Log classes

* domain event logs
* combat logs
* NPC interaction logs
* save/load logs
* agent decision logs
* explanation payloads

### Use cases

* debug inspection
* review page generation
* judge-facing explanation moments
* issue reproduction

---

## 5.5 Locale and Display Dictionary

### Purpose

Keep all user-visible shell, page, controller, and logging copy behind one reusable dictionary boundary.

### Current approach

* `src/core/utils/locale/` owns the active locale object
* page/layout/controller display copy should read from the locale layer, not inline literals
* thin adapters like `displayLabels` may re-export localized labels for existing domain/UI call sites

### Rules

* keep domain enums, save metadata fields, and schema values language-neutral
* translate only at display boundaries
* avoid duplicating labels in pages, controllers, and loggers
* expand the dictionary before adding new hardcoded UI copy

### Strong Simplified Chinese requirement

For this project, Simplified Chinese is the default and required built-in presentation language for all player-facing pages.

This applies to:

* home page
* game page
* debug page
* review page
* HUD panels
* buttons, labels, badges, empty states, status text, and hints
* visible controller/logging copy rendered in-app

Implementation constraints:

* do not ship built-in English UI copy in normal page flows
* do not expose raw English enums, schema keys, internal ids, engine placeholders, or agent names directly to users
* any display text derived from rules, controllers, mocks, logs, or view models must be localized before render
* debug tooling shown inside the app is also covered by this rule
* tests should assert Chinese display copy where copy correctness is part of visible behavior

---

## 5.6 Phaser Scene Rendering Adapter

### Purpose

Provide a real-time top-down pixel gameplay viewport without moving domain logic into the renderer.

### Structure

* React wrapper mounts and destroys the Phaser runtime
* pure presentation builder converts validated area scene data plus localized marker state into a renderer-safe scene model
* Phaser scene owns only:
  * tile drawing
  * placeholder art registry resolution
  * ambient effect rendering
  * player movement input
  * camera follow
  * collision bodies
  * entity click / proximity detection
* callbacks hand control back to existing controllers for NPC dialogue, portal travel, events, and combat

### Boundary Rules

* Phaser runtime must not call rules or persistence directly
* renderer state such as camera, prompt focus, and movement remains UI-local
* all cross-layer inputs into the renderer should come from a schema-validated presentation contract
* the renderer must consume explicit per-area scene definitions (grid, tiles, spawns, portals, decorative layers) instead of inventing layout from area metadata at render time
* swapping placeholder textures for shipped art must not require controller or store changes
* art source selection and placeholder-to-atlas migration must stay inside the Phaser rendering adapter

---

# 6. Data Flow Patterns

## 6.0 World Creation Flow

```text
Home page / creation entry
  -> worldCreationController.createWorld(request)
  -> validate request contract
  -> world architect agent generates world, regions, factions, story premise
  -> quest designer agent generates main + side quest seeds
  -> level builder agent finalizes area interaction points
  -> controller prepares initial NPC set, resource setup, event set, player seed
  -> build and validate SaveSnapshot
  -> hydrate stores
  -> persist opening save
  -> route into the game shell
```

### Notes

* creation must stay under a minute in UI structure
* presets / quick play / dev-test should be thin wrappers around the same request contract
* if generation fails, the controller should fall back to a deterministic, schema-valid opening snapshot

---

## 6.1 Startup Flow

```text
App boot
  -> startupController
  -> persistence.loadLatest()
  -> validate save
      -> if valid: hydrate stores
      -> if invalid: attempt fallback / backup
      -> if none: load mock/template world
  -> emit WORLD_LOADED / SAVE_RESTORED
  -> render game or home flow
```

### Notes

* startup must be resilient
* invalid save must not crash app
* dev mode should surface cause of fallback
* current MVP boot path uses `StartupBootstrap -> startupController -> LocalStorageAdapter`
* startup hydrates the game store from the latest valid `SaveSnapshot` or falls back to the deterministic mock snapshot while exposing `startupSource` and `startupReason` to the route shell

---

## 6.2 NPC Interaction Flow

```text
User clicks NPC
  -> dialogueController.start(npcId)
  -> read NPC state + quest state + player state
  -> call NpcBrainService with typed input
  -> validate response
  -> apply npcRules / questRules / trade rules
  -> update state
  -> append memory, reveal gated info, and persist network changes
  -> build concise interaction explanation payload
  -> emit NPC_INTERACTED / QUEST_UPDATED if needed
  -> trigger autosave if key change occurred
  -> update logs and explanation payloads
```

---

## 6.3 Quest Progression Flow

```text
Trigger occurs
  -> questProgressController
  -> questRules evaluate trigger / dependency / branch legality
  -> if valid: update quest state
  -> emit QUEST_UPDATED
  -> record log
  -> autosave if milestone change
```

---

## 6.4 Area Transition Flow

```text
User selects destination
  -> areaController.requestEnter(areaId)
  -> areaRules.checkAccess()

### Scene-driven entry note

When the player sprite overlaps a portal or activates a route marker inside the Phaser scene:

* renderer emits a portal activation callback
* React route shell forwards it to `areaNavigationController`
* controller still owns legality, unlock, autosave, and event emission
  -> if allowed: update current area
  -> emit AREA_ENTERED
  -> evaluate event triggers
  -> autosave
```

---

## 6.5 Combat Flow

```text
Combat requested
  -> combatController.startEncounter()
  -> initialize combat state
  -> emit COMBAT_STARTED

Each turn / phase
  -> collect player action / simulation input
  -> enemy tactic service proposes mode
  -> combatRules evaluate legal outcome
  -> update combat state and log
  -> emit TACTIC_CHANGED if applicable

Combat resolved
  -> emit COMBAT_ENDED
  -> generate review payload
  -> autosave result
  -> route to review page if appropriate
```

---

## 6.6 Save Flow

```text
Key state change
  -> saveController.requestAutoSave(reason)
  -> persistence.buildSnapshot(currentState)
  -> validate save payload
  -> write via storage adapter
  -> update save metadata state
  -> emit SAVE_CREATED
```

---

# 7. Recommended Repository Structure

```text
src/
  app/
    router/
    providers/
    store/
  pages/
    Home/
    Game/
    Debug/
    Review/
  components/
    layout/
    pixel-ui/
    map/
      phaser/
        runtime/
    npc/
    quest/
    combat/
    debug/
    review/
  core/
    agents/
      interfaces/
      mocks/
      templates/
      logs/
    rules/
    state/
    persistence/
      adapters/
      migrations/
      serializers/
      validators/
    events/
    schemas/
    mocks/
    review/
    utils/
    types/
  assets/
  styles/

docs/
  prd.md
  architecture.md
  contracts.md
  backlog.md

tests/
  unit/
  integration/
```

---

# 8. Domain State Architecture

## 8.1 World State

Contains:

* world id
* world name
* theme/style metadata
* factions
* regions
* global timeline/weather metadata
* active world flags

## 8.2 Area State

Contains:

* current area id
* discovered areas
* unlocked areas
* area-specific environmental modifiers
* explicit area scene definitions with:
  * grid dimensions
  * blocked/walkable tile data
  * NPC spawn positions
  * interaction and portal positions
  * optional decorative layers

## 8.3 Quest State

Contains:

* quest definitions
* quest progress map
* active quests
* completed quests
* failed quests
* quest history/log

Quest definitions should carry:

* trigger conditions
* completion conditions
* failure conditions
* dependencies
* branch results

Quest progress should remain separate from definitions and only store mutable runtime state such as status, completed step ids, selected branch, and update timestamps.

Quest history/log should be persisted to save snapshots so debug tools and review flows can reconstruct why a quest changed state.

## 8.4 NPC State

Contains:

* NPC records
* relationship/trust values
* emotional state
* memory summaries
* revealed fact / secret history
* relationship-network edges
* local goals
* reveal states
* faction alignment snapshots

## 8.5 Player State

Contains:

* player profile tags
* inventory
* attributes
* current run statistics
* behavior-derived tags

## 8.6 Combat State

Contains:

* current encounter
* turn/phase
* active tactic
* combat log
* status flags
* result summary

## 8.7 Event State

Contains:

* triggered event history
* pending event queue
* world tension or pacing indicators

## 8.8 Save Metadata State

Contains:

* last save id
* last save timestamp
* save status
* save source
* last load result
* recovery notices

## 8.9 Player Model State

Contains:

* inferred player tags
* rationale snippets
* recent area visits
* recent quest choices
* NPC interaction count
* optional risk or stuck-point hints

## 8.10 Review State

Contains:

* current review payload
* review history
* explanation artifacts for debug/replay

## 8.11 Config and Resource State

Contains:

* world/template configuration
* autosave and presentation toggles
* active theme
* resource catalog entries
* selected background/music/tileset keys

## 8.12 Session and Debug State

Contains:

* active UI panel and selections
* selected NPC dialogue targets for direct-open debug flows
* debug scenario overrides
* forced encounter/event/tactic state
* route history and session hydration metadata

---

# 9. Agent Architecture

## 9.1 Agent Service Pattern

Each agent-like module should follow this pattern:

```text
Controller / Rule Trigger
   -> Agent Interface
   -> Input Validation
   -> Mock or Live Implementation
   -> Output Validation
   -> Normalization
   -> Structured Result
```

## 9.2 Implementation Modes

### Mock Mode

Used by default in early development and tests.

Characteristics:

* deterministic
* schema-safe
* fixture-backed or template-backed
* stable for demo

### Live Mode

Optional future enhancement.

Characteristics:

* backed by LLM/API
* guarded by timeouts and retries
* always has fallback to mock/template mode

## 9.3 Decision Logging

Where practical, agent services should emit:

* selected strategy
* influencing inputs
* simplified rationale
* confidence/fallback metadata if available

These logs are used by:

* debug tools
* review page
* explanation UI

---

# 10. Persistence Architecture

## 10.1 Save Snapshot Model

A save snapshot should contain:

* save metadata
* world state snapshot
* area definitions plus map runtime snapshot
* quest state snapshot
* NPC state snapshot
* player state snapshot
* player model state
* event history plus director/runtime state
* combat definitions plus combat runtime/history if relevant
* review state if retained
* config/resource state when it affects the active run

## 10.2 Save Triggers

Autosave should be triggered after:

* area transition
* quest status change
* key NPC interaction
* combat end
* important event trigger
* manual save request
* app close/unload when feasible

## 10.3 Validation and Recovery

Load flow:

1. read latest candidate
2. validate schema and version
3. migrate if possible
4. hydrate stores
5. on failure, use backup or default world

## 10.4 Migration Strategy

Each save contains:

* `version`
* `createdAt`
* `updatedAt`

When save schema changes:

* write migration function
* validate migrated result
* keep logs for failed migration in dev mode

---

# 11. Testing Architecture

## 11.1 Unit Testing Focus

Pure modules first:

* rule evaluators
* state transition helpers
* save serialization/deserialization
* migration helpers
* tactic selection logic
* relationship updates
* event trigger evaluation

## 11.2 Integration Testing Focus

Critical loops:

* startup load/fallback
* one NPC interaction updates quest and save
* area change triggers event and autosave
* combat end creates review payload
* debug tools inject scenario state

## 11.3 Determinism Requirements

Tests should prefer:

* fixed mock data
* fixed seeds
* no live model dependencies
* stable event ordering

---

# 12. Security and Resilience Considerations

For MVP:

* validate all externally shaped data
* do not trust saved payloads blindly
* prevent invalid state writes
* degrade gracefully when optional modules fail
* keep logs dev-friendly but avoid exposing sensitive internals in production builds

Non-critical failures should fall back safely:

* agent output invalid -> use mock/template fallback
* save invalid -> recover from backup or default world
* missing optional explanation payload -> keep gameplay intact

---

# 13. Performance Considerations

Primary performance goals:

* first load within competition-friendly bounds
* common interactions feel responsive
* autosave should be low-friction
* avoid unnecessary rerenders in large side panels

Strategies:

* memoized selectors
* isolate scene rendering from side-panel churn
* debounce or batch non-critical logging
* keep save snapshots compact enough for MVP

---

# 14. Future Extension Paths

This architecture should later support:

* desktop packaging with Tauri/Electron
* cloud save sync
* more advanced combat
* richer NPC memory
* education mode
* creation mode
* live LLM-backed dynamic generation
* more sophisticated review analytics

The key rule for extension:

> add implementations behind existing interfaces whenever possible, rather than breaking architectural boundaries.

---

# 15. Initial Build Order Recommendation

1. scaffold app and routes
2. define schemas
3. define mock fixtures
4. implement state stores
5. implement startup load/fallback
6. render one area
7. implement one NPC interaction
8. implement one quest transition
9. implement save/load
10. implement debug page
11. expand to 3-area exploration
12. add combat and review
13. add events and player model
14. polish visuals and demo presets

---

# 16. Architecture Decision Summary

PixelForge Agent should be built as a:

* **web-first**
* **mock-first**
* **schema-driven**
* **event-aware**
* **save-centric**
* **debuggable**
* **layered game platform**

This architecture is intentionally optimized for:

* competition demo stability
* visible intelligence
* modular implementation
* fast iteration with Codex
* future extensibility without a rewrite

````
