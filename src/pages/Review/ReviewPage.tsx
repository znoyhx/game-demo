import { PageFrame } from '../../components/layout/PageFrame';
import { ReviewPanel } from '../../components/review/ReviewPanel';
import { reviewPanels } from '../../core/mocks/shellContent';

export function ReviewPage() {
  return (
    <PageFrame
      title="Review Route Placeholder"
      description="The review route is ready to receive combat summaries, tactic explanations, quest branch rationale, and player-model output once those modules arrive."
    >
      <div className="panel-grid panel-grid--two">
        {reviewPanels.map((panel) => (
          <ReviewPanel key={panel.title} panel={panel} />
        ))}
      </div>
    </PageFrame>
  );
}
