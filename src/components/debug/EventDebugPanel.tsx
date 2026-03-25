import type {
  EventDebugOutcome,
  EventDebugSnapshot,
  WorldEventType,
} from '../../core/schemas';
import { SectionCard } from '../layout/SectionCard';

const eventTypeLabels: Record<WorldEventType, string> = {
  'weather-change': '天气变化',
  'resource-reduction': '资源减少',
  'npc-movement': 'NPC 移动',
  'faction-conflict': '派系冲突',
  'hidden-clue-exposure': '隐藏线索曝光',
  'early-boss-appearance': 'Boss 提前现身',
  'shop-price-change': '商店价格变化',
  'area-state-change': '区域开闭变化',
};

const eventSourceLabels = {
  manual: '手动',
  time: '时间',
  location: '地点',
  quest: '任务',
  relationship: '关系',
  playerModel: '玩家画像',
  balance: '节奏平衡',
  debug: '调试',
} as const;

interface EventDebugPanelProps {
  snapshot: EventDebugSnapshot;
  selectedEventId: string | null;
  selectedHistoryIndex: number | null;
  latestOutcome: EventDebugOutcome | null;
  busyActionId: string | null;
  statusMessage: string | null;
  onSelectEvent: (eventId: string) => void;
  onSelectHistoryIndex: (historyIndex: number) => void;
  onTriggerSelectedEvent: () => void;
  onReplaySelectedHistory: () => void;
  onToggleRandomness: () => void;
}

export function EventDebugPanel({
  snapshot,
  selectedEventId,
  selectedHistoryIndex,
  latestOutcome,
  busyActionId,
  statusMessage,
  onSelectEvent,
  onSelectHistoryIndex,
  onTriggerSelectedEvent,
  onReplaySelectedHistory,
  onToggleRandomness,
}: EventDebugPanelProps) {
  const selectedEvent =
    snapshot.events.find((event) => event.eventId === selectedEventId) ??
    snapshot.events[0] ??
    null;
  const selectedHistoryEntry =
    snapshot.history.find((entry) => entry.index === selectedHistoryIndex) ??
    snapshot.history[snapshot.history.length - 1] ??
    null;
  const isBusy = busyActionId !== null;

  return (
    <div className="panel-grid panel-grid--two">
      <SectionCard
        title="事件调试面板"
        eyebrow={
          selectedEvent ? `当前事件：${selectedEvent.title}` : '当前事件：未选择'
        }
        description="可以直接手动触发任意事件、关闭随机性、查看自然触发阻塞原因，并把历史事件按调试路径重新回放。"
        footer={
          statusMessage ??
          '事件调试只复用现有规则与控制器，调试摘要会单独展示，不把临时说明写回生产逻辑。'
        }
      >
        <form className="world-creation-form">
          <label className="world-creation-form__field">
            <span>目标事件</span>
            <select
              value={selectedEvent?.eventId ?? ''}
              onChange={(event) => onSelectEvent(event.target.value)}
            >
              {snapshot.events.map((entry) => (
                <option key={entry.eventId} value={entry.eventId}>
                  {entry.title}
                </option>
              ))}
            </select>
          </label>

          <label className="world-creation-form__field">
            <span>历史回放</span>
            <select
              disabled={snapshot.history.length === 0}
              value={selectedHistoryEntry?.index ?? ''}
              onChange={(event) => onSelectHistoryIndex(Number(event.target.value))}
            >
              {snapshot.history.length === 0 ? (
                <option value="">暂无可回放事件</option>
              ) : (
                snapshot.history.map((entry) => (
                  <option key={`${entry.index}-${entry.eventId}`} value={entry.index}>
                    {entry.triggeredAt} · {entry.title}
                  </option>
                ))
              )}
            </select>
          </label>
        </form>

        {selectedEvent ? (
          <ul className="section-card__list">
            <li>类型：{eventTypeLabels[selectedEvent.type]}</li>
            <li>重复触发：{selectedEvent.repeatable ? '允许' : '不允许'}</li>
            <li>触发次数：{selectedEvent.triggerCount}</li>
            <li>
              最近来源：
              {selectedEvent.lastSource
                ? eventSourceLabels[selectedEvent.lastSource]
                : '暂无'}
            </li>
            <li>最近触发时间：{selectedEvent.lastTriggeredAt ?? '暂无'}</li>
            <li>待触发队列：{selectedEvent.pending ? '已加入' : '未加入'}</li>
            <li>已调度：{selectedEvent.scheduled ? '是' : '否'}</li>
            <li>
              自然触发检查：
              {selectedEvent.naturallyTriggerable ? '当前满足' : '当前不满足'}
            </li>
          </ul>
        ) : (
          <p className="section-card__description">当前没有可调试的事件。</p>
        )}

        {selectedEvent && !selectedEvent.naturallyTriggerable ? (
          <>
            <h4 className="section-card__title">自然触发阻塞原因</h4>
            <ul className="section-card__list">
              {selectedEvent.naturalReasons.map((reason) => (
                <li key={`${selectedEvent.eventId}-${reason}`}>{reason}</li>
              ))}
            </ul>
          </>
        ) : null}

        <div className="hero-callout__actions">
          <button
            className="pixel-button"
            type="button"
            disabled={!selectedEvent || isBusy}
            onClick={onTriggerSelectedEvent}
          >
            {busyActionId === 'event-trigger' ? '处理中…' : '手动触发事件'}
          </button>
          <button
            className="pixel-button pixel-button--ghost"
            type="button"
            disabled={!selectedHistoryEntry || isBusy}
            onClick={onReplaySelectedHistory}
          >
            {busyActionId === 'event-replay' ? '处理中…' : '回放历史事件'}
          </button>
          <button
            className="pixel-button pixel-button--ghost"
            type="button"
            disabled={isBusy}
            onClick={onToggleRandomness}
          >
            {busyActionId === 'event-randomness'
              ? '处理中…'
              : snapshot.director.randomnessDisabled
                ? '恢复事件随机性'
                : '关闭事件随机性'}
          </button>
        </div>

        <h4 className="section-card__title">导演运行态</h4>
        <ul className="section-card__list">
          <li>随机性：{snapshot.director.randomnessDisabled ? '已关闭' : '启用中'}</li>
          <li>世界张力：{snapshot.director.worldTension}</li>
          <li>节奏备注：{snapshot.director.pacingNote ?? '暂无'}</li>
          <li>待触发数量：{snapshot.director.pendingEventIds.length}</li>
          <li>已调度数量：{snapshot.director.scheduledEventIds.length}</li>
          <li>已曝光线索：{snapshot.director.revealedClueCount}</li>
          <li>商店价格修正：{snapshot.director.shopModifierCount}</li>
          <li>派系冲突记录：{snapshot.director.factionConflictCount}</li>
        </ul>
      </SectionCard>

      <SectionCard
        title="事件原因与结果"
        eyebrow={
          latestOutcome
            ? latestOutcome.mode === 'history-replay'
              ? '最近一次历史回放'
              : '最近一次手动触发'
            : '等待调试结果'
        }
        description="这里展示本次调试的实际来源、自然触发判定，以及事件写入世界状态后的摘要。"
        footer="如果选择历史回放，会保留原始历史时间供对照，但实际写入来源始终标记为调试。"
      >
        {latestOutcome ? (
          <>
            <ul className="section-card__list">
              <li>事件：{latestOutcome.title}</li>
              <li>实际来源：{eventSourceLabels[latestOutcome.actualSource]}</li>
              <li>本次写入时间：{latestOutcome.triggeredAt}</li>
              <li>
                自然触发：
                {latestOutcome.naturalEvaluationOk ? '当前满足' : '当前不满足'}
              </li>
              {latestOutcome.replayedFromTriggeredAt ? (
                <li>
                  回放原记录：#{latestOutcome.replayedFromIndex} ·{' '}
                  {latestOutcome.replayedFromTriggeredAt}
                </li>
              ) : null}
            </ul>

            {!latestOutcome.naturalEvaluationOk ? (
              <>
                <h4 className="section-card__title">自然触发阻塞原因</h4>
                <ul className="section-card__list">
                  {latestOutcome.naturalReasons.map((reason) => (
                    <li key={`${latestOutcome.eventId}-${reason}`}>{reason}</li>
                  ))}
                </ul>
              </>
            ) : null}

            <h4 className="section-card__title">结果摘要</h4>
            <ul className="section-card__list">
              {latestOutcome.changeSummary.map((line) => (
                <li key={`${latestOutcome.eventId}-${line}`}>{line}</li>
              ))}
            </ul>

            <h4 className="section-card__title">结果后的导演状态</h4>
            <ul className="section-card__list">
              <li>随机性：{latestOutcome.directorAfter.randomnessDisabled ? '已关闭' : '启用中'}</li>
              <li>世界张力：{latestOutcome.directorAfter.worldTension}</li>
              <li>待触发数量：{latestOutcome.directorAfter.pendingEventIds.length}</li>
              <li>已调度数量：{latestOutcome.directorAfter.scheduledEventIds.length}</li>
              <li>已曝光线索：{latestOutcome.directorAfter.revealedClueCount}</li>
              <li>商店价格修正：{latestOutcome.directorAfter.shopModifierCount}</li>
              <li>派系冲突记录：{latestOutcome.directorAfter.factionConflictCount}</li>
            </ul>
          </>
        ) : (
          <>
            <ul className="section-card__list">
              {snapshot.history.length === 0 ? (
                <li>当前还没有事件历史，可以先手动触发一个事件。</li>
              ) : (
                snapshot.history
                  .slice()
                  .reverse()
                  .slice(0, 6)
                  .map((entry) => (
                    <li key={`${entry.index}-${entry.eventId}`}>
                      #{entry.index} · {entry.triggeredAt} · {entry.title} ·{' '}
                      {eventSourceLabels[entry.source]}
                    </li>
                  ))
              )}
            </ul>
          </>
        )}
      </SectionCard>
    </div>
  );
}
