import type { FeaturePanel } from '../types/appShell';

export const homeHighlights = [
  'React + TypeScript + Vite baseline with strict routing and shell layout',
  'Zustand app-shell state reserved for route-aware UI metadata',
  'Core folders staged for schemas, mocks, rules, agents, events, and persistence',
];

export const homeRoadmap = [
  'Convert contracts into runtime schemas and validate a first mock world pack',
  'Add store slices for world, area, quest, NPC, and save metadata',
  'Implement startup load/fallback flow and the first playable NPC quest slice',
];

export const gamePanels: Record<'map' | 'npc' | 'quest' | 'combat', FeaturePanel> = {
  map: {
    title: 'Map Surface',
    description: 'Reserved for pixel viewport rendering and area transition affordances.',
    status: 'placeholder',
    points: [
      'Area scene root',
      'Interaction markers',
      'Current area metadata',
    ],
    footer: 'Future logic belongs in controllers, store slices, and rules modules.',
  },
  npc: {
    title: 'NPC Interaction',
    description: 'Dedicated space for dialogue, relationship deltas, and memory-aware replies.',
    status: 'planned',
    points: ['Dialogue panel shell', 'NPC metadata summary', 'Trust and relation indicators'],
    footer: 'NPC decisions will flow through validated agent outputs and rules.',
  },
  quest: {
    title: 'Quest Tracking',
    description: 'Quest sidebar scaffold for objectives, state, and history.',
    status: 'planned',
    points: ['Main quest lane', 'Side quest lane', 'Progress and completion state'],
    footer: 'Quest transitions should remain pure and testable.',
  },
  combat: {
    title: 'Combat & Tactics',
    description: 'Boss encounter and tactic review entry point for M3.',
    status: 'planned',
    points: ['Encounter summary', 'Enemy tactic lane', 'Combat log surface'],
    footer: 'Adaptive tactics and phase changes belong in rules plus mock agents.',
  },
};

export const debugPanels: FeaturePanel[] = [
  {
    title: 'State Inspector',
    description: 'Placeholder for world, quest, NPC, combat, and save slice inspection.',
    status: 'planned',
    points: ['World viewer', 'Quest viewer', 'NPC viewer'],
    footer: 'Common test scenarios should be reachable here in under 30 seconds.',
  },
  {
    title: 'Scenario Loader',
    description: 'Future entry for deterministic mock world, save, and encounter presets.',
    status: 'planned',
    points: ['Quick start preset', 'Quest progression preset', 'Boss fight preset'],
    footer: 'Debug workflows stay separate from production gameplay paths.',
  },
  {
    title: 'Persistence Controls',
    description: 'Reserved for save slot inspection, reset, import, and recovery testing.',
    status: 'planned',
    points: ['Latest save summary', 'Reset hooks', 'Recovery flow checks'],
    footer: 'Autosave reliability remains a first-class product requirement.',
  },
  {
    title: 'Agent Logs',
    description: 'Placeholder for visible AI rationale and fallback behavior.',
    status: 'planned',
    points: ['Decision summaries', 'Fallback markers', 'Debug-facing evidence'],
    footer: 'Important agent behavior must remain inspectable and explainable.',
  },
];

export const reviewPanels: FeaturePanel[] = [
  {
    title: 'Combat Review',
    description: 'Reserved for tactic changes, phase shifts, and key player actions.',
    status: 'planned',
    points: ['Timeline summary', 'Tactic reasoning', 'Suggested next steps'],
    footer: 'This route should stay demo-friendly and concise.',
  },
  {
    title: 'NPC & Quest Review',
    description: 'Future surface for relation changes and quest branch explanations.',
    status: 'planned',
    points: ['Relation delta summary', 'Quest branch rationale', 'Player-facing recap'],
    footer: 'Explainability is visible product value, not internal-only tooling.',
  },
];
