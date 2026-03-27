import type { ReactNode } from 'react';

import { cn } from '../../core/utils/cn';

interface PageFrameProps {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  navigation?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function PageFrame({
  eyebrow,
  title,
  description,
  actions,
  navigation,
  children,
  className,
  bodyClassName,
}: PageFrameProps) {
  return (
    <section className={cn('page-frame', className)}>
      <header className="page-frame__header">
        <div className="page-frame__title-group">
          {eyebrow ? <span className="page-frame__eyebrow">{eyebrow}</span> : null}
          <h2 className="page-frame__title">{title}</h2>
          <p className="page-frame__description">{description}</p>
        </div>
        {actions ? <div className="page-frame__actions">{actions}</div> : null}
      </header>
      {navigation ? <div className="page-frame__navigation">{navigation}</div> : null}
      <div className={cn('page-frame__body', bodyClassName)}>{children}</div>
    </section>
  );
}
