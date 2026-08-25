const CLAUDE_CODE = 'claude-code';

/**
 * The name setup gives the first virtual model.
 *
 * @summary Claude Code discovers gateway models by name and keeps only the ids carrying `claude`
 * or `anthropic`, so a person who works in it would never see a model called anything else in
 * their own picker. Every other harness takes whatever it is handed, so the prefix only stands
 * where it earns its place.
 */
export function firstModelName(harnesses: ReadonlySet<string>): string {
  return harnesses.has(CLAUDE_CODE) ? 'claude-my-model' : 'my-model';
}

/**
 * The words that mark a model nobody wants their first answer from.
 *
 * @summary Small and special-purpose models are the ones a catalog leads with, because they cost
 * least to serve. The first request a person ever sends through recompose should not be answered
 * by the cheapest thing on the list.
 */
const PASSED_OVER = [
  'haiku',
  'mini',
  'nano',
  'lite',
  'small',
  'tiny',
  'instant',
  'spark',
  'embed',
  'rerank',
  'guard',
  'moderation',
  'tts',
  'whisper',
  'image',
  'video',
  'auto-review',
  'oss',
  'highspeed',
];

/** The words that mark the model a provider leads its own line with. */
const REACHED_FOR = ['opus', 'ultra', 'max', 'pro', 'sonnet', 'large', 'sol'];

const DATE = /\b\d{8}\b/gu;

const NUMBER = /\d+(?:\.\d+)?/gu;

function tierOf(id: string): number {
  const name = id.toLowerCase();

  if (PASSED_OVER.some((word) => name.includes(word))) {
    return -1;
  }

  const reached = REACHED_FOR.findIndex((word) => name.includes(word));

  return reached === -1 ? 0 : REACHED_FOR.length - reached;
}

/**
 * @summary A date reads as an enormous version number, so `claude-opus-4-20250514` would outrank
 * `claude-opus-4-8` on a bare digit read. Dates leave first, and a tag after a colon leaves with
 * them, because `llama3.3:70b` names a parameter count rather than a later release.
 */
function versionOf(id: string): readonly number[] {
  const withoutDates = id.toLowerCase().replace(DATE, ' ');
  const [head = ''] = withoutDates.split(':');

  return [...head.matchAll(NUMBER)].map((digits) => Number(digits[0]));
}

function outranks(left: readonly number[], right: readonly number[]): boolean {
  const depth = Math.max(left.length, right.length);

  for (let step = 0; step < depth; step += 1) {
    const here = left[step] ?? 0;
    const there = right[step] ?? 0;

    if (here !== there) {
      return here > there;
    }
  }

  return false;
}

/**
 * The model setup binds a target to, out of everything that account serves.
 *
 * @summary The answer is fixed for a given listing, so two runs over one account bind the same
 * model and a person never meets a graph that reads differently than the one they were shown. It
 * ranks rather than filters, so an account serving nothing but small models still answers with
 * one. Two models that tie on every reading are settled by the order the provider listed them,
 * which is the provider's own opinion and the only one left.
 */
export function pickServedModel(modelIds: readonly string[]): string | undefined {
  let best: string | undefined = undefined;
  let bestTier = -Infinity;
  let bestVersion: readonly number[] = [];

  for (const id of modelIds) {
    const tier = tierOf(id);
    const version = versionOf(id);

    if (tier > bestTier || (tier === bestTier && outranks(version, bestVersion))) {
      best = id;
      bestTier = tier;
      bestVersion = version;
    }
  }

  return best;
}
