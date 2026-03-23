export interface AgentModule {
  id:
    | 'world-architect'
    | 'quest-designer'
    | 'level-builder'
    | 'npc-brain'
    | 'enemy-tactician'
    | 'game-master'
    | 'player-model'
    | 'explain-coach';
  mode: 'mock';
  status: 'planned';
}

export const agentRegistry: AgentModule[] = [
  { id: 'world-architect', mode: 'mock', status: 'planned' },
  { id: 'quest-designer', mode: 'mock', status: 'planned' },
  { id: 'level-builder', mode: 'mock', status: 'planned' },
  { id: 'npc-brain', mode: 'mock', status: 'planned' },
  { id: 'enemy-tactician', mode: 'mock', status: 'planned' },
  { id: 'game-master', mode: 'mock', status: 'planned' },
  { id: 'player-model', mode: 'mock', status: 'planned' },
  { id: 'explain-coach', mode: 'mock', status: 'planned' },
];
