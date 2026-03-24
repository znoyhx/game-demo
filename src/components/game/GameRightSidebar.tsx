import { Badge } from '../pixel-ui/Badge';
import { QuestTrackerPanel } from '../quest/QuestTrackerPanel';
import { GamePanel } from './GamePanel';

interface QuestViewModel {
  id: string;
  title: string;
  status: string;
  objective: string;
  progress: string;
}

interface InventoryItemViewModel {
  id: string;
  label: string;
  quantity: number;
}

interface RelationshipViewModel {
  id: string;
  name: string;
  trust: number;
  relationship: number;
  disposition: string;
}

interface EnemyAlertViewModel {
  id: string;
  label: string;
  detail: string;
  tone: 'default' | 'success' | 'warning' | 'info';
}

interface GameRightSidebarProps {
  quests: QuestViewModel[];
  inventory: InventoryItemViewModel[];
  playerStatus: Array<{ label: string; value: string }>;
  playerTags: string[];
  relationships: RelationshipViewModel[];
  enemyAlerts: EnemyAlertViewModel[];
}

export function GameRightSidebar({
  quests,
  inventory,
  playerStatus,
  playerTags,
  relationships,
  enemyAlerts,
}: GameRightSidebarProps) {
  return (
    <aside className="game-sidebar game-sidebar--right">
      <QuestTrackerPanel quests={quests} />
      <GamePanel
        title="Inventory"
        eyebrow="Pack"
        description="Compact item readout for demo clarity."
      >
        <div className="game-simple-list">
          {inventory.map((item) => (
            <div key={item.id} className="game-simple-list__item">
              <span>{item.label}</span>
              <strong>x{item.quantity}</strong>
            </div>
          ))}
        </div>
      </GamePanel>
      <GamePanel
        title="Player Status"
        eyebrow="Vitals"
        description="Health, energy, resources, and current playstyle tags."
      >
        <dl className="game-stat-list">
          {playerStatus.map((stat) => (
            <div key={stat.label} className="game-stat-list__item">
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
        <div className="game-tag-row">
          {playerTags.map((tag) => (
            <Badge key={tag} tone="success">
              {tag}
            </Badge>
          ))}
        </div>
      </GamePanel>
      <GamePanel
        title="Relationship Indicators"
        eyebrow="NPC Standing"
        description="Quick trust and relationship readout for the strongest signals."
      >
        <div className="game-simple-list">
          {relationships.map((relationship) => (
            <div key={relationship.id} className="game-relationship-row">
              <div>
                <strong>{relationship.name}</strong>
                <span>{relationship.disposition}</span>
              </div>
              <div>
                <span>Trust {relationship.trust}</span>
                <strong>Rel {relationship.relationship}</strong>
              </div>
            </div>
          ))}
        </div>
      </GamePanel>
      <GamePanel
        title="Enemy Alerts"
        eyebrow="Threat Feed"
        description="Combat pressure, boss presence, and dynamic world warnings."
      >
        <div className="game-list">
          {enemyAlerts.map((alert) => (
            <article key={alert.id} className="game-list__card">
              <div className="game-list__card-header">
                <strong>{alert.label}</strong>
                <Badge tone={alert.tone}>{alert.tone}</Badge>
              </div>
              <p>{alert.detail}</p>
            </article>
          ))}
        </div>
      </GamePanel>
    </aside>
  );
}
