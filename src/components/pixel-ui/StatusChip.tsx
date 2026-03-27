import { cn } from '../../core/utils/cn';
import type { PixelTone } from './pixelTone';

interface StatusChipProps {
  label: string;
  value: string;
  tone?: PixelTone;
  className?: string;
}

export function StatusChip({
  label,
  value,
  tone = 'default',
  className,
}: StatusChipProps) {
  return (
    <span
      className={cn(
        'status-chip',
        tone === 'success' && 'status-chip--success',
        tone === 'warning' && 'status-chip--warning',
        tone === 'info' && 'status-chip--info',
        tone === 'danger' && 'status-chip--danger',
        className,
      )}
    >
      <span className="status-chip__label">{label}</span>
      <strong className="status-chip__value">{value}</strong>
    </span>
  );
}
