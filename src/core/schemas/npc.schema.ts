import { z } from 'zod';

import {
  areaIdSchema,
  booleanFlagRecordSchema,
  factionIdSchema,
  isoTimestampSchema,
  nonEmptyStringSchema,
  npcIdSchema,
  questIdSchema,
  relationshipScoreSchema,
  trustScoreSchema,
} from './shared';

export const npcRoleSchema = z.enum([
  'guide',
  'merchant',
  'villager',
  'scholar',
  'guard',
  'enemy',
  'boss',
  'mystic',
]);

export const npcDispositionSchema = z.enum([
  'friendly',
  'neutral',
  'suspicious',
  'hostile',
  'afraid',
  'secretive',
]);

export const npcMemorySummarySchema = z
  .object({
    shortTerm: z.array(nonEmptyStringSchema),
    longTerm: z.array(nonEmptyStringSchema),
    lastInteractionAt: isoTimestampSchema.optional(),
  })
  .strict();

export const npcRevealableInfoSchema = z
  .object({
    publicFacts: z.array(nonEmptyStringSchema),
    trustGatedFacts: z.array(
      z
        .object({
          minTrust: trustScoreSchema,
          fact: nonEmptyStringSchema,
        })
        .strict(),
    ),
    hiddenSecrets: z.array(nonEmptyStringSchema),
  })
  .strict();

export const npcDefinitionSchema = z
  .object({
    id: npcIdSchema,
    name: nonEmptyStringSchema,
    role: npcRoleSchema,
    factionId: factionIdSchema.optional(),
    areaId: areaIdSchema,
    personalityTags: z.array(nonEmptyStringSchema),
    baseDisposition: npcDispositionSchema,
    avatarKey: nonEmptyStringSchema.optional(),
  })
  .strict();

export const npcStateSchema = z
  .object({
    npcId: npcIdSchema,
    relationship: relationshipScoreSchema,
    trust: trustScoreSchema,
    currentDisposition: npcDispositionSchema,
    memory: npcMemorySummarySchema,
    revealableInfo: npcRevealableInfoSchema,
    currentGoal: nonEmptyStringSchema.optional(),
    hasGivenQuestIds: z.array(questIdSchema),
    flags: booleanFlagRecordSchema.optional(),
  })
  .strict();

export const npcDialogueIntentSchema = z.enum(['greet', 'ask', 'trade', 'quest', 'persuade', 'leave']);
export const npcDialogueSpeakerSchema = z.enum(['player', 'npc', 'system']);

export const npcDialogueOptionSchema = z
  .object({
    id: nonEmptyStringSchema,
    label: nonEmptyStringSchema,
    intent: npcDialogueIntentSchema,
  })
  .strict();

export const npcDialogueTurnSchema = z
  .object({
    speaker: npcDialogueSpeakerSchema,
    text: nonEmptyStringSchema,
  })
  .strict();

export type NpcRole = z.infer<typeof npcRoleSchema>;
export type NpcDisposition = z.infer<typeof npcDispositionSchema>;
export type NpcMemorySummary = z.infer<typeof npcMemorySummarySchema>;
export type NpcRevealableInfo = z.infer<typeof npcRevealableInfoSchema>;
export type NpcDefinition = z.infer<typeof npcDefinitionSchema>;
export type NpcState = z.infer<typeof npcStateSchema>;
export type NpcDialogueIntent = z.infer<typeof npcDialogueIntentSchema>;
export type NpcDialogueSpeaker = z.infer<typeof npcDialogueSpeakerSchema>;
export type NpcDialogueOption = z.infer<typeof npcDialogueOptionSchema>;
export type NpcDialogueTurn = z.infer<typeof npcDialogueTurnSchema>;
