import type { FeaturePanel } from '../types/appShell';

export const homeHighlights = [
  '基于 React + TypeScript + Vite，具备清晰路由与应用壳层',
  'Zustand 应用壳层状态已为路由感知 UI 元数据预留',
  '核心目录已为 schema、mock、规则、代理、事件与持久化分层',
];

export const homeRoadmap = [
  '把契约转成运行时 schema，并验证首个 mock 世界包',
  '补齐世界、区域、任务、NPC 与存档元数据的 store 切片',
  '实现启动加载/回退流程，以及首个可玩的 NPC 任务切片',
];

export const gamePanels: Record<'map' | 'npc' | 'quest' | 'combat', FeaturePanel> = {
  map: {
    title: '地图区域',
    description: '为像素视口渲染与区域切换交互预留的显示区域。',
    status: 'placeholder',
    points: [
      '区域场景根节点',
      '交互标记点',
      '当前区域元数据',
    ],
    footer: '后续逻辑应继续放在控制器、状态切片和规则模块中。',
  },
  npc: {
    title: 'NPC 互动',
    description: '用于对话、关系变化与记忆感知回复的专属区域。',
    status: 'planned',
    points: ['对话面板骨架', 'NPC 元数据摘要', '信任与关系指示器'],
    footer: 'NPC 决策将通过经过校验的代理输出与规则层流转。',
  },
  quest: {
    title: '任务追踪',
    description: '用于展示目标、状态与历史的任务侧边栏骨架。',
    status: 'planned',
    points: ['主线任务轨道', '支线任务轨道', '进度与完成状态'],
    footer: '任务状态变更应保持纯净且易于测试。',
  },
  combat: {
    title: '战斗与战术',
    description: '为 M3 阶段的首领战和战术回顾预留入口。',
    status: 'planned',
    points: ['遭遇战摘要', '敌方战术轨道', '战斗日志区域'],
    footer: '自适应战术和阶段变化应由规则层与 mock 代理共同负责。',
  },
};

export const debugPanels: FeaturePanel[] = [
  {
    title: '状态检查器',
    description: '为世界、任务、NPC、战斗与存档切片检查预留的面板。',
    status: 'planned',
    points: ['世界查看器', '任务查看器', 'NPC 查看器'],
    footer: '常用测试场景应能在 30 秒内从这里进入。',
  },
  {
    title: '场景装载器',
    description: '未来用于加载确定性 mock 世界、存档和战斗预设的入口。',
    status: 'planned',
    points: ['快速开局预设', '任务推进预设', '首领战预设'],
    footer: '调试流程应与正式游玩路径保持分离。',
  },
  {
    title: '持久化控制',
    description: '为存档槽检查、重置、导入与恢复测试预留的区域。',
    status: 'planned',
    points: ['最近存档摘要', '重置钩子', '恢复流程检查'],
    footer: '自动存档可靠性仍然是产品的一等需求。',
  },
  {
    title: '代理日志',
    description: '为可见 AI 推理与回退行为预留的面板。',
    status: 'planned',
    points: ['决策摘要', '回退标记', '面向调试的证据'],
    footer: '关键代理行为必须保持可检查、可解释。',
  },
];

export const reviewPanels: FeaturePanel[] = [
  {
    title: '战斗回顾',
    description: '用于展示战术变化、阶段切换与关键玩家操作。',
    status: 'planned',
    points: ['时间线摘要', '战术原因说明', '下一步建议'],
    footer: '这个页面应保持适合演示且信息精炼。',
  },
  {
    title: 'NPC 与任务回顾',
    description: '未来用于展示关系变化与任务分支解释的区域。',
    status: 'planned',
    points: ['关系变化摘要', '任务分支原因', '面向玩家的回顾'],
    footer: '可解释性是用户可见的产品价值，不只是内部工具。',
  },
];
