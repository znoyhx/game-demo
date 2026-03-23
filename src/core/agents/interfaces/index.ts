import type {
  EnemyTacticianInput,
  EnemyTacticianOutput,
  ExplainCoachInput,
  ExplainCoachOutput,
  GameMasterInput,
  GameMasterOutput,
  LevelBuilderInput,
  LevelBuilderOutput,
  NpcBrainInput,
  NpcBrainOutput,
  PlayerModelInput,
  PlayerModelOutput,
  QuestDesignerInput,
  QuestDesignerOutput,
  WorldArchitectInput,
  WorldArchitectOutput,
} from '../../schemas';

export type AgentModuleId =
  | 'world-architect'
  | 'quest-designer'
  | 'level-builder'
  | 'npc-brain'
  | 'enemy-tactician'
  | 'game-master'
  | 'player-model'
  | 'explain-coach';

export interface AgentService<TInput, TOutput> {
  readonly id: AgentModuleId;
  readonly mode: 'mock';
  run(input: TInput): Promise<TOutput>;
}

export type WorldArchitectAgent = AgentService<
  WorldArchitectInput,
  WorldArchitectOutput
>;

export type QuestDesignerAgent = AgentService<
  QuestDesignerInput,
  QuestDesignerOutput
>;

export type LevelBuilderAgent = AgentService<
  LevelBuilderInput,
  LevelBuilderOutput
>;

export type NpcBrainAgent = AgentService<NpcBrainInput, NpcBrainOutput>;

export type EnemyTacticianAgent = AgentService<
  EnemyTacticianInput,
  EnemyTacticianOutput
>;

export type GameMasterAgent = AgentService<GameMasterInput, GameMasterOutput>;

export type PlayerModelAgent = AgentService<
  PlayerModelInput,
  PlayerModelOutput
>;

export type ExplainCoachAgent = AgentService<
  ExplainCoachInput,
  ExplainCoachOutput
>;

export interface AgentSet {
  worldArchitect: WorldArchitectAgent;
  questDesigner: QuestDesignerAgent;
  levelBuilder: LevelBuilderAgent;
  npcBrain: NpcBrainAgent;
  enemyTactician: EnemyTacticianAgent;
  gameMaster: GameMasterAgent;
  playerModel: PlayerModelAgent;
  explainCoach: ExplainCoachAgent;
}
