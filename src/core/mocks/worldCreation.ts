import {
  type WorldCreationRequest,
  type WorldCreationTemplate,
  worldCreationRequestSchema,
} from '../schemas';

const buildRequest = (request: WorldCreationRequest): WorldCreationRequest =>
  worldCreationRequestSchema.parse(request);

export const defaultWorldCreationRequest = buildRequest({
  theme: 'ember frontier',
  worldStyle: 'pixel fantasy frontier',
  difficulty: 'normal',
  gameGoal: 'stabilize the ward network before the last bastion falls',
  learningGoal: 'learn how quests, tactics, and explainable AI systems connect across a living world',
  preferredMode: 'hybrid',
  templateId: 'template:ward-network',
  quickStartEnabled: true,
  devModeEnabled: false,
  autosaveEnabled: true,
  autoLoadEnabled: true,
  presentationModeEnabled: false,
  promptStyle: 'concise structured fantasy setup',
  saveAfterCreate: true,
});

export const quickPlayWorldCreationRequest = buildRequest({
  ...defaultWorldCreationRequest,
  difficulty: 'easy',
  gameGoal: 'secure the first three regions and confront the boss quickly',
  preferredMode: 'exploration',
  templateId: 'template:quick-play',
  quickStartEnabled: true,
  devModeEnabled: false,
});

export const devTestWorldCreationRequest = buildRequest({
  ...defaultWorldCreationRequest,
  theme: 'clockwork wilds',
  worldStyle: 'pixel tactics laboratory',
  difficulty: 'hard',
  gameGoal: 'stress test the combat, quest, and persistence loops under a hostile world state',
  learningGoal: 'inspect agent decisions, debug injections, and fallback behavior quickly',
  preferredMode: 'combat',
  templateId: 'template:dev-test',
  quickStartEnabled: true,
  devModeEnabled: true,
  autosaveEnabled: true,
});

export const worldCreationTemplates: WorldCreationTemplate[] = [
  {
    id: 'template:ward-network',
    label: 'Ward Network',
    description:
      'Balanced fantasy frontier with one main recovery arc, layered side quests, and readable AI explanations.',
    request: defaultWorldCreationRequest,
    featuredOutputs: {
      regions: 3,
      factions: 2,
      npcs: 5,
    },
  },
  {
    id: 'template:quick-play',
    label: 'Quick Play',
    description:
      'Fast-start exploration setup that unlocks the first routes quickly and keeps the onboarding under a minute.',
    request: quickPlayWorldCreationRequest,
    featuredOutputs: {
      regions: 3,
      factions: 2,
      npcs: 5,
    },
  },
  {
    id: 'template:dev-test',
    label: 'Dev/Test',
    description:
      'High-pressure combat-first setup with debug-friendly configuration for rapid scenario injection and inspection.',
    request: devTestWorldCreationRequest,
    featuredOutputs: {
      regions: 3,
      factions: 2,
      npcs: 5,
    },
  },
];

export const findWorldCreationTemplate = (templateId: string) =>
  worldCreationTemplates.find((template) => template.id === templateId) ?? null;
