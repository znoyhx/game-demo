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

export const npcEmotionalStateSchema = z.enum([
  'calm',
  'hopeful',
  'wary',
  'tense',
  'angry',
  'grateful',
  'resolute',
  'fearful',
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

export const npcRelationshipNetworkEdgeSchema = z
  .object({
    targetNpcId: npcIdSchema,
    bond: nonEmptyStringSchema,
    strength: relationshipScoreSchema,
  })
  .strict();

export const npcDefinitionSchema = z
  .object({
    id: npcIdSchema,
    name: nonEmptyStringSchema,
    identity: nonEmptyStringSchema,
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
    emotionalState: npcEmotionalStateSchema.default('calm'),
    memory: npcMemorySummarySchema,
    revealableInfo: npcRevealableInfoSchema,
    revealedFacts: z.array(nonEmptyStringSchema).default([]),
    revealedSecrets: z.array(nonEmptyStringSchema).default([]),
    relationshipNetwork: z.array(npcRelationshipNetworkEdgeSchema).default([]),
    currentGoal: nonEmptyStringSchema.optional(),
    hasGivenQuestIds: z.array(questIdSchema).default([]),
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

export const npcInteractionTrustExplanationSchema = z
  .object({
    before: trustScoreSchema,
    after: trustScoreSchema,
    delta: z.number().int().min(-100).max(100),
    reasons: z.array(nonEmptyStringSchema).default([]),
  })
  .strict();

export const npcInteractionRelationshipExplanationSchema = z
  .object({
    before: relationshipScoreSchema,
    after: relationshipScoreSchema,
    delta: z.number().int().min(-100).max(100),
    reasons: z.array(nonEmptyStringSchema).default([]),
  })
  .strict();

export const npcInteractionExplanationSchema = z
  .object({
    npcId: npcIdSchema,
    npcName: nonEmptyStringSchema,
    attitudeLabel: nonEmptyStringSchema,
    emotionalStateLabel: nonEmptyStringSchema,
    trust: npcInteractionTrustExplanationSchema,
    relationship: npcInteractionRelationshipExplanationSchema,
    decisionBasis: z.array(nonEmptyStringSchema).default([]),
    disclosedInfo: z.array(nonEmptyStringSchema).default([]),
    debugSummary: nonEmptyStringSchema,
  })
  .strict();

export const npcDialogueSessionSchema = z
  .object({
    npcId: npcIdSchema,
    npcName: nonEmptyStringSchema,
    history: z.array(npcDialogueTurnSchema),
    state: npcStateSchema,
    explanation: npcInteractionExplanationSchema.optional(),
  })
  .strict();

export const npcDebugStateInjectionSchema = z
  .object({
    npcId: npcIdSchema,
    trust: trustScoreSchema.optional(),
    relationship: relationshipScoreSchema.optional(),
    currentDisposition: npcDispositionSchema.optional(),
    emotionalState: npcEmotionalStateSchema.optional(),
    shortTermMemory: z.array(nonEmptyStringSchema).max(5).optional(),
    longTermMemory: z.array(nonEmptyStringSchema).max(8).optional(),
    lastInteractionAt: isoTimestampSchema.nullable().optional(),
    currentGoal: nonEmptyStringSchema.optional(),
  })
  .strict();

export type NpcRole = z.infer<typeof npcRoleSchema>;
export type NpcDisposition = z.infer<typeof npcDispositionSchema>;
export type NpcEmotionalState = z.infer<typeof npcEmotionalStateSchema>;
export type NpcMemorySummary = z.infer<typeof npcMemorySummarySchema>;
export type NpcRevealableInfo = z.infer<typeof npcRevealableInfoSchema>;
export type NpcRelationshipNetworkEdge = z.infer<typeof npcRelationshipNetworkEdgeSchema>;
export type NpcDefinition = z.infer<typeof npcDefinitionSchema>;
export type NpcState = z.infer<typeof npcStateSchema>;
export type NpcDialogueIntent = z.infer<typeof npcDialogueIntentSchema>;
export type NpcDialogueSpeaker = z.infer<typeof npcDialogueSpeakerSchema>;
export type NpcDialogueOption = z.infer<typeof npcDialogueOptionSchema>;
export type NpcDialogueTurn = z.infer<typeof npcDialogueTurnSchema>;
export type NpcInteractionTrustExplanation = z.infer<
  typeof npcInteractionTrustExplanationSchema
>;
export type NpcInteractionRelationshipExplanation = z.infer<
  typeof npcInteractionRelationshipExplanationSchema
>;
export type NpcInteractionExplanation = z.infer<
  typeof npcInteractionExplanationSchema
>;
export type NpcDialogueSession = z.infer<typeof npcDialogueSessionSchema>;
export type NpcDebugStateInjection = z.infer<
  typeof npcDebugStateInjectionSchema
>;
