import { useMemo } from 'react';

import { PageFrame } from '../../components/layout/PageFrame';
import { SectionCard } from '../../components/layout/SectionCard';
import { Badge } from '../../components/pixel-ui/Badge';
import { useGameLogStore } from '../../core/logging';
import { selectCurrentReview, selectPlayerModelState, useGameStore } from '../../core/state';
import { formatPlayerTagLabel } from '../../core/utils/displayLabels';
import { locale } from '../../core/utils/locale';

const reviewText = locale.pages.review;
const logKindLabels = {
  'explanation-input': '解释输入',
  'agent-decision': '代理决策',
  'domain-event': '领域事件',
} as const;

const triggerLabels = locale.controllers.reviewGeneration.triggers;

const renderList = (items: string[], emptyState: string) =>
  items.length > 0 ? (
    items.map((item) => <li key={item}>{item}</li>)
  ) : (
    <li>{emptyState}</li>
  );

export function ReviewPage() {
  const currentReview = useGameStore(selectCurrentReview);
  const playerModel = useGameStore(selectPlayerModelState);
  const logEntries = useGameLogStore((state) => state.entries);
  const reviewLogs = useMemo(
    () =>
      logEntries
        .filter(
          (entry) =>
            entry.kind === 'explanation-input' ||
            entry.kind === 'agent-decision' ||
            (entry.kind === 'domain-event' && entry.eventName === 'REVIEW_GENERATED'),
        )
        .slice(0, 6),
    [logEntries],
  );

  const playerModelSnapshot = currentReview?.playerModelSnapshot ?? {
    tags: playerModel.tags,
    dominantStyle: playerModel.dominantStyle,
    rationale: playerModel.rationale,
    riskForecast: playerModel.riskForecast,
    stuckPoint: playerModel.stuckPoint,
    debugProfile: playerModel.debugProfile,
  };
  const nextStepSuggestions =
    currentReview?.nextStepSuggestions.length
      ? currentReview.nextStepSuggestions
      : (currentReview?.suggestions ?? []);
  const playerTagLabels = playerModelSnapshot.tags.map(formatPlayerTagLabel);
  const dominantStyleLabel = playerModelSnapshot.dominantStyle
    ? formatPlayerTagLabel(playerModelSnapshot.dominantStyle)
    : '未定型';
  const triggerLabel = currentReview
    ? triggerLabels[currentReview.trigger]
    : triggerLabels.manual;

  return (
    <PageFrame title={reviewText.title} description={reviewText.description}>
      <div className="panel-grid panel-grid--two">
        <SectionCard
          title={reviewText.sections.keyEvents.title}
          eyebrow={currentReview ? '已生成回顾' : '等待回顾'}
          description={
            currentReview?.combatSummary?.result.summary ??
            currentReview?.knowledgeSummary?.summary ??
            '当战斗、任务分支、关键角色互动或整轮流程结束后，这里会汇总最重要的解释节点。'
          }
          footer={reviewText.sections.keyEvents.footer}
        >
          <div className="hero-callout__actions">
            <Badge tone={currentReview ? 'info' : 'default'}>
              {reviewText.triggerBadge(triggerLabel)}
            </Badge>
          </div>
          <ul className="section-card__list">
            {renderList(currentReview?.keyEvents ?? [], reviewText.sections.keyEvents.empty)}
          </ul>
        </SectionCard>

        <SectionCard
          title={reviewText.sections.playerModel.title}
          eyebrow={`当前主导：${dominantStyleLabel}`}
          description="当前回顾会固定展示触发时刻的玩家画像快照，方便独立验证提示、敌方策略与任务反馈是否合理。"
          footer="若画像来自调试注入，也会保留注入标记，避免与自然推导结果混淆。"
        >
          <div className="hero-callout__actions">
            {playerModelSnapshot.debugProfile ? (
              <Badge tone="warning">{reviewText.sections.playerModel.debugBadge}</Badge>
            ) : (
              <Badge tone="info">{reviewText.sections.playerModel.naturalBadge}</Badge>
            )}
          </div>
          <ul className="section-card__list">
            <li>当前标签：{playerTagLabels.length > 0 ? playerTagLabels.join('、') : '无'}</li>
            <li>主导风格：{dominantStyleLabel}</li>
            <li>风险提示：{playerModelSnapshot.riskForecast ?? '当前无额外风险提示'}</li>
            <li>潜在卡点：{playerModelSnapshot.stuckPoint ?? '当前未记录明显卡点'}</li>
          </ul>
          <ul className="section-card__list">
            {renderList(
              playerModelSnapshot.rationale,
              reviewText.sections.playerModel.empty,
            )}
          </ul>
        </SectionCard>

        <SectionCard
          title={reviewText.sections.questBranch.title}
          eyebrow={`${currentReview?.questBranchReasons.length ?? 0} 条变化`}
          description="展示关键任务分支为什么进入当前走向，以及后续会如何影响路线、关系与世界状态。"
          footer={reviewText.sections.questBranch.footer}
        >
          <ul className="section-card__list">
            {currentReview && currentReview.questBranchReasons.length > 0
              ? currentReview.questBranchReasons.map((item) => (
                  <li key={`${item.questId}:${item.branchId ?? item.status}`}>
                    {item.summary}
                    {item.reasons.length > 0 ? `（${item.reasons.join('；')}）` : ''}
                  </li>
                ))
              : renderList([], reviewText.sections.questBranch.empty)}
          </ul>
        </SectionCard>

        <SectionCard
          title={reviewText.sections.npcAttitude.title}
          eyebrow={`${currentReview?.npcAttitudeReasons.length ?? 0} 条变化`}
          description="展示关键角色的态度、情绪、信任和关系如何变化，以及这些变化背后的主要原因。"
          footer={reviewText.sections.npcAttitude.footer}
        >
          <ul className="section-card__list">
            {currentReview && currentReview.npcAttitudeReasons.length > 0
              ? currentReview.npcAttitudeReasons.map((item) => (
                  <li key={item.npcId}>
                    {item.npcName}：{item.summary}
                    {item.reasons.length > 0 ? `（${item.reasons.join('；')}）` : ''}
                  </li>
                ))
              : renderList([], reviewText.sections.npcAttitude.empty)}
          </ul>
        </SectionCard>

        <SectionCard
          title={reviewText.sections.tactic.title}
          eyebrow={`${currentReview?.enemyTacticReasons.length ?? 0} 条原因`}
          description="如果本轮包含战斗，这里会把敌方策略切换与阶段、玩家行为、玩家画像之间的关系拆开说明。"
          footer={reviewText.sections.tactic.footer}
        >
          <ul className="section-card__list">
            {currentReview && currentReview.enemyTacticReasons.length > 0
              ? currentReview.enemyTacticReasons.map((item) => (
                  <li key={`${item.turn}:${item.toTactic}:${item.phaseId ?? 'none'}`}>
                    {item.summary}
                    {item.reasons.length > 1 ? `（${item.reasons.slice(1).join('；')}）` : ''}
                  </li>
                ))
              : renderList([], reviewText.sections.tactic.empty)}
          </ul>
        </SectionCard>

        <SectionCard
          title={reviewText.sections.factors.title}
          eyebrow={`${currentReview?.outcomeFactors.length ?? 0} 条要点`}
          description="将关键成功、失败、风险与机会因素压缩成评审和调试都能快速阅读的结构化结论。"
          footer={reviewText.sections.factors.footer}
        >
          <ul className="section-card__list">
            {currentReview && currentReview.outcomeFactors.length > 0
              ? currentReview.outcomeFactors.map((item) => (
                  <li key={`${item.kind}:${item.title}`}>
                    {item.title}：{item.summary}
                    {item.evidence.length > 0 ? `（${item.evidence.join('；')}）` : ''}
                  </li>
                ))
              : renderList([], reviewText.sections.factors.empty)}
          </ul>
        </SectionCard>

        <SectionCard
          title={reviewText.sections.suggestions.title}
          eyebrow={`${nextStepSuggestions.length} 条建议`}
          description="建议会保持可执行、可测试和可演示三项特征，方便直接衔接下一轮游玩或调试。"
          footer={reviewText.sections.suggestions.footer}
        >
          <ul className="section-card__list">
            {renderList(nextStepSuggestions, reviewText.sections.suggestions.empty)}
          </ul>
        </SectionCard>

        <SectionCard
          title={reviewText.sections.knowledge.title}
          eyebrow={
            currentReview?.knowledgeSummary ? '已准备扩展点' : '等待知识摘要'
          }
          description={
            currentReview?.knowledgeSummary?.summary ??
            '教育模式可以在这里继续生成知识点、讲解提示和追问建议。'
          }
          footer={reviewText.sections.knowledge.footer}
        >
          <ul className="section-card__list">
            {renderList(
              currentReview?.knowledgeSummary?.keyPoints ?? [],
              reviewText.sections.knowledge.empty,
            )}
          </ul>
          {currentReview?.knowledgeSummary?.suggestedPrompt ? (
            <ul className="section-card__list">
              <li>推荐追问：{currentReview.knowledgeSummary.suggestedPrompt}</li>
            </ul>
          ) : null}
        </SectionCard>

        <SectionCard
          title={reviewText.telemetry.title}
          eyebrow={reviewText.telemetry.eyebrow(reviewLogs.length)}
          description={reviewText.telemetry.description}
          footer={reviewText.telemetry.footer}
        >
          <ul className="section-card__list">
            {reviewLogs.length === 0 ? (
              <li>{reviewText.telemetry.emptyState}</li>
            ) : (
              reviewLogs.map((entry) => (
                <li key={entry.id}>
                  [{logKindLabels[entry.kind as keyof typeof logKindLabels] ?? entry.kind}] {entry.summary}
                </li>
              ))
            )}
          </ul>
        </SectionCard>
      </div>
    </PageFrame>
  );
}
