import { PageFrame } from '../../components/layout/PageFrame';
import { SectionCard } from '../../components/layout/SectionCard';
import { ReviewPanel } from '../../components/review/ReviewPanel';
import { useGameLogStore } from '../../core/logging';
import { reviewPanels } from '../../core/mocks/shellContent';

export function ReviewPage() {
  const reviewLogs = useGameLogStore((state) =>
    state.entries
      .filter(
        (entry) =>
          entry.kind === 'explanation-input' ||
          entry.kind === 'agent-decision' ||
          (entry.kind === 'domain-event' && entry.eventName === 'REVIEW_GENERATED'),
      )
      .slice(0, 6),
  );

  return (
    <PageFrame
      title="Review Route Placeholder"
      description="The review route is ready to receive combat summaries, tactic explanations, quest branch rationale, and player-model output once those modules arrive."
    >
      <div className="panel-grid panel-grid--two">
        {reviewPanels.map((panel) => (
          <ReviewPanel key={panel.title} panel={panel} />
        ))}
        <SectionCard
          title="Review Telemetry"
          eyebrow={`${reviewLogs.length} entries`}
          description="Explanation payload inputs and agent decisions are available to the review surface."
          footer="Review-related telemetry is filtered from the shared typed log store."
        >
          <ul className="section-card__list">
            {reviewLogs.length === 0 ? (
              <li>No review telemetry recorded yet.</li>
            ) : (
              reviewLogs.map((entry) => (
                <li key={entry.id}>
                  [{entry.kind}] {entry.summary}
                </li>
              ))
            )}
          </ul>
        </SectionCard>
      </div>
    </PageFrame>
  );
}
