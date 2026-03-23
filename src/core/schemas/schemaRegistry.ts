import type { ZodTypeAny } from 'zod';

import { agentContractsSchema } from './agent.schema';
import { mapStateSchema } from './area.schema';
import { combatStateSchema } from './combat.schema';
import { gameConfigStateSchema } from './config.schema';
import { worldCreationRequestSchema } from './creation.schema';
import { eventLogEntrySchema } from './event.schema';
import { npcStateSchema } from './npc.schema';
import { playerStateSchema } from './player.schema';
import { questDefinitionSchema } from './quest.schema';
import { reviewPayloadSchema } from './review.schema';
import { sessionSnapshotSchema } from './session.schema';
import type { SchemaOwner } from './shared';
import { saveSnapshotSchema } from './save.schema';
import { worldSchema } from './world.schema';

export interface SchemaRegistryEntry {
  name: string;
  owner: SchemaOwner;
  status: 'ready';
  schema: ZodTypeAny;
}

export const schemaRegistry: SchemaRegistryEntry[] = [
  { name: 'world.schema', owner: 'world', status: 'ready', schema: worldSchema },
  { name: 'map.schema', owner: 'area', status: 'ready', schema: mapStateSchema },
  { name: 'quest.schema', owner: 'quest', status: 'ready', schema: questDefinitionSchema },
  { name: 'npc.schema', owner: 'npc', status: 'ready', schema: npcStateSchema },
  { name: 'player.schema', owner: 'player', status: 'ready', schema: playerStateSchema },
  { name: 'config.schema', owner: 'config', status: 'ready', schema: gameConfigStateSchema },
  { name: 'creation.schema', owner: 'creation', status: 'ready', schema: worldCreationRequestSchema },
  { name: 'event.schema', owner: 'event', status: 'ready', schema: eventLogEntrySchema },
  { name: 'combat.schema', owner: 'combat', status: 'ready', schema: combatStateSchema },
  { name: 'review.schema', owner: 'review', status: 'ready', schema: reviewPayloadSchema },
  { name: 'save.schema', owner: 'save', status: 'ready', schema: saveSnapshotSchema },
  { name: 'session.schema', owner: 'session', status: 'ready', schema: sessionSnapshotSchema },
  { name: 'agent.schema', owner: 'agent', status: 'ready', schema: agentContractsSchema },
];
