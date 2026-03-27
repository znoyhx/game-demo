import { useMemo } from 'react';

import { PageFrame } from '../../components/layout/PageFrame';
import { SectionCard } from '../../components/layout/SectionCard';
import { Badge } from '../../components/pixel-ui/Badge';
import { PixelTabs } from '../../components/pixel-ui/PixelTabs';
import { StatusChip } from '../../components/pixel-ui/StatusChip';
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
    : '暂无';
  const triggerLabel = currentReview
    ? triggerLabels[currentReview.trigger]
    : triggerLabels.manual;
  const reviewSections = [
    { id: 'summary', label: '本次摘要', href: '#review-summary', isActive: true },
    { id: 'explain', label: '关键脉络', href: '#review-explanation' },
    { id: 'player', label: '玩家画像', href: '#review-player' },
    { id: 'diagnostics', label: '诊断记录', href: '#review-diagnostics' },
  ];

  return (
    <PageFrame
      eyebrow={reviewText.summaryTitle}
      title={reviewText.title}
      description={reviewText.description}
      className="page-frame--review"
      navigation={<PixelTabs items={reviewSections} label="回顾页面分区" />}
      actions={
        <StatusChip
          label="触发"
          value={reviewText.triggerBadge(triggerLabel)}
          tone={currentReview ? 'info' : 'default'}
        />
      }
    >
      <section className="review-hero">
        <SectionCard
          id="review-summary"
          title={reviewText.summaryTitle}
          eyebrow={currentReview ? '已生成回顾' : '等待回顾'}
          description={
            currentReview?.combatSummary?.result.summary ??
            currentReview?.knowledgeSummary?.summary ??
            reviewText.summaryEmpty
          }
          footer={reviewText.sections.keyEvents.footer}
          className="section-card--highlight"
        >
          <ul className="section-card__list">
            {renderList(currentReview?.keyEvents ?? [], reviewText.sections.keyEvents.empty)}
          </ul>
        </SectionCard>

        <SectionCard
          title={reviewText.suggestionsTitle}
          eyebrow={`${nextStepSuggestions.length} 条建议`}
          description={reviewText.suggestionsDescription}
          footer={reviewText.sections.suggestions.footer}
          className="section-card--review"
        >
          <ul className="section-card__list">
            {renderList(nextStepSuggestions, reviewText.sections.suggestions.empty)}
          </ul>
        </SectionCard>
      </section>

      <div className="panel-grid panel-grid--two panel-grid--review">
        <SectionCard
          id="review-explanation"
          title={reviewText.explanationCardTitle}
          eyebrow={reviewText.sections.keyEvents.title}
          description={reviewText.explanationCardDescription}
          className="section-card--wide section-card--review"
        >
          <div className="review-section-group">
            <h4 className="review-section-group__title">{reviewText.sections.questBranch.title}</h4>
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
          </div>

          <div className="review-section-group">
            <h4 className="review-section-group__title">{reviewText.sections.npcAttitude.title}</h4>
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
          </div>

          <div className="review-section-group">
            <h4 className="review-section-group__title">{reviewText.sections.tactic.title}</h4>
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
          </div>

          <div className="review-section-group">
            <h4 className="review-section-group__title">{reviewText.sections.factors.title}</h4>
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
          </div>
        </SectionCard>

        <SectionCard
          id="review-player"
          title={reviewText.sections.playerModel.title}
          eyebrow={`当前主导：${dominantStyleLabel}`}
          description="把当前玩家偏好、风险提示与卡点浓缩成现场可讲解的画像摘要。"
          footer="用于说明玩家模型为何这样判断，并帮助下一轮演示更快进入重点。"
          className="section-card--review"
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
            <li>风险提醒：{playerModelSnapshot.riskForecast ?? '暂无明显风险提示'}</li>
            <li>当前卡点：{playerModelSnapshot.stuckPoint ?? '暂无显著卡点'}</li>
          </ul>
          <ul className="section-card__list">
            {renderList(playerModelSnapshot.rationale, reviewText.sections.playerModel.empty)}
          </ul>
        </SectionCard>

        <SectionCard
          id="review-diagnostics"
          title={reviewText.diagnosticsTitle}
          eyebrow={reviewText.telemetry.eyebrow(reviewLogs.length)}
          description={reviewText.diagnosticsDescription}
          footer={reviewText.telemetry.footer}
          className="section-card--review"
        >
          <div className="review-section-group">
            <h4 className="review-section-group__title">{reviewText.telemetry.title}</h4>
            <ul className="section-card__list">
              {reviewLogs.length === 0 ? (
                <li>{reviewText.telemetry.emptyState}</li>
              ) : (
                reviewLogs.map((entry) => (
                  <li key={entry.id}>
                    [{logKindLabels[entry.kind as keyof typeof logKindLabels] ?? entry.kind}]{' '}
                    {entry.summary}
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="review-section-group">
            <h4 className="review-section-group__title">{reviewText.sections.knowledge.title}</h4>
            <p className="section-card__description">
              {currentReview?.knowledgeSummary?.summary ?? '教育模式可以在这里继续生成知识点、讲解提示和追问建议。'}
            </p>
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
          </div>
        </SectionCard>
      </div>
    </PageFrame>
  );
}
