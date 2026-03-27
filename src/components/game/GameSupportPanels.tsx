import { cn } from '../../core/utils/cn';
import { uiToneLabels } from '../../core/utils/displayLabels';
import { PixelLogFeed } from '../pixel-ui/PixelLogFeed';
import { StatusChip } from '../pixel-ui/StatusChip';
import { GamePanel } from './GamePanel';

interface LogEntryViewModel {
  id: string;
  label: string;
  detail: string;
  meta: string;
  tone: 'default' | 'success' | 'warning' | 'info';
  emphasis: 'default' | 'recent' | 'highlight';
}

interface TipViewModel {
  id: string;
  title: string;
  summary: string;
  tone: 'default' | 'success' | 'warning' | 'info';
}

interface GameSupportPanelsProps {
  logs: LogEntryViewModel[];
  tips: TipViewModel[];
  className?: string;
}

export function GameSupportPanels({
  logs,
  tips,
  className,
}: GameSupportPanelsProps) {
  return (
    <div className={cn('game-layout__support', className)}>
      <GamePanel title="日志" eyebrow="行动流" description="展示最新的运行与交互事件。">
        <PixelLogFeed entries={logs} />
      </GamePanel>
      <GamePanel
        title="可解释提示"
        eyebrow="代理备注"
        description="让智能决策在现场演示中也能一眼看懂。"
      >
        <div className="game-list">
          {tips.map((tip) => (
            <article key={tip.id} className="game-list__card ui-list-card ui-list-card--review">
              <div className="game-list__card-header ui-list-card__header">
                <strong>{tip.title}</strong>
                <StatusChip label="提示" value={uiToneLabels[tip.tone]} tone={tip.tone} />
              </div>
              <p>{tip.summary}</p>
            </article>
          ))}
        </div>
      </GamePanel>
    </div>
  );
}
