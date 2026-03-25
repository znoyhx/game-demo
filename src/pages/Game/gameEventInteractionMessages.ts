export interface ResolveGameEventActivationMessageOptions {
  isForcedRender: boolean;
  previewAreaName?: string | null;
  naturalReason?: string;
  fallbackReason?: string;
}

export function resolveGameEventActivationMessage(
  options: ResolveGameEventActivationMessageOptions,
) {
  if (options.isForcedRender) {
    return options.previewAreaName
      ? `当前正在预览“${options.previewAreaName}”，不会真正触发事件。请先退出预览后再操作。`
      : '当前处于调试预览状态，不会真正触发事件。请先退出预览后再操作。';
  }

  return `当前无法触发：${
    options.naturalReason ?? options.fallbackReason ?? '当前事件无法触发。'
  }`;
}
