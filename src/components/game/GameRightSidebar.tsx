import { Badge } from '../pixel-ui/Badge';
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
    <aside className="game-sidebar game-sidebar--right">
      <QuestTrackerPanel quests={quests} />
      <GamePanel
        title="背包"
        eyebrow="随行包裹"
        description="用紧凑视图展示物品，方便演示时快速读取。"
      >
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
        title="玩家状态"
        eyebrow="即时状态"
        description="展示生命、精力、资源以及当前玩法倾向标签。"
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
        title="关系指示"
        eyebrow="角色立场"
        description="快速读取最关键的信任与关系变化。"
      >
        <div className="game-simple-list">
          {relationships.map((relationship) => (
            <div key={relationship.id} className="game-relationship-row">
              <div>
                <strong>{relationship.name}</strong>
                <span>{relationship.disposition} · {relationship.emotionalState}</span>
              </div>
              <div>
                <span>信任 {relationship.trust}</span>
                <strong>关系 {relationship.relationship}</strong>
              </div>
            </div>
          ))}
        </div>
      </GamePanel>
      <GamePanel
        title="敌情预警"
        eyebrow="威胁流"
        description="展示战斗压力、首领存在感与动态世界预警。"
      >
        <div className="game-list">
          {enemyAlerts.map((alert) => (
            <article key={alert.id} className="game-list__card">
              <div className="game-list__card-header">
                <strong>{alert.label}</strong>
                <Badge tone={alert.tone}>{uiToneLabels[alert.tone]}</Badge>
              </div>
              <p>{alert.detail}</p>
            </article>
          ))}
        </div>
      </GamePanel>
    </aside>
  );
}
