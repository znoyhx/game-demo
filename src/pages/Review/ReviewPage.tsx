import { PageFrame } from '../../components/layout/PageFrame';
import { SectionCard } from '../../components/layout/SectionCard';
import { ReviewPanel } from '../../components/review/ReviewPanel';
import { useGameLogStore } from '../../core/logging';
import { reviewPanels } from '../../core/mocks/shellContent';
import { locale } from '../../core/utils/locale';

const reviewText = locale.pages.review;

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
    <PageFrame title={reviewText.title} description={reviewText.description}>
      <div className="panel-grid panel-grid--two">
        {reviewPanels.map((panel) => (
          <ReviewPanel key={panel.title} panel={panel} />
        ))}
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
