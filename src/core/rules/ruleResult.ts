export interface RuleResult {
  ok: boolean;
  reason?: string;
}

export function passRule(reason?: string): RuleResult {
  return { ok: true, reason };
}

export function failRule(reason: string): RuleResult {
  return { ok: false, reason };
}
