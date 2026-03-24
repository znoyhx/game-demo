import { cn } from '../../core/utils/cn';
import { PixelBadge } from './PixelBadge';
import type { PixelTone } from './pixelTone';

export interface PixelLogEntry {
  id: string;
  label: string;
  detail: string;
  meta?: string;
  tone?: PixelTone;
  emphasis?: 'default' | 'recent' | 'highlight';
}

interface PixelLogFeedProps {
  entries: PixelLogEntry[];
  className?: string;
  emptyMessage?: string;
}

export function PixelLogFeed({
  entries,
  className,
  emptyMessage = '暂时还没有日志记录。',
}: PixelLogFeedProps) {
  if (entries.length === 0) {
    return <p className={cn('pixel-log-feed__empty', className)}>{emptyMessage}</p>;
  }

  return (
    <div className={cn('pixel-log-feed', className)}>
      {entries.map((entry, index) => (
        <article
          key={entry.id}
          className={cn(
            'pixel-log-feed__item',
            entry.emphasis === 'recent' && 'pixel-log-feed__item--recent',
            entry.emphasis === 'highlight' && 'pixel-log-feed__item--highlight',
            index === 0 && 'pixel-log-feed__item--top',
          )}
        >
          <div className="pixel-log-feed__header">
            <strong>{entry.label}</strong>
            {entry.meta ? (
              <PixelBadge tone={entry.tone ?? 'info'}>{entry.meta}</PixelBadge>
            ) : null}
          </div>
          <p>{entry.detail}</p>
        </article>
      ))}
    </div>
  );
}
