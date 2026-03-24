import { Badge } from '../pixel-ui/Badge';
import { PixelLogFeed } from '../pixel-ui/PixelLogFeed';
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
        controls={controls}
        statusMessage={statusMessage}
        onControlSelect={onControlSelect}
        activeControlId={activeControlId}
      />
      <GamePanel
        title="Logs"
        eyebrow="Action Feed"
        description="Latest runtime and interaction events."
      >
        <PixelLogFeed entries={logs} />
      </GamePanel>
      <GamePanel
        title="Explainability Tips"
        eyebrow="Agent Notes"
        description="Make AI decisions legible during live presentation."
      >
        <div className="game-list">
          {tips.map((tip) => (
            <article key={tip.id} className="game-list__card">
              <div className="game-list__card-header">
                <strong>{tip.title}</strong>
                <Badge tone={tip.tone}>{tip.tone}</Badge>
              </div>
              <p>{tip.summary}</p>
            </article>
          ))}
        </div>
      </GamePanel>
    </section>
  );
}
