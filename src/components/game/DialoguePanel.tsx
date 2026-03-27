import { cn } from '../../core/utils/cn';
import { PixelButton } from '../pixel-ui/PixelButton';
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

interface DialoguePanelProps {
  dialogueTitle: string;
  dialogueSpeaker: string;
  dialogueLines: DialogueLine[];
  attitudeSummary?: Array<{ label: string; value: string }>;
  controls: ControlButton[];
  statusMessage: string;
  onControlSelect: (controlId: string) => void;
  activeControlId?: string | null;
  className?: string;
}

export function DialoguePanel({
  dialogueTitle,
  dialogueSpeaker,
  dialogueLines,
  attitudeSummary,
  controls,
  statusMessage,
  onControlSelect,
  activeControlId,
  className,
}: DialoguePanelProps) {
  return (
    <section id="game-dialogue">
      <GamePanel
        title="对话与指令"
        eyebrow={dialogueTitle}
        description={dialogueSpeaker}
        footer={statusMessage}
        className={cn('dialogue-panel', className)}
      >
        {attitudeSummary && attitudeSummary.length > 0 ? (
          <dl className="game-dialogue__attitude">
            {attitudeSummary.map((item) => (
              <div key={item.label} className="game-dialogue__attitude-item">
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="game-dialogue">
          {dialogueLines.map((line, index) => (
            <div key={`${line.speaker}-${index}`} className="game-dialogue__line">
              <span className="game-dialogue__speaker">{line.speaker}</span>
              <p>{line.text}</p>
            </div>
          ))}
        </div>

        <div className="game-control-row">
          <h4>交互控制</h4>
          <div className="game-control-row__buttons">
            {controls.map((control) => (
              <PixelButton
                key={control.id}
                variant={control.tone === 'default' ? 'ghost' : 'solid'}
                tone={control.tone}
                isActive={activeControlId === control.id}
                onClick={() => onControlSelect(control.id)}
                disabled={control.disabled || activeControlId === control.id}
              >
                {activeControlId === control.id ? '处理中…' : control.label}
              </PixelButton>
            ))}
          </div>
        </div>
      </GamePanel>
    </section>
  );
}
