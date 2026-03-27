import type { ReactNode } from 'react';

import { cn } from '../../core/utils/cn';
import { PixelPanel } from '../pixel-ui/PixelPanel';

interface SectionCardProps {
  id?: string;
  title: string;
  eyebrow?: string;
  description?: string;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function SectionCard({
  id,
  title,
  eyebrow,
  description,
  footer,
  children,
  className,
}: SectionCardProps) {
  return (
    <PixelPanel
      id={id}
      title={title}
      eyebrow={eyebrow}
      description={description}
      footer={
        footer ? (
          typeof footer === 'string' ? (
            <p className="section-card__footer">{footer}</p>
          ) : (
            footer
          )
        ) : undefined
      }
      className={cn('section-card', className)}
      bodyClassName="section-card__body"
    >
      {children}
    </PixelPanel>
  );
}
