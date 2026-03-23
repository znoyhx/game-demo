import { Link } from 'react-router-dom';

import { PageFrame } from '../../components/layout/PageFrame';
import { SectionCard } from '../../components/layout/SectionCard';
import { PixelButton } from '../../components/pixel-ui/PixelButton';
import { homeHighlights, homeRoadmap } from '../../core/mocks/shellContent';

export function HomePage() {
  return (
    <PageFrame
      title="Project Foundation"
      description="This scaffold establishes routing, layout, core boundaries, and placeholder gameplay surfaces without leaking domain logic into page components."
    >
      <section className="hero-callout">
        <p>
          PixelForge Agent starts with a competition-safe web shell: mock-first modules,
          strict boundaries, and room for the first playable slice to land cleanly.
        </p>
        <div className="hero-callout__actions">
          <Link to="/game">
            <PixelButton>Open Game Shell</PixelButton>
          </Link>
          <Link to="/debug">
            <PixelButton variant="ghost">Open Debug Route</PixelButton>
          </Link>
        </div>
      </section>
      <div className="panel-grid panel-grid--two">
        <SectionCard
          title="Current Highlights"
          eyebrow="M0"
          description="Foundation work already reflected in the scaffold."
        >
          <ul className="section-card__list">
            {homeHighlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard
          title="Immediate Roadmap"
          eyebrow="Next"
          description="Recommended follow-up sequence from the backlog."
        >
          <ul className="section-card__list">
            {homeRoadmap.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </PageFrame>
  );
}
