import { SectionCard } from '../../components/layout/SectionCard';
import { DebugPanel } from '../../components/debug/DebugPanel';
import { PageFrame } from '../../components/layout/PageFrame';
import { useGameLogStore } from '../../core/logging';
import { debugPanels } from '../../core/mocks/shellContent';

export function DebugPage() {
  const logs = useGameLogStore((state) => state.entries.slice(0, 8));

  return (
    <PageFrame
      title="Debug Route Placeholder"
      description="This route is reserved for fast-path scenario injection and inspection so future slices can be validated without long gameplay setup."
    >
      <div className="panel-grid panel-grid--two">
        {debugPanels.map((panel) => (
          <DebugPanel key={panel.title} panel={panel} />
        ))}
        <SectionCard
          title="Runtime Logs"
          eyebrow={`${logs.length} entries`}
          description="Typed runtime logs are available here for debug inspection."
          footer="This feed is sourced from the lightweight log store, not ad hoc console output."
        >
          <ul className="section-card__list">
            {logs.length === 0 ? (
              <li>No logs recorded yet.</li>
            ) : (
              logs.map((entry) => (
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
