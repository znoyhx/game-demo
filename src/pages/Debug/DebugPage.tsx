import { DebugPanel } from '../../components/debug/DebugPanel';
import { PageFrame } from '../../components/layout/PageFrame';
import { debugPanels } from '../../core/mocks/shellContent';

export function DebugPage() {
  return (
    <PageFrame
      title="Debug Route Placeholder"
      description="This route is reserved for fast-path scenario injection and inspection so future slices can be validated without long gameplay setup."
    >
      <div className="panel-grid panel-grid--two">
        {debugPanels.map((panel) => (
          <DebugPanel key={panel.title} panel={panel} />
        ))}
      </div>
    </PageFrame>
  );
}
