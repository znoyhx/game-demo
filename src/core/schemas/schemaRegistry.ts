import type { ZodTypeAny } from 'zod';

import { agentContractsSchema } from './agent.schema';
import { areaSchema } from './area.schema';
import { combatStateSchema } from './combat.schema';
import { eventLogEntrySchema } from './event.schema';
import { npcStateSchema } from './npc.schema';
import { playerStateSchema } from './player.schema';
import { questDefinitionSchema } from './quest.schema';
import { reviewPayloadSchema } from './review.schema';
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
  { name: 'area.schema', owner: 'area', status: 'ready', schema: areaSchema },
  { name: 'quest.schema', owner: 'quest', status: 'ready', schema: questDefinitionSchema },
  { name: 'npc.schema', owner: 'npc', status: 'ready', schema: npcStateSchema },
  { name: 'player.schema', owner: 'player', status: 'ready', schema: playerStateSchema },
  { name: 'event.schema', owner: 'event', status: 'ready', schema: eventLogEntrySchema },
  { name: 'combat.schema', owner: 'combat', status: 'ready', schema: combatStateSchema },
  { name: 'review.schema', owner: 'review', status: 'ready', schema: reviewPayloadSchema },
  { name: 'save.schema', owner: 'save', status: 'ready', schema: saveSnapshotSchema },
  { name: 'agent.schema', owner: 'agent', status: 'ready', schema: agentContractsSchema },
];
