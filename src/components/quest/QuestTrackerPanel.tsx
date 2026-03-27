import { GamePanel } from '../game/GamePanel';
import { StatusChip } from '../pixel-ui/StatusChip';

interface QuestViewModel {
  id: string;
  title: string;
  status: string;
  objective: string;
  progress: string;
}

interface QuestTrackerPanelProps {
  quests: QuestViewModel[];
  className?: string;
}

export function QuestTrackerPanel({
  quests,
  className,
}: QuestTrackerPanelProps) {
  return (
    <GamePanel
      title="进行中的任务"
      eyebrow="任务追踪"
      description="展示当前主线与支线推进，以及清楚可见的目标状态。"
      className={className}
    >
      <div className="game-list">
        {quests.map((quest) => (
          <article key={quest.id} className="game-list__card ui-list-card ui-list-card--quest">
            <div className="game-list__card-header ui-list-card__header">
              <strong>{quest.title}</strong>
              <StatusChip label="阶段" value={quest.status} tone="info" />
            </div>
            <p>{quest.objective}</p>
            <span className="ui-list-card__meta">{quest.progress}</span>
          </article>
        ))}
      </div>
    </GamePanel>
  );
}
