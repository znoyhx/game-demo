import { Badge } from '../pixel-ui/Badge';
import { StatusChip } from '../pixel-ui/StatusChip';
import { uiToneLabels } from '../../core/utils/displayLabels';
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
  emotionalState: string;
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
    <aside className="game-sidebar game-sidebar--right" id="game-status">
      <QuestTrackerPanel quests={quests} />
      <GamePanel
        title="玩家状态"
        eyebrow="即时状态"
        description="展示生命、能量、资源与随行物资，并保留当前玩法倾向标签。"
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
            <StatusChip key={tag} label="倾向" value={tag} tone="success" />
          ))}
        </div>
        <div className="game-simple-list">
          {inventory.map((item) => (
            <div key={item.id} className="game-simple-list__item">
              <span>{item.label}</span>
              <strong>×{item.quantity}</strong>
            </div>
          ))}
        </div>
      </GamePanel>
      <GamePanel
        title="关系与敌情"
        eyebrow="角色立场 / 威胁流"
        description="把角色关系变化与当前敌情提醒放到同一阅读区，减少视线往返。"
      >
        <div className="game-list">
          {enemyAlerts.map((alert) => (
            <article key={alert.id} className="game-list__card ui-list-card ui-list-card--review">
              <div className="game-list__card-header ui-list-card__header">
                <strong>{alert.label}</strong>
                <Badge tone={alert.tone}>{uiToneLabels[alert.tone]}</Badge>
              </div>
              <p>{alert.detail}</p>
            </article>
          ))}
        </div>
        <div className="game-simple-list">
          {relationships.map((relationship) => (
            <div key={relationship.id} className="game-relationship-row ui-list-card ui-list-card--npc">
              <div>
                <strong>{relationship.name}</strong>
                <span>
                  {relationship.disposition} · {relationship.emotionalState}
                </span>
              </div>
              <div>
                <span>信任 {relationship.trust}</span>
                <strong>关系 {relationship.relationship}</strong>
              </div>
            </div>
          ))}
        </div>
      </GamePanel>
    </aside>
  );
}
