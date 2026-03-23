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
  status: 'implemented';
}

export const agentRegistry: AgentModule[] = [
  { id: 'world-architect', mode: 'mock', status: 'implemented' },
  { id: 'quest-designer', mode: 'mock', status: 'implemented' },
  { id: 'level-builder', mode: 'mock', status: 'implemented' },
  { id: 'npc-brain', mode: 'mock', status: 'implemented' },
  { id: 'enemy-tactician', mode: 'mock', status: 'implemented' },
  { id: 'game-master', mode: 'mock', status: 'implemented' },
  { id: 'player-model', mode: 'mock', status: 'implemented' },
  { id: 'explain-coach', mode: 'mock', status: 'implemented' },
];
