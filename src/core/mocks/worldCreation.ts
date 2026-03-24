import {
  type WorldCreationRequest,
  type WorldCreationTemplate,
  worldCreationRequestSchema,
} from '../schemas';

const buildRequest = (request: WorldCreationRequest): WorldCreationRequest =>
  worldCreationRequestSchema.parse(request);

export const defaultWorldCreationRequest = buildRequest({
  theme: '灰烬前线',
  worldStyle: '像素奇幻边境',
  difficulty: 'normal',
  gameGoal: '在最后的堡垒陷落前稳定守护网络',
  learningGoal: '理解任务、战术与可解释智能系统如何在一个活着的世界里协同运作',
  preferredMode: 'hybrid',
  templateId: 'template:ward-network',
  quickStartEnabled: true,
  devModeEnabled: false,
  autosaveEnabled: true,
  autoLoadEnabled: true,
  presentationModeEnabled: false,
  promptStyle: '简洁、结构化的奇幻设定',
  saveAfterCreate: true,
});

export const quickPlayWorldCreationRequest = buildRequest({
  ...defaultWorldCreationRequest,
  difficulty: 'easy',
  gameGoal: '迅速夺回前三个区域并直面首领',
  preferredMode: 'exploration',
  templateId: 'template:quick-play',
  quickStartEnabled: true,
  devModeEnabled: false,
});

export const devTestWorldCreationRequest = buildRequest({
  ...defaultWorldCreationRequest,
  theme: '发条荒野',
  worldStyle: '像素战术试验场',
  difficulty: 'hard',
  gameGoal: '在高压世界状态下压测战斗、任务与存档循环',
  learningGoal: '快速检查代理决策、调试注入与回退行为',
  preferredMode: 'combat',
  templateId: 'template:dev-test',
  quickStartEnabled: true,
  devModeEnabled: true,
  autosaveEnabled: true,
});

export const worldCreationTemplates: WorldCreationTemplate[] = [
  {
    id: 'template:ward-network',
    label: '守护网络',
    description:
      '平衡的奇幻边境设定，包含一条主恢复线、分层支线任务与清晰可读的智能解释。',
    request: defaultWorldCreationRequest,
    featuredOutputs: {
      regions: 3,
      factions: 2,
      npcs: 5,
    },
  },
  {
    id: 'template:quick-play',
    label: '快速开局',
    description:
      '面向探索的快速开局设定，能迅速解锁前几个区域，并把上手时间压缩到一分钟内。',
    request: quickPlayWorldCreationRequest,
    featuredOutputs: {
      regions: 3,
      factions: 2,
      npcs: 5,
    },
  },
  {
    id: 'template:dev-test',
    label: '开发/测试',
    description:
      '高压、战斗优先的设定，搭配调试友好的配置，便于快速注入和检查场景。',
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
