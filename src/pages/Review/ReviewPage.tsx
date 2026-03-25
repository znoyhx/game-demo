import { useMemo } from 'react';

import { PageFrame } from '../../components/layout/PageFrame';
import { SectionCard } from '../../components/layout/SectionCard';
import { useGameLogStore } from '../../core/logging';
import { selectCurrentReview, useGameStore } from '../../core/state';
import { locale } from '../../core/utils/locale';

const reviewText = locale.pages.review;
const logKindLabels = {
  'explanation-input': '解释输入',
  'agent-decision': '代理决策',
  'domain-event': '领域事件',
} as const;

export function ReviewPage() {
  const currentReview = useGameStore(selectCurrentReview);
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

  const combatSummary = currentReview?.combatSummary ?? null;

  return (
    <PageFrame title={reviewText.title} description={reviewText.description}>
      <div className="panel-grid panel-grid--two">
        <SectionCard
          title="战斗结论"
          eyebrow={combatSummary ? '已生成结论' : '等待战斗'}
          description={
            combatSummary
              ? combatSummary.result.summary
              : '完成一场战斗后，这里会展示结果总结、阶段变化与战术切换。'
          }
          footer="复盘结论来自结构化复盘契约，可直接用于存档恢复与调试追踪。"
        >
          <ul className="section-card__list">
            {currentReview ? (
              currentReview.keyEvents.map((event) => <li key={event}>{event}</li>)
            ) : (
              <li>当前还没有可展示的战斗复盘。</li>
            )}
          </ul>
        </SectionCard>

        <SectionCard
          title="战术切换"
          eyebrow={`${combatSummary?.tacticChanges.length ?? 0} 次切换`}
          description="展示首领在每个关键回合中的战术变化。"
          footer="用于解释首领为何从压制、陷阱、支援或反制之间切换。"
        >
          <ul className="section-card__list">
            {combatSummary && combatSummary.tacticChanges.length > 0 ? (
              combatSummary.tacticChanges.map((change) => (
                <li key={`${change.turn}:${change.toTactic}`}>{change.summary}</li>
              ))
            ) : (
              <li>本次复盘没有记录到额外的战术切换。</li>
            )}
          </ul>
        </SectionCard>

        <SectionCard
          title="阶段变化"
          eyebrow={`${combatSummary?.phaseChanges.length ?? 0} 次转阶段`}
          description="展示首领阶段转换与对应的节奏拐点。"
          footer="阶段切换通常意味着战术偏好、压制方式和风险窗口同时改变。"
        >
          <ul className="section-card__list">
            {combatSummary && combatSummary.phaseChanges.length > 0 ? (
              combatSummary.phaseChanges.map((change) => (
                <li key={`${change.turn}:${change.toPhaseId}`}>{change.summary}</li>
              ))
            ) : (
              <li>本次复盘没有记录到阶段切换。</li>
            )}
          </ul>
        </SectionCard>

        <SectionCard
          title="玩家行为"
          eyebrow={`${combatSummary?.keyPlayerBehaviors.length ?? 0} 项重点`}
          description="提炼本场战斗里最常见、最容易被针对的玩家习惯。"
          footer="这些行为会直接影响敌方战术代理的模拟提案与规则分支。"
        >
          <ul className="section-card__list">
            {combatSummary && combatSummary.keyPlayerBehaviors.length > 0 ? (
              combatSummary.keyPlayerBehaviors.map((behavior) => (
                <li key={behavior.actionType}>{behavior.summary}</li>
              ))
            ) : (
              <li>当前没有提炼到明确的玩家行为模式。</li>
            )}
          </ul>
        </SectionCard>

        <SectionCard
          title="复盘解释"
          eyebrow={`${currentReview?.explanations.length ?? 0} 条解释`}
          description="将战术变化、玩家行为和世界状态压缩为可读解释。"
          footer="解释条目会写入复盘状态，并随存档一起持久化。"
        >
          <ul className="section-card__list">
            {currentReview ? (
              currentReview.explanations.map((explanation) => (
                <li key={`${explanation.type}:${explanation.title}`}>
                  {explanation.title}：{explanation.summary}
                </li>
              ))
            ) : (
              <li>当前还没有可展示的解释条目。</li>
            )}
          </ul>
        </SectionCard>

        <SectionCard
          title="下一步建议"
          eyebrow={`${currentReview?.suggestions.length ?? 0} 条建议`}
          description="根据本场结果、阶段变化和玩家习惯给出后续行动提示。"
          footer="建议可用于演示后的引导，也可直接喂给调试流程复现。"
        >
          <ul className="section-card__list">
            {currentReview ? (
              currentReview.suggestions.map((suggestion) => (
                <li key={suggestion}>{suggestion}</li>
              ))
            ) : (
              <li>完成战斗后会在这里生成下一步建议。</li>
            )}
          </ul>
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
