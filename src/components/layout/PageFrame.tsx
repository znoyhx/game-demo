import type { ReactNode } from 'react';

interface PageFrameProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function PageFrame({ title, description, children }: PageFrameProps) {
  return (
    <section className="page-frame">
      <header className="page-frame__header">
        <h2 className="page-frame__title">{title}</h2>
        <p className="page-frame__description">{description}</p>
      </header>
      <div className="page-frame__body">{children}</div>
    </section>
  );
}
