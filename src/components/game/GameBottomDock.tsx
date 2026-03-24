import { Badge } from '../pixel-ui/Badge';
import { PixelLogFeed } from '../pixel-ui/PixelLogFeed';
import { uiToneLabels } from '../../core/utils/displayLabels';
import { DialoguePanel } from './DialoguePanel';
import { GamePanel } from './GamePanel';

interface DialogueLine {
  speaker: string;
  text: string;
}

interface ControlButton {
  id: string;
  label: string;
  tone?: 'default' | 'success' | 'warning' | 'info';
  disabled?: boolean;
}

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

interface GameBottomDockProps {
  dialogueTitle: string;
  dialogueSpeaker: string;
  dialogueLines: DialogueLine[];
  attitudeSummary?: Array<{ label: string; value: string }>;
  controls: ControlButton[];
  logs: LogEntryViewModel[];
  tips: TipViewModel[];
  statusMessage: string;
  onControlSelect: (controlId: string) => void;
  activeControlId?: string | null;
}

export function GameBottomDock({
  dialogueTitle,
  dialogueSpeaker,
  dialogueLines,
  attitudeSummary,
  controls,
  logs,
  tips,
  statusMessage,
  onControlSelect,
  activeControlId,
}: GameBottomDockProps) {
  return (
    <section className="game-bottom-dock">
      <DialoguePanel
        dialogueTitle={dialogueTitle}
        dialogueSpeaker={dialogueSpeaker}
        dialogueLines={dialogueLines}
        attitudeSummary={attitudeSummary}
        controls={controls}
        statusMessage={statusMessage}
        onControlSelect={onControlSelect}
        activeControlId={activeControlId}
      />
      <GamePanel
        title="日志"
        eyebrow="行动流"
        description="展示最新的运行与交互事件。"
      >
        <PixelLogFeed entries={logs} />
      </GamePanel>
      <GamePanel
        title="可解释提示"
        eyebrow="代理备注"
        description="让智能决策在现场演示中也能一眼看懂。"
      >
        <div className="game-list">
          {tips.map((tip) => (
            <article key={tip.id} className="game-list__card">
              <div className="game-list__card-header">
                <strong>{tip.title}</strong>
                <Badge tone={tip.tone}>{uiToneLabels[tip.tone]}</Badge>
              </div>
              <p>{tip.summary}</p>
            </article>
          ))}
        </div>
      </GamePanel>
    </section>
  );
}
