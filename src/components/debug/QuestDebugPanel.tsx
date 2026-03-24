import type { QuestDebugSnapshot, QuestStatus } from '../../core/schemas';
import { SectionCard } from '../layout/SectionCard';

const questTypeLabels = {
  main: '主线',
  side: '支线',
  hidden: '隐藏',
  tutorial: '教学',
  dynamic: '动态',
} as const;

const questStatusLabels: Record<QuestStatus, string> = {
  locked: '锁定',
  available: '可接取',
  active: '进行中',
  completed: '已完成',
  failed: '已失败',
};

const conditionTypeLabels = {
  talk: '对话',
  visit: '到达',
  collect: '收集',
  battle: '战斗',
  trigger: '触发',
  'quest-status': '任务状态',
  'world-flag': '世界标记',
  'npc-trust': 'NPC 信任',
  'player-tag': '玩家标签',
  event: '事件',
  'current-area': '当前区域',
  'visited-area': '已访问区域',
} as const;

interface QuestDebugPanelProps {
  snapshot: QuestDebugSnapshot;
  selectedQuestId: string | null;
  selectedStageIndex: number;
  selectedBranchId: string;
  busyActionId?: string | null;
  statusMessage?: string | null;
  onSelectQuest: (questId: string) => void;
  onStageIndexChange: (stageIndex: number) => void;
  onBranchIdChange: (branchId: string) => void;
  onActivateQuest: (questId: string) => void;
  onSetQuestStatus: (questId: string, status: 'completed' | 'failed') => void;
  onChooseBranch: (questId: string, branchId: string) => void;
  onJumpToStage: (questId: string, stageIndex: number, branchId?: string) => void;
  onSimulateCondition: (questId: string, conditionId: string) => void;
  onResetQuest: (questId: string) => void;
}

export function QuestDebugPanel({
  snapshot,
  selectedQuestId,
  selectedStageIndex,
  selectedBranchId,
  busyActionId,
  statusMessage,
  onSelectQuest,
  onStageIndexChange,
  onBranchIdChange,
  onActivateQuest,
  onSetQuestStatus,
  onChooseBranch,
  onJumpToStage,
  onSimulateCondition,
  onResetQuest,
}: QuestDebugPanelProps) {
  const questMap = new Map(snapshot.quests.map((quest) => [quest.questId, quest]));
  const selectedQuest =
    snapshot.quests.find((quest) => quest.questId === selectedQuestId) ??
    snapshot.quests[0] ??
    null;
  const selectedQuestLogs = selectedQuest
    ? snapshot.logs.filter((entry) => entry.questId === selectedQuest.questId)
    : [];
  const stageOptions = selectedQuest
    ? Math.max(selectedQuest.completionConditions.length, 1)
    : 1;
  const isBusy = busyActionId !== null && busyActionId !== undefined;

  const renderDependencyTitles = (questIds: string[]) => {
    if (questIds.length === 0) {
      return '无';
    }

    return questIds
      .map((questId) => questMap.get(questId)?.title ?? questId)
      .join('、');
  };

  const renderConditionGroup = (
    title: string,
    emptyText: string,
    conditions: Array<{
      id: string;
      label: string;
      type: keyof typeof conditionTypeLabels;
      category: 'trigger' | 'completion' | 'failure';
      satisfied: boolean;
      current: boolean;
      targetId?: string;
      requiredStatus?: QuestStatus;
      requiredCount?: number;
      minTrust?: number;
      playerTag?: string;
    }>,
  ) => (
    <>
      <h4 className="section-card__title">{title}</h4>
      <ul className="section-card__list">
        {conditions.length === 0 ? (
          <li>{emptyText}</li>
        ) : (
          conditions.map((condition) => (
            <li key={condition.id}>
              <strong>{condition.label}</strong>
              <div>
                {conditionTypeLabels[condition.type]} ·{' '}
                {condition.satisfied ? '已满足' : '未满足'}
                {condition.current ? ' · 当前验证步骤' : ''}
                {condition.requiredCount ? ` · 需求 ${condition.requiredCount}` : ''}
                {condition.requiredStatus
                  ? ` · 目标 ${questStatusLabels[condition.requiredStatus]}`
                  : ''}
                {condition.minTrust !== undefined ? ` · 最低信任 ${condition.minTrust}` : ''}
                {condition.playerTag ? ` · 标签 ${condition.playerTag}` : ''}
                {condition.targetId ? ` · ${condition.targetId}` : ''}
              </div>
              <div className="hero-callout__actions">
                <button
                  className="pixel-button pixel-button--ghost"
                  disabled={isBusy || !selectedQuest}
                  type="button"
                  onClick={() =>
                    selectedQuest &&
                    onSimulateCondition(selectedQuest.questId, condition.id)
                  }
                >
                  模拟满足
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </>
  );

  return (
    <div className="panel-grid panel-grid--two">
      <SectionCard
        title="任务调试控制"
        eyebrow={selectedQuest ? `当前任务：${selectedQuest.title}` : '未选择任务'}
        description="直接激活、完成、失败任务，模拟条件，并跳到后续验证阶段。所有调试动作都走控制器并写入存档。"
        footer="建议先选择任务，再用“跳到阶段”与“模拟满足”组合验证分支、依赖和动态触发。"
      >
        {selectedQuest ? (
          <>
            <form className="world-creation-form">
              <label className="world-creation-form__field">
                <span>任务</span>
                <select
                  value={selectedQuest.questId}
                  onChange={(event) => onSelectQuest(event.target.value)}
                >
                  {snapshot.quests.map((quest) => (
                    <option key={quest.questId} value={quest.questId}>
                      {quest.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="world-creation-form__field">
                <span>阶段</span>
                <select
                  value={Math.min(selectedStageIndex, stageOptions - 1)}
                  onChange={(event) =>
                    onStageIndexChange(Number(event.target.value))
                  }
                >
                  {Array.from({ length: stageOptions }, (_, index) => (
                    <option key={`stage-${index}`} value={index}>
                      第 {index + 1} 阶
                    </option>
                  ))}
                </select>
              </label>

              <label className="world-creation-form__field">
                <span>分支</span>
                <select
                  disabled={selectedQuest.branches.length === 0}
                  value={
                    selectedQuest.branches.length === 0
                      ? ''
                      : selectedBranchId || selectedQuest.branches[0]?.id || ''
                  }
                  onChange={(event) => onBranchIdChange(event.target.value)}
                >
                  {selectedQuest.branches.length === 0 ? (
                    <option value="">无分支</option>
                  ) : (
                    selectedQuest.branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.label}
                      </option>
                    ))
                  )}
                </select>
              </label>
            </form>

            <ul className="section-card__list">
              <li>类型：{questTypeLabels[selectedQuest.type]}</li>
              <li>状态：{questStatusLabels[selectedQuest.status]}</li>
              <li>
                当前进度：第{' '}
                {Math.min(
                  selectedQuest.currentObjectiveIndex + 1,
                  Math.max(selectedQuest.completionConditions.length, 1),
                )}{' '}
                阶 / 共{' '}
                {Math.max(selectedQuest.completionConditions.length, 1)} 阶
              </li>
              <li>已完成条件：{selectedQuest.completedObjectiveIds.length}</li>
              <li>依赖任务：{renderDependencyTitles(selectedQuest.dependencyQuestIds)}</li>
              <li>后续依赖：{renderDependencyTitles(selectedQuest.dependentQuestIds)}</li>
            </ul>

            <div className="hero-callout__actions">
              <button
                className="pixel-button"
                disabled={isBusy}
                type="button"
                onClick={() => onActivateQuest(selectedQuest.questId)}
              >
                直接激活
              </button>
              <button
                className="pixel-button pixel-button--ghost"
                disabled={isBusy}
                type="button"
                onClick={() => onSetQuestStatus(selectedQuest.questId, 'completed')}
              >
                直接完成
              </button>
              <button
                className="pixel-button pixel-button--ghost"
                disabled={isBusy}
                type="button"
                onClick={() => onSetQuestStatus(selectedQuest.questId, 'failed')}
              >
                直接失败
              </button>
              <button
                className="pixel-button pixel-button--ghost"
                disabled={isBusy || selectedQuest.branches.length === 0 || !selectedBranchId}
                type="button"
                onClick={() =>
                  onChooseBranch(selectedQuest.questId, selectedBranchId)
                }
              >
                应用分支
              </button>
              <button
                className="pixel-button pixel-button--ghost"
                disabled={isBusy}
                type="button"
                onClick={() =>
                  onJumpToStage(
                    selectedQuest.questId,
                    selectedStageIndex,
                    selectedBranchId || undefined,
                  )
                }
              >
                跳到阶段
              </button>
              <button
                className="pixel-button pixel-button--ghost"
                disabled={isBusy || !selectedQuest.canReset}
                type="button"
                onClick={() => onResetQuest(selectedQuest.questId)}
              >
                回退到首次调试前
              </button>
            </div>

            {renderConditionGroup(
              '触发条件',
              '该任务没有额外触发条件。',
              selectedQuest.triggerConditions,
            )}
            {renderConditionGroup(
              '完成条件',
              '该任务没有完成条件。',
              selectedQuest.completionConditions,
            )}
            {renderConditionGroup(
              '失败条件',
              '该任务没有失败条件。',
              selectedQuest.failureConditions,
            )}

            <h4 className="section-card__title">任务日志</h4>
            <ul className="section-card__list">
              {selectedQuestLogs.length === 0 ? (
                <li>当前任务还没有日志。</li>
              ) : (
                selectedQuestLogs.map((entry, index) => (
                  <li key={`${entry.questId}-${entry.updatedAt}-${index}`}>
                    {entry.updatedAt} · {questStatusLabels[entry.status]} · {entry.note}
                  </li>
                ))
              )}
            </ul>

            {statusMessage ? (
              <p className="section-card__footer">{statusMessage}</p>
            ) : null}
          </>
        ) : (
          <p className="section-card__description">当前没有可调试的任务。</p>
        )}
      </SectionCard>

      <SectionCard
        title="任务依赖图"
        eyebrow={`共 ${snapshot.dependencyGraph.length} 个任务节点`}
        description="这里展示任务之间的显式依赖与任务状态引用，方便直接查看哪些任务会阻塞或解锁后续流程。"
        footer="依赖图按任务定义实时生成，可结合上方条件模拟按钮快速验证分支链路。"
      >
        <ul className="section-card__list">
          {snapshot.dependencyGraph.map((node) => (
            <li key={node.questId}>
              <strong>{node.title}</strong> · {questTypeLabels[node.type]} ·{' '}
              {questStatusLabels[node.status]}
              <div>依赖：{renderDependencyTitles(node.dependsOn)}</div>
              <div>影响：{renderDependencyTitles(node.requiredBy)}</div>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
