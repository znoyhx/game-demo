import type { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  eyebrow?: string;
  description?: string;
  footer?: string;
  children?: ReactNode;
}

export function SectionCard({
  title,
  eyebrow,
  description,
  footer,
  children,
}: SectionCardProps) {
  return (
    <article className="section-card">
      <header className="section-card__header">
        <h3 className="section-card__title">{title}</h3>
        {eyebrow ? <span className="badge">{eyebrow}</span> : null}
      </header>
      {description ? <p className="section-card__description">{description}</p> : null}
      {children}
      {footer ? <p className="section-card__footer">{footer}</p> : null}
    </article>
  );
}
