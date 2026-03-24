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
  controls,
  statusMessage,
  onControlSelect,
  activeControlId,
  className,
}: DialoguePanelProps) {
  return (
    <GamePanel
      title="Dialogue Box"
      eyebrow={dialogueTitle}
      description={dialogueSpeaker}
      footer={statusMessage}
      className={className}
    >
      <div className="game-dialogue">
        {dialogueLines.map((line, index) => (
          <div key={`${line.speaker}-${index}`} className="game-dialogue__line">
            <span className="game-dialogue__speaker">{line.speaker}</span>
            <p>{line.text}</p>
          </div>
        ))}
      </div>
      <div className="game-control-row">
        <h4>Interaction Controls</h4>
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
              {activeControlId === control.id ? 'Working...' : control.label}
            </PixelButton>
          ))}
        </div>
      </div>
    </GamePanel>
  );
}
