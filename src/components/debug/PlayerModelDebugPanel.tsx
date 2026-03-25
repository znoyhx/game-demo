import type { NpcDialogueIntent, PlayerProfileTag } from '../../core/schemas';
import { Badge } from '../pixel-ui/Badge';
import { SectionCard } from '../layout/SectionCard';

interface DebugOption<TValue extends string> {
  value: TValue;
  label: string;
  description?: string;
  expectedTagLabels?: string[];
}

interface PlayerModelSummaryViewModel {
  tagLabels: string[];
  dominantStyleLabel?: string;
  rationale: string[];
  riskForecast?: string;
  stuckPoint?: string;
  injected: boolean;
  debugSourceLabel?: string;
  debugLabel?: string;
  lastUpdatedAt?: string;
}

interface PlayerModelReactionPreviewViewModel {
  tagLabels: string[];
  difficultyLabel: string;
  difficultySummary: string;
  hintSummaries: string[];
  npcReactionSummary: string;
  npcReasonSummary?: string;
  enemyPriorityLabels: string[];
  enemyReasonSummary?: string;
}

interface PlayerModelDebugPanelProps {
  summary: PlayerModelSummaryViewModel;
  manualTagOptions: Array<DebugOption<PlayerProfileTag>>;
  manualSelectedTags: PlayerProfileTag[];
  comparisonSelectedTags: PlayerProfileTag[];
  replayOptions: Array<DebugOption<string>>;
  scenarioOptions: Array<DebugOption<string>>;
  npcIntentOptions: Array<DebugOption<NpcDialogueIntent>>;
  selectedReplayId: string;
  selectedScenarioId: string;
  selectedComparisonNpcIntent: NpcDialogueIntent;
  statusMessage: string | null;
  busyActionId: string | null;
  currentReaction: PlayerModelReactionPreviewViewModel;
  comparisonReaction: PlayerModelReactionPreviewViewModel | null;
  onToggleManualTag: (tag: PlayerProfileTag) => void;
  onToggleComparisonTag: (tag: PlayerProfileTag) => void;
  onSelectReplay: (replayId: string) => void;
  onSelectScenario: (scenarioId: string) => void;
  onSelectComparisonNpcIntent: (intent: NpcDialogueIntent) => void;
  onApplyManualTags: () => void;
  onReplayBehavior: () => void;
  onApplyScenario: () => void;
  onClearInjected: () => void;
}

const buildButtonClassName = (selected: boolean) =>
  selected ? 'pixel-button' : 'pixel-button pixel-button--ghost';

export function PlayerModelDebugPanel({
  summary,
  manualTagOptions,
  manualSelectedTags,
  comparisonSelectedTags,
  replayOptions,
  scenarioOptions,
  npcIntentOptions,
  selectedReplayId,
  selectedScenarioId,
  selectedComparisonNpcIntent,
  statusMessage,
  busyActionId,
  currentReaction,
  comparisonReaction,
  onToggleManualTag,
  onToggleComparisonTag,
  onSelectReplay,
  onSelectScenario,
  onSelectComparisonNpcIntent,
  onApplyManualTags,
  onReplayBehavior,
  onApplyScenario,
  onClearInjected,
}: PlayerModelDebugPanelProps) {
  return (
    <SectionCard
      title="玩家画像调试"
      eyebrow={
        summary.injected
          ? `调试画像：${summary.debugLabel ?? '已注入'}`
          : `当前主导：${summary.dominantStyleLabel ?? '未定型'}`
      }
      description="直接注入标签、按行为回放重建画像，并比较不同画像对提示、角色反应与敌方反应的影响。"
      footer={
        statusMessage ??
        '只有注入、回放与场景生成会写入当前存档；右侧对比预览仅用于观察系统反应。'
      }
    >
      <div className="hero-callout__actions">
        {summary.injected ? (
          <Badge tone="warning">
            调试注入中：{summary.debugSourceLabel ?? '调试画像'}
          </Badge>
        ) : (
          <Badge tone="info">当前为自然推导画像</Badge>
        )}
        {summary.lastUpdatedAt ? (
          <Badge tone="default">最近更新：{summary.lastUpdatedAt}</Badge>
        ) : null}
      </div>

      <ul className="section-card__list">
        <li>当前标签：{summary.tagLabels.length > 0 ? summary.tagLabels.join('、') : '无'}</li>
        <li>主导风格：{summary.dominantStyleLabel ?? '未定型'}</li>
        <li>
          风险提示：
          {summary.riskForecast ? ` ${summary.riskForecast}` : ' 当前无额外风险提示'}
        </li>
        <li>
          潜在卡点：
          {summary.stuckPoint ? ` ${summary.stuckPoint}` : ' 当前未记录明显卡点'}
        </li>
      </ul>

      {summary.rationale.length > 0 ? (
        <ul className="section-card__list">
          {summary.rationale.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}

      <SectionCard
        title="手动标签注入"
        eyebrow={`${manualSelectedTags.length} 个已选标签`}
        description="直接写入当前玩家画像标签，并在调试模式下明确标记为注入状态。"
        footer="适合快速验证难度、提示、角色反应与敌方战术是否随画像切换。"
      >
        <div className="hero-callout__actions">
          {manualTagOptions.map((option) => (
            <button
              key={option.value}
              className={buildButtonClassName(
                manualSelectedTags.includes(option.value),
              )}
              type="button"
              onClick={() => onToggleManualTag(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="hero-callout__actions">
          <button
            className="pixel-button"
            type="button"
            disabled={manualSelectedTags.length === 0 || busyActionId !== null}
            onClick={onApplyManualTags}
          >
            {busyActionId === 'player-model-manual' ? '处理中…' : '写入当前画像'}
          </button>
          <button
            className="pixel-button pixel-button--ghost"
            type="button"
            disabled={busyActionId !== null}
            onClick={onClearInjected}
          >
            {busyActionId === 'player-model-clear' ? '处理中…' : '清除调试注入'}
          </button>
        </div>
      </SectionCard>

      <div className="panel-grid panel-grid--two">
        <SectionCard
          title="行为回放生成"
          eyebrow="从预设行为重建标签"
          description="使用可重复的行为序列重建玩家画像，方便回放验证标签推导。"
          footer="回放生成会通过相同的规则与玩家画像代理模拟管线重新计算结果。"
        >
          <label className="world-creation-form__field">
            <span>回放预设</span>
            <select
              value={selectedReplayId}
              onChange={(event) => onSelectReplay(event.target.value)}
            >
              {replayOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {replayOptions
            .filter((option) => option.value === selectedReplayId)
            .map((option) => (
              <ul key={option.value} className="section-card__list">
                <li>{option.description}</li>
                <li>
                  预期标签：
                  {option.expectedTagLabels && option.expectedTagLabels.length > 0
                    ? ` ${option.expectedTagLabels.join('、')}`
                    : ' 无'}
                </li>
              </ul>
            ))}
          <div className="hero-callout__actions">
            <button
              className="pixel-button"
              type="button"
              disabled={!selectedReplayId || busyActionId !== null}
              onClick={onReplayBehavior}
            >
              {busyActionId === 'player-model-replay' ? '处理中…' : '按回放生成画像'}
            </button>
          </div>
        </SectionCard>

        <SectionCard
          title="预设场景生成"
          eyebrow="按测试场景切换画像"
          description="直接载入常见玩家风格场景，用于演示可解释的画像差异。"
          footer="适合在评审或联调时快速切换到社交、剧情、速推等典型风格。"
        >
          <label className="world-creation-form__field">
            <span>场景模板</span>
            <select
              value={selectedScenarioId}
              onChange={(event) => onSelectScenario(event.target.value)}
            >
              {scenarioOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {scenarioOptions
            .filter((option) => option.value === selectedScenarioId)
            .map((option) => (
              <ul key={option.value} className="section-card__list">
                <li>{option.description}</li>
                <li>
                  预期标签：
                  {option.expectedTagLabels && option.expectedTagLabels.length > 0
                    ? ` ${option.expectedTagLabels.join('、')}`
                    : ' 无'}
                </li>
              </ul>
            ))}
          <div className="hero-callout__actions">
            <button
              className="pixel-button"
              type="button"
              disabled={!selectedScenarioId || busyActionId !== null}
              onClick={onApplyScenario}
            >
              {busyActionId === 'player-model-scenario' ? '处理中…' : '应用场景画像'}
            </button>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="系统反应对比"
        eyebrow="当前画像 vs 候选画像"
        description="不写入状态，直接比较不同画像下的难度、提示、角色反应与敌方策略差异。"
        footer="可先在下方切换候选标签，再观察右侧预览是否符合预期。"
      >
        <div className="hero-callout__actions">
          {manualTagOptions.map((option) => (
            <button
              key={`compare:${option.value}`}
              className={buildButtonClassName(
                comparisonSelectedTags.includes(option.value),
              )}
              type="button"
              onClick={() => onToggleComparisonTag(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="world-creation-form__field">
          <span>对比角色交互意图</span>
          <select
            value={selectedComparisonNpcIntent}
            onChange={(event) =>
              onSelectComparisonNpcIntent(event.target.value as NpcDialogueIntent)
            }
          >
            {npcIntentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="panel-grid panel-grid--two">
          <SectionCard
            title="当前画像反应"
            eyebrow={currentReaction.tagLabels.join('、') || '无标签'}
            description={currentReaction.difficultySummary}
            footer={currentReaction.npcReactionSummary}
          >
            <ul className="section-card__list">
              <li>难度调整：{currentReaction.difficultyLabel}</li>
              <li>
                引导提示：
                {currentReaction.hintSummaries.length > 0
                  ? ` ${currentReaction.hintSummaries.join('；')}`
                  : ' 当前无额外提示'}
              </li>
              <li>
                敌方优先策略：
                {currentReaction.enemyPriorityLabels.length > 0
                  ? ` ${currentReaction.enemyPriorityLabels.join('、')}`
                  : ' 无明显偏向'}
              </li>
              {currentReaction.npcReasonSummary ? (
                <li>角色原因：{currentReaction.npcReasonSummary}</li>
              ) : null}
              {currentReaction.enemyReasonSummary ? (
                <li>敌方原因：{currentReaction.enemyReasonSummary}</li>
              ) : null}
            </ul>
          </SectionCard>

          <SectionCard
            title="候选画像反应"
            eyebrow={
              comparisonReaction
                ? comparisonReaction.tagLabels.join('、') || '无标签'
                : '等待选择候选标签'
            }
            description={
              comparisonReaction
                ? comparisonReaction.difficultySummary
                : '至少选择一个候选标签后，这里会显示对应的系统反应预览。'
            }
            footer={
              comparisonReaction?.npcReactionSummary ?? '当前预览不会改写真实玩家画像状态。'
            }
          >
            <ul className="section-card__list">
              {comparisonReaction ? (
                <>
                  <li>难度调整：{comparisonReaction.difficultyLabel}</li>
                  <li>
                    引导提示：
                    {comparisonReaction.hintSummaries.length > 0
                      ? ` ${comparisonReaction.hintSummaries.join('；')}`
                      : ' 当前无额外提示'}
                  </li>
                  <li>
                    敌方优先策略：
                    {comparisonReaction.enemyPriorityLabels.length > 0
                      ? ` ${comparisonReaction.enemyPriorityLabels.join('、')}`
                      : ' 无明显偏向'}
                  </li>
                  {comparisonReaction.npcReasonSummary ? (
                    <li>角色原因：{comparisonReaction.npcReasonSummary}</li>
                  ) : null}
                  {comparisonReaction.enemyReasonSummary ? (
                    <li>敌方原因：{comparisonReaction.enemyReasonSummary}</li>
                  ) : null}
                </>
              ) : (
                <li>请选择候选标签进行系统反应对比。</li>
              )}
            </ul>
          </SectionCard>
        </div>
      </SectionCard>
    </SectionCard>
  );
}
