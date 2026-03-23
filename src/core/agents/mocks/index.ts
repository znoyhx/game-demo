import type { AgentSet } from '../interfaces';

import { MockEnemyTacticianAgent } from './enemyTacticianMockAgent';
import { MockExplainCoachAgent } from './explainCoachMockAgent';
import { MockGameMasterAgent } from './gameMasterMockAgent';
import { MockLevelBuilderAgent } from './levelBuilderMockAgent';
import { MockNpcBrainAgent } from './npcBrainMockAgent';
import { MockPlayerModelAgent } from './playerModelMockAgent';
import { MockQuestDesignerAgent } from './questDesignerMockAgent';
import { MockWorldArchitectAgent } from './worldArchitectMockAgent';

export * from './enemyTacticianMockAgent';
export * from './explainCoachMockAgent';
export * from './gameMasterMockAgent';
export * from './levelBuilderMockAgent';
export * from './npcBrainMockAgent';
export * from './playerModelMockAgent';
export * from './questDesignerMockAgent';
export * from './worldArchitectMockAgent';

export const createMockAgentSet = (): AgentSet => ({
  worldArchitect: new MockWorldArchitectAgent(),
  questDesigner: new MockQuestDesignerAgent(),
  levelBuilder: new MockLevelBuilderAgent(),
  npcBrain: new MockNpcBrainAgent(),
  enemyTactician: new MockEnemyTacticianAgent(),
  gameMaster: new MockGameMasterAgent(),
  playerModel: new MockPlayerModelAgent(),
  explainCoach: new MockExplainCoachAgent(),
});
