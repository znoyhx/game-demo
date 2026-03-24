import type {
  NpcDialogueIntent,
  NpcDisposition,
  NpcEmotionalState,
} from '../../core/schemas';
import { SectionCard } from '../layout/SectionCard';

interface NpcDebugViewModel {
  id: string;
  name: string;
  role: string;
  areaName: string;
  disposition: string;
  emotionalState: string;
  trust: number;
  relationship: number;
  shortTermMemory: string[];
  longTermMemory: string[];
  currentGoal?: string;
}

interface DebugOption<TValue extends string> {
  value: TValue;
  label: string;
}

interface NpcDebugOutcomeViewModel {
  npcName: string;
  optionLabel: string;
  attitudeLabel: string;
  emotionalStateLabel: string;
  trustDelta: number;
  relationshipDelta: number;
  trustReasons: string[];
  relationshipReasons: string[];
  decisionBasis: string[];
  debugSummary: string;
}

interface NpcDebugPanelProps {
  npcs: NpcDebugViewModel[];
  selectedNpcId: string | null;
  trustValue: string;
  relationshipValue: string;
  dispositionValue: NpcDisposition;
  emotionalStateValue: NpcEmotionalState;
  shortTermMemoryValue: string;
  longTermMemoryValue: string;
  currentGoalValue: string;
  statusMessage: string | null;
  busyActionId: string | null;
  latestOutcome: NpcDebugOutcomeViewModel | null;
  dispositionOptions: Array<DebugOption<NpcDisposition>>;
  emotionalStateOptions: Array<DebugOption<NpcEmotionalState>>;
  onSelectNpc: (npcId: string) => void;
  onTrustChange: (value: string) => void;
  onRelationshipChange: (value: string) => void;
  onDispositionChange: (value: NpcDisposition) => void;
  onEmotionalStateChange: (value: NpcEmotionalState) => void;
  onShortTermMemoryChange: (value: string) => void;
  onLongTermMemoryChange: (value: string) => void;
  onCurrentGoalChange: (value: string) => void;
  onApplyInjection: () => void;
  onOpenDialogue: () => void;
  onTestBranch: (intent: NpcDialogueIntent) => void;
  onResetOutcome: () => void;
}

const branchOptions: Array<{ intent: NpcDialogueIntent; label: string }> = [
  { intent: 'greet', label: '测试问候' },
  { intent: 'ask', label: '测试询问' },
  { intent: 'trade', label: '测试交易' },
  { intent: 'quest', label: '测试任务' },
  { intent: 'persuade', label: '测试说服' },
];

const formatSignedValue = (value: number) => (value >= 0 ? `+${value}` : `${value}`);

export function NpcDebugPanel({
  npcs,
  selectedNpcId,
  trustValue,
  relationshipValue,
  dispositionValue,
  emotionalStateValue,
  shortTermMemoryValue,
  longTermMemoryValue,
  currentGoalValue,
  statusMessage,
  busyActionId,
  latestOutcome,
  dispositionOptions,
  emotionalStateOptions,
  onSelectNpc,
  onTrustChange,
  onRelationshipChange,
  onDispositionChange,
  onEmotionalStateChange,
  onShortTermMemoryChange,
  onLongTermMemoryChange,
  onCurrentGoalChange,
  onApplyInjection,
  onOpenDialogue,
  onTestBranch,
  onResetOutcome,
}: NpcDebugPanelProps) {
  const selectedNpc = npcs.find((npc) => npc.id === selectedNpcId) ?? null;

  return (
    <SectionCard
      title="角色调试"
      eyebrow={selectedNpc ? `当前角色：${selectedNpc.name}` : '当前角色：—'}
      description="直接注入关系、信任与记忆状态，并在不跑完整流程的情况下测试对话分支。"
      footer={statusMessage ?? '可先注入状态，再直接打开对话面板或测试分支结果。'}
    >
      <form className="world-creation-form">
        <label className="world-creation-form__field">
          <span>目标角色</span>
          <select
            value={selectedNpcId ?? ''}
            onChange={(event) => onSelectNpc(event.target.value)}
          >
            {npcs.map((npc) => (
              <option key={npc.id} value={npc.id}>
                {npc.name} · {npc.areaName}
              </option>
            ))}
          </select>
        </label>

        <label className="world-creation-form__field">
          <span>信任值</span>
          <input
            type="text"
            inputMode="numeric"
            value={trustValue}
            onChange={(event) => onTrustChange(event.target.value)}
          />
        </label>

        <label className="world-creation-form__field">
          <span>关系值</span>
          <input
            type="text"
            inputMode="numeric"
            value={relationshipValue}
            onChange={(event) => onRelationshipChange(event.target.value)}
          />
        </label>

        <label className="world-creation-form__field">
          <span>当前态度</span>
          <select
            value={dispositionValue}
            onChange={(event) => onDispositionChange(event.target.value as NpcDisposition)}
          >
            {dispositionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="world-creation-form__field">
          <span>当前情绪</span>
          <select
            value={emotionalStateValue}
            onChange={(event) =>
              onEmotionalStateChange(event.target.value as NpcEmotionalState)
            }
          >
            {emotionalStateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="world-creation-form__field world-creation-form__field--wide">
          <span>当前目标</span>
          <input
            type="text"
            value={currentGoalValue}
            onChange={(event) => onCurrentGoalChange(event.target.value)}
          />
        </label>

        <label className="world-creation-form__field world-creation-form__field--wide">
          <span>短期记忆（每行一条）</span>
          <textarea
            value={shortTermMemoryValue}
            onChange={(event) => onShortTermMemoryChange(event.target.value)}
            rows={4}
          />
        </label>

        <label className="world-creation-form__field world-creation-form__field--wide">
          <span>长期记忆（每行一条）</span>
          <textarea
            value={longTermMemoryValue}
            onChange={(event) => onLongTermMemoryChange(event.target.value)}
            rows={4}
          />
        </label>
      </form>

      <ul className="section-card__list">
        <li>角色定位：{selectedNpc ? `${selectedNpc.role} · ${selectedNpc.areaName}` : '—'}</li>
        <li>当前态度：{selectedNpc ? selectedNpc.disposition : '—'}</li>
        <li>当前情绪：{selectedNpc ? selectedNpc.emotionalState : '—'}</li>
        <li>
          当前信任 / 关系：
          {selectedNpc ? ` ${selectedNpc.trust} / ${selectedNpc.relationship}` : ' —'}
        </li>
      </ul>

      <div className="hero-callout__actions">
        <button
          className="pixel-button"
          type="button"
          disabled={!selectedNpc || busyActionId !== null}
          onClick={onApplyInjection}
        >
          {busyActionId === 'npc-inject' ? '处理中…' : '应用状态注入'}
        </button>
        <button
          className="pixel-button pixel-button--ghost"
          type="button"
          disabled={!selectedNpc || busyActionId !== null}
          onClick={onOpenDialogue}
        >
          {busyActionId === 'npc-open' ? '处理中…' : '直接打开对话'}
        </button>
        <button
          className="pixel-button pixel-button--ghost"
          type="button"
          disabled={!selectedNpc || busyActionId !== null}
          onClick={onResetOutcome}
        >
          {busyActionId === 'npc-reset' ? '处理中…' : '回滚到测试前'}
        </button>
      </div>

      <div className="hero-callout__actions">
        {branchOptions.map((option) => (
          <button
            key={option.intent}
            className="pixel-button pixel-button--ghost"
            type="button"
            disabled={!selectedNpc || busyActionId !== null}
            onClick={() => onTestBranch(option.intent)}
          >
            {busyActionId === `npc-branch:${option.intent}` ? '处理中…' : option.label}
          </button>
        ))}
      </div>

      {latestOutcome ? (
        <>
          <ul className="section-card__list">
            <li>最近测试：{latestOutcome.npcName} · {latestOutcome.optionLabel}</li>
            <li>输出态度：{latestOutcome.attitudeLabel}</li>
            <li>输出情绪：{latestOutcome.emotionalStateLabel}</li>
            <li>
              信任变化：{formatSignedValue(latestOutcome.trustDelta)}
              {latestOutcome.trustReasons.length > 0
                ? `（${latestOutcome.trustReasons.join('；')}）`
                : ''}
            </li>
            <li>
              关系变化：{formatSignedValue(latestOutcome.relationshipDelta)}
              {latestOutcome.relationshipReasons.length > 0
                ? `（${latestOutcome.relationshipReasons.join('；')}）`
                : ''}
            </li>
          </ul>
          <p className="section-card__description">判定摘要：{latestOutcome.debugSummary}</p>
          {latestOutcome.decisionBasis.length > 0 ? (
            <ul className="section-card__list">
              {latestOutcome.decisionBasis.map((basis) => (
                <li key={basis}>{basis}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </SectionCard>
  );
}
