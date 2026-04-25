const DEFAULT_BASE = 'https://open.bigmodel.cn/api/paas/v4';

function cleanBase(raw: string | undefined): string {
  const input = (raw || DEFAULT_BASE).trim().replace(/^['"]|['"]$/g, '');
  if (!input) return DEFAULT_BASE;
  // Accept either ".../v4" or full ".../chat/completions" from env.
  return input.replace(/\/chat\/completions\/?$/i, '').replace(/\/$/, '');
}

export function getZaiApiKey(): string | null {
  const raw =
    process.env.ZAI_API_KEY?.trim() ||
    process.env.BIGMODEL_API_KEY?.trim() ||
    process.env.Z_AI_API_KEY?.trim() ||
    process.env.ZAI_KEY?.trim() ||
    '';
  const key = raw
    .replace(/^Bearer\s+/i, '')
    .replace(/^['"]|['"]$/g, '')
    .replace(/[,;]\s*$/g, '')
    .trim();
  return key || null;
}

export function getZaiBase(): string {
  return cleanBase(process.env.ZAI_API_BASE || process.env.BIGMODEL_API_BASE);
}

export function isAnthropicCompatibleBase(base: string): boolean {
  return /\/anthropic(?:\/|$)/i.test(base);
}

export function getZaiCandidateBases(): string[] {
  const preferred = getZaiBase();
  if (isAnthropicCompatibleBase(preferred)) {
    return [preferred];
  }
  const candidates = [
    preferred,
    'https://api.z.ai/api/paas/v4',
    'https://open.bigmodel.cn/api/paas/v4',
  ].map((x) => cleanBase(x));
  return [...new Set(candidates)];
}

export function getGlmModel(): string {
  return (
    process.env.GLM_MODEL?.trim() ||
    process.env.ZAI_MODEL?.trim() ||
    process.env.BIGMODEL_MODEL?.trim() ||
    'glm-4-flash'
  );
}

export function getGlmVisionModel(): string {
  return (
    process.env.GLM_VISION_MODEL?.trim() ||
    process.env.ZAI_VISION_MODEL?.trim() ||
    process.env.BIGMODEL_VISION_MODEL?.trim() ||
    process.env.GLM_MODEL?.trim() ||
    'glm-4v-plus'
  );
}

export function getAnthropicModel(): string {
  return (
    process.env.ANTHROPIC_MODEL?.trim() ||
    process.env.ILMU_MODEL?.trim() ||
    'claude-3-5-sonnet-latest'
  );
}

export function getAnthropicVisionModel(): string {
  return (
    process.env.ANTHROPIC_VISION_MODEL?.trim() ||
    process.env.ILMU_VISION_MODEL?.trim() ||
    process.env.GLM_VISION_MODEL?.trim() ||
    getAnthropicModel()
  );
}

