import type {
  CombatDebugPlayerPattern,
  EnemyTacticType,
} from '../../core/schemas';
import { SectionCard } from '../layout/SectionCard';

interface CombatEncounterOption {
  id: string;
  title: string;
  areaName: string;
  modeLabel: string;
  phaseCount: number;
}

interface DebugOption<TValue extends string> {
  value: TValue;
  label: string;
}

interface CombatStatusViewModel {
  encounterTitle: string;
  modeLabel: string;
  turn: number;
  phaseLabel: string;
  tacticLabel: string;
  playerHpLabel: string;
  enemyHpLabel: string;
  resultLabel?: string;
}

interface CombatLogViewModel {
  turn: number;
  phaseLabel: string;
  tacticLabel: string;
  actions: string[];
}

interface CombatReplaySummaryViewModel {
  tacticChanges: string[];
  phaseChanges: string[];
  keyPlayerBehaviors: string[];
}

interface CombatDebugPanelProps {
  encounters: CombatEncounterOption[];
  selectedEncounterId: string | null;
  selectedTactic: EnemyTacticType | '';
  selectedPhaseId: string;
  selectedPattern: CombatDebugPlayerPattern;
  seedValue: string;
  simulateRoundsValue: string;
  busyActionId: string | null;
  statusMessage: string | null;
  currentCombat: CombatStatusViewModel | null;
  logs: CombatLogViewModel[];
  replaySummary: CombatReplaySummaryViewModel | null;
  tacticOptions: Array<DebugOption<EnemyTacticType>>;
  phaseOptions: Array<DebugOption<string>>;
  patternOptions: Array<DebugOption<CombatDebugPlayerPattern>>;
  onSelectEncounter: (encounterId: string) => void;
  onSelectTactic: (tactic: EnemyTacticType | '') => void;
  onSelectPhase: (phaseId: string) => void;
  onSelectPattern: (pattern: CombatDebugPlayerPattern) => void;
  onSeedChange: (value: string) => void;
  onSimulateRoundsChange: (value: string) => void;
  onStartEncounter: () => void;
  onApplyForcedTactic: () => void;
  onClearForcedTactic: () => void;
  onApplyForcedPhase: () => void;
  onClearForcedPhase: () => void;
  onSimulateRounds: () => void;
}

export function CombatDebugPanel({
  encounters,
  selectedEncounterId,
  selectedTactic,
  selectedPhaseId,
  selectedPattern,
  seedValue,
  simulateRoundsValue,
  busyActionId,
  statusMessage,
  currentCombat,
  logs,
  replaySummary,
  tacticOptions,
  phaseOptions,
  patternOptions,
  onSelectEncounter,
  onSelectTactic,
  onSelectPhase,
  onSelectPattern,
  onSeedChange,
  onSimulateRoundsChange,
  onStartEncounter,
  onApplyForcedTactic,
  onClearForcedTactic,
  onApplyForcedPhase,
  onClearForcedPhase,
  onSimulateRounds,
}: CombatDebugPanelProps) {
  const selectedEncounter =
    encounters.find((encounter) => encounter.id === selectedEncounterId) ?? null;

  return (
    <SectionCard
      title="战斗调试"
      eyebrow={
        currentCombat
          ? `当前战斗：${currentCombat.encounterTitle}`
          : selectedEncounter
            ? `预备遭遇：${selectedEncounter.title}`
            : '预备遭遇：—'
      }
      description="直接进入任意遭遇、强制敌方战术与首领阶段，并用固定种子复现实验型回合模拟。"
      footer={
        statusMessage ??
        '可先启动遭遇，再锁定战术、手动切换阶段或按固定模式批量模拟回合。'
      }
    >
      <form className="world-creation-form">
        <label className="world-creation-form__field">
          <span>目标遭遇</span>
          <select
            value={selectedEncounterId ?? ''}
            onChange={(event) => onSelectEncounter(event.target.value)}
          >
            {encounters.map((encounter) => (
              <option key={encounter.id} value={encounter.id}>
                {encounter.title} · {encounter.areaName}
              </option>
            ))}
          </select>
        </label>

        <label className="world-creation-form__field">
          <span>强制战术</span>
          <select
            value={selectedTactic}
            onChange={(event) => onSelectTactic(event.target.value as EnemyTacticType | '')}
          >
            <option value="">跟随首领决策</option>
            {tacticOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="world-creation-form__field">
          <span>首领阶段</span>
          <select value={selectedPhaseId} onChange={(event) => onSelectPhase(event.target.value)}>
            <option value="">保持当前阶段</option>
            {phaseOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="world-creation-form__field">
          <span>玩家模式</span>
          <select
            value={selectedPattern}
            onChange={(event) =>
              onSelectPattern(event.target.value as CombatDebugPlayerPattern)
            }
          >
            {patternOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="world-creation-form__field">
          <span>固定种子</span>
          <input
            type="text"
            inputMode="numeric"
            value={seedValue}
            onChange={(event) => onSeedChange(event.target.value)}
          />
        </label>

        <label className="world-creation-form__field">
          <span>模拟回合数</span>
          <input
            type="text"
            inputMode="numeric"
            value={simulateRoundsValue}
            onChange={(event) => onSimulateRoundsChange(event.target.value)}
          />
        </label>
      </form>

      <ul className="section-card__list">
        <li>
          遭遇信息：
          {selectedEncounter
            ? ` ${selectedEncounter.title} · ${selectedEncounter.modeLabel} · ${selectedEncounter.phaseCount} 个阶段`
            : ' —'}
        </li>
        <li>当前回合：{currentCombat?.turn ?? '—'}</li>
        <li>当前阶段：{currentCombat?.phaseLabel ?? '—'}</li>
        <li>当前战术：{currentCombat?.tacticLabel ?? '—'}</li>
        <li>玩家生命：{currentCombat?.playerHpLabel ?? '—'}</li>
        <li>敌方生命：{currentCombat?.enemyHpLabel ?? '—'}</li>
        <li>结算状态：{currentCombat?.resultLabel ?? '未结算'}</li>
      </ul>

      <div className="hero-callout__actions">
        <button
          className="pixel-button"
          type="button"
          disabled={!selectedEncounterId || busyActionId !== null}
          onClick={onStartEncounter}
        >
          {busyActionId === 'combat-start' ? '处理中…' : '直接进入遭遇'}
        </button>
        <button
          className="pixel-button pixel-button--ghost"
          type="button"
          disabled={!selectedTactic || busyActionId !== null}
          onClick={onApplyForcedTactic}
        >
          {busyActionId === 'combat-force-tactic' ? '处理中…' : '应用强制战术'}
        </button>
        <button
          className="pixel-button pixel-button--ghost"
          type="button"
          disabled={busyActionId !== null}
          onClick={onClearForcedTactic}
        >
          {busyActionId === 'combat-clear-tactic' ? '处理中…' : '清除战术锁定'}
        </button>
      </div>

      <div className="hero-callout__actions">
        <button
          className="pixel-button pixel-button--ghost"
          type="button"
          disabled={!selectedPhaseId || busyActionId !== null}
          onClick={onApplyForcedPhase}
        >
          {busyActionId === 'combat-force-phase' ? '处理中…' : '切换首领阶段'}
        </button>
        <button
          className="pixel-button pixel-button--ghost"
          type="button"
          disabled={busyActionId !== null}
          onClick={onClearForcedPhase}
        >
          {busyActionId === 'combat-clear-phase' ? '处理中…' : '清除阶段锁定'}
        </button>
        <button
          className="pixel-button pixel-button--ghost"
          type="button"
          disabled={!currentCombat || busyActionId !== null}
          onClick={onSimulateRounds}
        >
          {busyActionId === 'combat-simulate' ? '处理中…' : '按模式模拟回合'}
        </button>
      </div>

      <div className="panel-grid panel-grid--two">
        <SectionCard
          title="战斗日志回放"
          eyebrow={logs.length > 0 ? `${logs.length} 个回合片段` : '暂无日志'}
          description="这里展示当前战斗的逐回合日志，可直接用于复盘阶段与战术变化。"
          footer="若使用固定种子与同一玩家模式，再次模拟会得到一致的动作序列。"
        >
          <ul className="section-card__list">
            {logs.length === 0 ? (
              <li>尚未产生战斗日志。</li>
            ) : (
              logs.map((log) => (
                <li key={`${log.turn}-${log.phaseLabel}-${log.tacticLabel}`}>
                  第 {log.turn} 回合 · {log.phaseLabel} · {log.tacticLabel}
                  <div>{log.actions.join(' / ')}</div>
                </li>
              ))
            )}
          </ul>
        </SectionCard>

        <SectionCard
          title="日志重构摘要"
          eyebrow={replaySummary ? '根据当前日志重构' : '等待战斗数据'}
          description="不依赖页面临时状态，直接从战斗日志中重构关键战术与玩家行为轨迹。"
          footer="这份摘要可用于调试说明，也可作为后续回顾页面的交叉核验。"
        >
          <ul className="section-card__list">
            {replaySummary ? (
              <>
                <li>
                  战术切换：
                  {replaySummary.tacticChanges.length > 0
                    ? ` ${replaySummary.tacticChanges.join('；')}`
                    : ' 暂无可见切换'}
                </li>
                <li>
                  阶段变化：
                  {replaySummary.phaseChanges.length > 0
                    ? ` ${replaySummary.phaseChanges.join('；')}`
                    : ' 暂无阶段变化'}
                </li>
                <li>
                  玩家重点行为：
                  {replaySummary.keyPlayerBehaviors.length > 0
                    ? ` ${replaySummary.keyPlayerBehaviors.join('；')}`
                    : ' 尚未形成稳定模式'}
                </li>
              </>
            ) : (
              <li>启动遭遇并推进至少一个回合后，这里会显示日志重构结果。</li>
            )}
          </ul>
        </SectionCard>
      </div>
    </SectionCard>
  );
}
