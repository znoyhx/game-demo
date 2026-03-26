import type { GameDifficulty } from '../../core/schemas';
import type { RuntimeConfigProfile } from '../../core/controllers';
import type { ConfigResourceDebugViewModel } from '../../pages/Debug/configResourceDebugViewModel';
import { SectionCard } from '../layout/SectionCard';
import { Badge } from '../pixel-ui/Badge';

interface ConfigResourceDebugPanelProps {
  viewModel: ConfigResourceDebugViewModel;
  busyActionId: string | null;
  statusMessage: string | null;
  onApplyProfile: (profile: RuntimeConfigProfile) => void;
  onApplyDifficulty: (difficulty: GameDifficulty) => void;
  onToggleAutosave: () => void;
  onToggleAutoLoad: () => void;
  onSyncAreaResources: () => void;
  onToggleResourceLoaded: (
    resourceKey: string,
    resourceLabel: string,
    shouldLoad: boolean,
  ) => void;
}

const busyText = '处理中…';

const actionIsBusy = (busyActionId: string | null, prefix: string) =>
  busyActionId !== null && busyActionId.startsWith(prefix);

export function ConfigResourceDebugPanel({
  viewModel,
  busyActionId,
  statusMessage,
  onApplyProfile,
  onApplyDifficulty,
  onToggleAutosave,
  onToggleAutoLoad,
  onSyncAreaResources,
  onToggleResourceLoaded,
}: ConfigResourceDebugPanelProps) {
  return (
    <div className="panel-grid panel-grid--two">
      <SectionCard
        title="配置与资源调试"
        eyebrow={viewModel.configSummary.activeProfileLabel}
        description="直接校验运行时配置切换是否生效，并确认这些变更会通过控制器进入调试保存链路。"
        footer={
          statusMessage ??
          '所有操作都会经过控制器、状态校验和调试保存路径，不直接由页面绕过业务边界。'
        }
      >
        <ul className="section-card__list">
          <li>当前难度：{viewModel.configSummary.difficultyLabel}</li>
          <li>保存策略：{viewModel.configSummary.savePolicyLabel}</li>
          <li>{viewModel.configSummary.autosaveLabel}</li>
          <li>{viewModel.configSummary.autoLoadLabel}</li>
          <li>界面限制：{viewModel.configSummary.uiSummary}</li>
          <li>调试能力：{viewModel.configSummary.debugSummary}</li>
        </ul>

        <h4 className="section-card__title">运行档位</h4>
        <div className="hero-callout__actions">
          {viewModel.profileOptions.map((option) => (
            <button
              key={option.id}
              className={option.isActive ? 'pixel-button' : 'pixel-button pixel-button--ghost'}
              type="button"
              disabled={Boolean(busyActionId)}
              onClick={() => onApplyProfile(option.id)}
            >
              {actionIsBusy(busyActionId, `profile:${option.id}`)
                ? busyText
                : option.label}
            </button>
          ))}
        </div>

        <h4 className="section-card__title">难度预设</h4>
        <div className="hero-callout__actions">
          {viewModel.difficultyOptions.map((option) => (
            <button
              key={option.id}
              className={option.isActive ? 'pixel-button' : 'pixel-button pixel-button--ghost'}
              type="button"
              disabled={Boolean(busyActionId)}
              onClick={() => onApplyDifficulty(option.id)}
            >
              {actionIsBusy(busyActionId, `difficulty:${option.id}`)
                ? busyText
                : option.label}
            </button>
          ))}
        </div>

        <div className="hero-callout__actions">
          <button
            className="pixel-button pixel-button--ghost"
            type="button"
            disabled={Boolean(busyActionId)}
            onClick={onToggleAutosave}
          >
            {actionIsBusy(busyActionId, 'autosave')
              ? busyText
              : viewModel.configSummary.autosaveLabel}
          </button>
          <button
            className="pixel-button pixel-button--ghost"
            type="button"
            disabled={Boolean(busyActionId)}
            onClick={onToggleAutoLoad}
          >
            {actionIsBusy(busyActionId, 'autoload')
              ? busyText
              : viewModel.configSummary.autoLoadLabel}
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="资源注册表检查"
        eyebrow={`已加载资源 ${viewModel.resourceSummary.loadedCount} 项`}
        description="用于核对当前主题、当前选择资源，以及当前区域背景与头像是否能命中集中注册表。"
        footer="这里只展示本轮运行真正会用到的调试信息，不把页面直接绑定到底层持久化细节。"
      >
        <ul className="section-card__list">
          <li>当前主题：{viewModel.resourceSummary.activeTheme}</li>
          <li>当前背景：{viewModel.resourceSummary.selectedBackgroundLabel}</li>
          <li>当前图块集：{viewModel.resourceSummary.selectedTilesetLabel}</li>
          <li>当前音乐：{viewModel.resourceSummary.selectedMusicLabel}</li>
        </ul>

        <h4 className="section-card__title">注册表统计</h4>
        <ul className="section-card__list">
          {viewModel.registryMetrics.map((metric) => (
            <li key={metric.label}>
              {metric.label}：{metric.value}
            </li>
          ))}
        </ul>

        <div className="hero-callout__actions">
          <button
            className="pixel-button"
            type="button"
            disabled={Boolean(busyActionId)}
            onClick={onSyncAreaResources}
          >
            {actionIsBusy(busyActionId, 'resource-sync')
              ? busyText
              : '同步当前区域资源选择'}
          </button>
        </div>

        <h4 className="section-card__title">当前区域命中明细</h4>
        <ul className="section-card__list">
          {viewModel.currentAreaEntries.length === 0 ? (
            <li>当前区域没有可检查的背景或头像资源。</li>
          ) : (
            viewModel.currentAreaEntries.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.label}</strong>
                <div>{entry.statusLabel}</div>
                <div className="hero-callout__actions">
                  {entry.selected ? <Badge tone="info">当前选择</Badge> : null}
                  <Badge tone={entry.loaded ? 'success' : 'warning'}>
                    {entry.loaded ? '已标记加载' : '未标记加载'}
                  </Badge>
                </div>
                <div className="hero-callout__actions">
                  <button
                    className="pixel-button pixel-button--ghost"
                    type="button"
                    disabled={!entry.canToggleLoad || Boolean(busyActionId)}
                    onClick={() =>
                      onToggleResourceLoaded(entry.resourceKey, entry.label, !entry.loaded)
                    }
                  >
                    {!entry.canToggleLoad
                      ? '缺少可切换资源'
                      : actionIsBusy(busyActionId, `resource:${entry.resourceKey}`)
                        ? busyText
                        : entry.loaded
                          ? '移除加载标记'
                          : '标记为已加载'}
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </SectionCard>
    </div>
  );
}
