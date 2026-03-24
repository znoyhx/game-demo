
---

## `docs/backlog.md`

```md
# PixelForge Agent Backlog
Version: v0.1  
Status: Initial planning draft

---

# 1. Backlog Purpose

This file translates `docs/prd.md` into an implementation-oriented backlog for Codex and human contributors.

Planning principles:
- prioritize vertical slices
- prefer demoable milestones
- use deterministic mocks first
- enforce modularity and testability
- keep MVP bounded for competition delivery
- keep all built-in player-facing UI copy in Simplified Chinese

---

# 2. MVP Goal

Deliver a competition-ready web demo of PixelForge Agent with:

- a pixel-style main game interface
- world/template creation entry
- 3 explorable areas
- 5 interactive NPCs
- 1 main quest and 3 side quests
- 1 boss encounter
- NPC memory-aware interaction
- 3 enemy tactic modes
- dynamic event triggers
- auto-save and auto-load
- debug route for direct scenario testing
- review/explanation page for visible AI decisions

---

# 3. Milestones Overview

## M0 — Project Foundation
Build the repository, tooling, architecture docs, and skeleton app.

## M1 — First Playable Slice
Load one mock world, render one area, talk to one NPC, advance one quest, save and reload.

## M2 — Exploration Loop
Expand to 3 areas, area switching, unlock logic, multiple NPCs, main/side quest flow.

## M3 — Combat & Adaptive Tactics
Add a playable boss encounter, tactic switching, combat logs, and combat review.

## M4 — Dynamic World & Explainability
Add event triggers, player model, visible explanation layer, and stronger debug tools.

## M5 — Competition Demo Polish
Improve UX, visual polish, reliability, demo presets, and fallback behavior.

---

# 4. Milestone Details

---

## M0 — Project Foundation

### Objective
Set up a stable engineering base with clear architecture and developer workflow.

### Tasks

#### M0-1 Initialize app scaffold
- create React + TypeScript + Vite app
- add routing
- add state management
- add lint/format tooling
- add test tooling

**Acceptance criteria**
- app runs locally
- lint runs successfully
- test command runs successfully
- base route renders

**Dependencies**
- none

---

#### M0-2 Create repository structure
- create `src/pages`, `src/components`, `src/core`, `docs`, `tests`
- establish domain folders for state, rules, agents, persistence, schemas, mocks

**Acceptance criteria**
- structure matches architecture plan
- no domain logic is placed in pages by default

**Dependencies**
- M0-1

---

#### M0-3 Add project docs
- add `docs/prd.md`
- add `docs/architecture.md`
- add `docs/contracts.md`
- add `docs/backlog.md`
- add `AGENTS.md`

**Acceptance criteria**
- docs are present and internally consistent
- architecture names match codebase folder plan

**Dependencies**
- M0-1

---

#### M0-4 Create app shell and routes
- add home page
- add game page
- add debug page
- add review page placeholders

**Acceptance criteria**
- all routes load
- navigation between routes works
- placeholders render without runtime errors

**Dependencies**
- M0-1, M0-2

---

#### M0-5 Add initial schemas
- define schemas for world, area, quest, npc, save file, event, combat encounter

**Acceptance criteria**
- schemas compile
- mock fixtures validate successfully

**Dependencies**
- M0-2

---

#### M0-6 Add initial mock data pack
- create one stable mock world
- create one area
- create one NPC
- create one quest
- create one save payload

**Acceptance criteria**
- mock data validates against schemas
- app can load mock world data

**Dependencies**
- M0-5

---

#### M0-7 Set up debug/dev helpers
- feature flag for debug mode
- state inspector placeholder
- mock scenario loader placeholder

**Acceptance criteria**
- `/debug` route loads
- debug controls can read current mock state

**Dependencies**
- M0-4, M0-6

---

## M1 — First Playable Slice

### Objective
Prove the core loop end-to-end with one small but complete playable scenario.

### Tasks

#### M1-1 Build game state store
- world state
- area state
- quest state
- npc state
- save metadata state

**Acceptance criteria**
- state initializes from mock data
- selectors/actions are typed
- state is separate from UI components

**Dependencies**
- M0-5, M0-6

---

#### M1-2 Implement startup flow
- on app start, attempt to load latest valid save
- if no save exists, load default mock world
- if save is invalid, fall back safely

**Acceptance criteria**
- refresh restores previous state when save exists
- invalid save does not crash app
- fallback path is logged in dev mode

**Dependencies**
- M1-1

---

#### M1-3 Render one explorable area
- render one area scene
- show interaction markers
- show current area info in UI

**Acceptance criteria**
- game page renders area without errors
- at least one NPC/interaction point is visible
- area metadata is visible

**Dependencies**
- M1-1

---

#### M1-4 Implement one NPC dialogue flow
- open dialogue panel
- show NPC metadata
- support one branching interaction
- update relationship or trust value

**Acceptance criteria**
- player can interact with NPC
- dialogue result updates NPC state
- state update is visible in UI or debug panel

**Dependencies**
- M1-3

---

#### M1-5 Implement one quest transition
- activate one quest
- complete one quest step through NPC interaction
- update quest log panel

**Acceptance criteria**
- quest state changes from initial to progressed state
- UI reflects quest progress
- transition is test-covered

**Dependencies**
- M1-4

---

#### M1-6 Implement save/load v1
- save current state after key interaction
- load state on refresh
- include save version and timestamp

**Acceptance criteria**
- quest/NPC state survives refresh
- save file validates before load
- serialization/deserialization tests pass

**Dependencies**
- M1-2, M1-4, M1-5

---

#### M1-7 Build first debug controls
- inspect current save
- reset scenario
- set quest status
- simulate quest conditions
- inspect quest logs / dependency graph
- adjust NPC trust/relationship

**Acceptance criteria**
- debug controls affect state as intended
- scenario can be reset without manual local storage clearing

**Dependencies**
- M1-6

---

#### M1-8 Add first integration tests
- startup load flow
- quest progression
- save and reload
- debug-driven state injection

**Acceptance criteria**
- core slice is covered by automated tests
- tests are deterministic

**Dependencies**
- M1-6, M1-7

---

## M2 — Exploration Loop

### Objective
Expand the MVP into a recognizably game-like exploration flow.

### Tasks

#### M2-1 Add 3-area world structure
- define 3 areas
- add area metadata and transitions
- add locked/unlocked conditions

**Acceptance criteria**
- player can move between areas
- locked area remains inaccessible until condition is met
- unlock state persists in save data

**Dependencies**
- M1 complete

---

#### M2-2 Implement map and region navigation UI
- minimap or region list
- current area indicator
- exploration progress display

**Acceptance criteria**
- navigation is visible and understandable
- area transitions update UI and state consistently

**Dependencies**
- M2-1

---

#### M2-3 Expand NPC roster to 5
- add at least 5 NPCs
- distribute across areas
- define role, relation, and memory fields

**Acceptance criteria**
- all NPCs validate against schema
- each NPC is interactable from intended area
- relation data persists

**Dependencies**
- M2-1

---

#### M2-4 Implement NPC memory-aware dialogue v1
- store interaction summaries
- alter dialogue based on prior actions
- gate some info by trust or relationship

**Acceptance criteria**
- repeat interaction can produce different response
- relationship/trust gates content
- debug view can inspect memory summary

**Dependencies**
- M2-3

---

#### M2-5 Implement quest system v1
- 1 main quest
- 3 side quests
- quest dependencies
- quest log/history

**Acceptance criteria**
- quests can be activated and completed through gameplay or debug tools
- branch or dependency logic works for at least one example
- quest log displays current states

**Dependencies**
- M2-3

---

#### M2-6 Add area-triggered events v1
- at least 3 event types
- support location-based triggers
- support quest-based triggers

**Acceptance criteria**
- events can trigger during exploration
- triggered events are recorded in state/log
- events are manually triggerable in debug mode

**Dependencies**
- M2-1, M2-5

---

#### M2-7 Improve save system coverage
- save area unlocks
- save NPC memory
- save quest progress
- save event history

**Acceptance criteria**
- all above data is restored on reload
- migration/version fields remain valid

**Dependencies**
- M2-4, M2-5, M2-6

---

## M3 — Combat & Adaptive Tactics

### Objective
Add a compact but convincing strategy encounter that demonstrates adaptive AI behavior.

### Tasks

#### M3-1 Define combat domain schema
- combat encounter
- enemy unit/boss
- player combat snapshot
- combat log entry
- review payload

**Acceptance criteria**
- schemas validate combat fixtures
- schemas are isolated from UI

**Dependencies**
- M0-5

---

#### M3-2 Implement combat state machine v1
- combat start
- turn/phase progression
- combat resolution
- combat result summary

**Acceptance criteria**
- one encounter can start and end successfully
- state transitions are deterministic under fixed seed/test inputs

**Dependencies**
- M3-1

---

#### M3-3 Implement enemy tactics v1
- aggressive mode
- defensive mode
- counter mode

**Acceptance criteria**
- tactics are visibly distinct
- selected tactic is represented in combat state/log
- tactic selection logic has unit tests

**Dependencies**
- M3-2

---

#### M3-4 Implement boss encounter v1
- one boss fight
- at least 2 phases
- phase switch based on encounter state

**Acceptance criteria**
- boss can enter second phase
- UI/log shows phase change
- review payload records key shift points

**Dependencies**
- M3-3

---

#### M3-5 Add combat UI and logs
- combat panel
- action display
- log timeline

**Acceptance criteria**
- encounter is playable or simulatable through the UI
- action log is readable during demo

**Dependencies**
- M3-2

---

#### M3-6 Build combat review page v1
- show enemy tactic changes
- show key player actions
- show result summary
- show next-step suggestion placeholder

**Acceptance criteria**
- review page renders after combat
- at least one explanation references tactic changes

**Dependencies**
- M3-4, M3-5

---

#### M3-7 Add combat debug tools
- start encounter directly
- set player profile tags
- force enemy tactic
- set boss phase

**Acceptance criteria**
- encounter can be entered without playing full game path
- forced tactic mode is visible and testable

**Dependencies**
- M3-5

---

## M4 — Dynamic World & Explainability

### Objective
Make the world feel reactive and make AI-driven behavior legible to judges and players.

### Tasks

#### M4-1 Implement event director v1
- event pool
- trigger evaluation
- tension/balance hooks
- deterministic fallback event selection

**Acceptance criteria**
- events can be triggered by rules, not only manually
- event source is inspectable in debug mode

**Dependencies**
- M2-6

---

#### M4-2 Implement player model v1
- exploration-oriented tag
- battle-oriented tag
- story-oriented tag
- cautious or risky tag

**Acceptance criteria**
- tags update from player behavior or debug injection
- tags are stored in state/save
- tags can influence at least one system

**Dependencies**
- M2 complete or M3 partial

---

#### M4-3 Connect player model to system reactions
- affect hinting, event selection, or tactic preference
- expose state in review/debug view

**Acceptance criteria**
- at least one visible behavior changes based on player model
- change is explainable in UI or review screen

**Dependencies**
- M4-2

---

#### M4-4 Implement explanation layer v1
- NPC relation change explanation
- quest branch explanation
- enemy tactic explanation
- player model explanation

**Acceptance criteria**
- explanations exist for at least one case in each category
- explanations are concise and demo-friendly

**Dependencies**
- M2-4, M3-6, M4-2

---

#### M4-5 Expand debug route into real control panel
- state viewer
- save slot viewer
- event trigger panel
- player model editor
- NPC editor
- combat launch tools
- agent log panel placeholder

**Acceptance criteria**
- debug tools cover all MVP systems
- common test scenarios can be entered in under 30 seconds

**Dependencies**
- M1-7, M3-7, M4-1, M4-2

---

## M5 — Competition Demo Polish

### Objective
Prepare a stable, polished, judge-friendly competition build.

### Tasks

#### M5-1 Improve home/start experience
- quick start
- template start
- continue game
- new game fallback
- save detected message

**Acceptance criteria**
- user can understand first action immediately
- continue flow works when save exists

**Dependencies**
- M1-2, M2 complete

---

#### M5-2 Improve visual presentation
- pixel-styled UI pass
- readability pass
- animation/feedback pass
- 1080p presentation pass

**Acceptance criteria**
- UI is visually coherent
- key game information is readable in presentation mode

**Dependencies**
- M2 and M3 functional

---

#### M5-3 Add demo presets
- fast exploration preset
- NPC interaction preset
- boss fight preset
- explanation/review preset

**Acceptance criteria**
- each preset loads a stable demo scenario quickly
- presets are accessible through debug or hidden demo menu

**Dependencies**
- M4-5

---

#### M5-4 Add resilience and fallback behavior
- invalid save recovery
- missing data fallback
- agent/mock failure fallback
- loading timeout fallback messaging

**Acceptance criteria**
- non-critical failures do not kill demo flow
- fallback path remains visually acceptable

**Dependencies**
- all major systems in place

---

#### M5-5 Final demo script support
- ensure 3-minute highlight flow
- ensure 5-minute expanded flow
- ensure one-click recovery path for demo resets

**Acceptance criteria**
- one presenter can reliably navigate demo
- reset path works without manual code editing

**Dependencies**
- M5-1 to M5-4

---

# 5. Cross-Cutting Epics

These run alongside milestone delivery.

## E1 — Persistence Reliability
Scope:
- save schema versioning
- load validation
- corruption recovery
- migration helpers
- auto-save trigger policy

Exit criteria:
- save system is robust enough for repeated demo resets and reloads

---

## E2 — Schema & Contract Discipline
Scope:
- domain schemas
- agent payload schemas
- fixtures
- validators
- normalization utilities

Exit criteria:
- important boundaries are validated and typed

---

## E3 — Debuggability
Scope:
- route-based debug page
- scenario injection
- state inspection
- event forcing
- combat direct entry
- quick reset

Exit criteria:
- major systems can be tested without long prerequisite gameplay

---

## E4 — Explainability
Scope:
- visible rationale for tactics
- quest branch reasoning
- NPC attitude reasoning
- player model explanations
- review page summary logic

Exit criteria:
- judges can see why the system behaved the way it did

---

# 6. Initial Priority Order

## P0 — Must do immediately
- M0-1 to M0-7
- M1-1 to M1-8

## P1 — Must do for recognizable MVP
- M2-1 to M2-7
- M3-1 to M3-6

## P2 — Strongly recommended for competition strength
- M3-7
- M4-1 to M4-5

## P3 — Polish and safety
- M5-1 to M5-5

---

# 7. Suggested First 10 Codex Tasks

1. Initialize project scaffold and tooling
2. Create docs/architecture.md from PRD
3. Create docs/contracts.md with initial schemas
4. Implement repository structure
5. Add initial schemas and fixtures
6. Implement Zustand store slices
7. Implement startup load/fallback flow
8. Render one mock area
9. Implement one NPC dialogue flow + one quest transition
10. Implement save/load + `/debug` controls

---

# 8. Acceptance Standards for All Future Tasks

Every future backlog item should define:

- objective
- files/modules likely affected
- acceptance criteria
- tests required
- dependencies
- scope exclusions where needed

Do not mark tasks complete unless:
- behavior works
- lint/build/tests pass where applicable
- docs are updated if architecture/contracts changed
- any new player-facing built-in copy is localized in Simplified Chinese
- tests are updated when visible localized copy is part of the expected behavior

---

# 9. Scope Control Notes

If time becomes tight, reduce scope in this order:

### Cut last
- save/load
- 1 full playable loop
- 1 boss with visible strategy changes
- debug route
- explanation/review output

### Cut earlier
- extra polish animations
- extra side content
- extra area count beyond 3
- advanced event variety
- advanced player model sophistication

---

# 10. Competition Demo Definition

A successful demo build should allow the presenter to show:

1. start or continue a world
2. enter an area
3. talk to an NPC whose state matters
4. show quest progression
5. show area/event change
6. enter boss fight quickly
7. show tactic/phase change
8. show explanation/review
9. refresh/reopen and continue from save
10. use debug tools to prove modularity/testability

If the build can do all ten reliably, the MVP is competition-ready.
