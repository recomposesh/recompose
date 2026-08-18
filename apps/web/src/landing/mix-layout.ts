export const DIAGRAM_WIDTH = 1312;
export const DIAGRAM_HEIGHT = 540;

export const HARNESSES = [
  { label: 'claude code', x: 94, wireEnd: 520, tone: 'live' },
  { label: 'codex', x: 281, wireEnd: 560, tone: 'virtual-model' },
  { label: 'cursor', x: 469, wireEnd: 600, tone: 'dim' },
  { label: 'zed', x: 656, wireEnd: 640, tone: 'dim' },
  { label: 'opencode', x: 843, wireEnd: 680, tone: 'dim' },
  { label: 'cline', x: 1031, wireEnd: 720, tone: 'dim' },
  { label: 'gemini cli', x: 1218, wireEnd: 760, tone: 'dim' },
] as const;

export const MODELS = [
  { label: 'claude-fable-5', x: 82, wireStart: 500, tone: 'virtual-model' },
  { label: 'gpt-5.6-sol', x: 246, wireStart: 545, tone: 'live' },
  { label: 'gemini-3-pro', x: 410, wireStart: 590, tone: 'dim' },
  { label: 'claude-opus-5', x: 574, wireStart: 635, tone: 'dim' },
  { label: 'kimi-k3', x: 738, wireStart: 680, tone: 'dim' },
  { label: 'deepseek-v4', x: 902, wireStart: 725, tone: 'dim' },
  { label: 'qwen3-coder', x: 1066, wireStart: 770, tone: 'dim' },
  { label: 'glm-5-air', x: 1230, wireStart: 815, tone: 'dim' },
] as const;

export const STROKES: Record<string, string> = {
  live: 'stroke-live',
  'virtual-model': 'stroke-virtual-model',
  dim: 'stroke-wire-dim',
};

export function wirePath(x1: number, y1: number, x2: number, y2: number) {
  const mid = (y1 + y2) / 2;

  return `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`;
}

export function leftPercent(x: number) {
  return `${(x / DIAGRAM_WIDTH) * 100}%`;
}
