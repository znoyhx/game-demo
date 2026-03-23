import { CombatPanel } from '../../components/combat/CombatPanel';
import { PageFrame } from '../../components/layout/PageFrame';
import { MapViewport } from '../../components/map/MapViewport';
import { NpcPanel } from '../../components/npc/NpcPanel';
import { QuestPanel } from '../../components/quest/QuestPanel';
import { gamePanels } from '../../core/mocks/shellContent';

export function GamePage() {
  return (
    <PageFrame
      title="Game Route Placeholder"
      description="The gameplay route already reserves visual space for map rendering, NPC interaction, quest progress, and combat without embedding domain state transitions here."
    >
      <div className="panel-grid panel-grid--two">
        <MapViewport panel={gamePanels.map} />
        <NpcPanel panel={gamePanels.npc} />
        <QuestPanel panel={gamePanels.quest} />
        <CombatPanel panel={gamePanels.combat} />
      </div>
    </PageFrame>
  );
}
