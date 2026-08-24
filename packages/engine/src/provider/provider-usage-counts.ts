import type { ProviderDialect } from '../gateway-wire';

import { isJsonObject } from '../gateway-wire';

export type ProviderUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
};

/**
 * What one body named, and nothing it left out.
 *
 * @summary A stream reports its counts across events rather than in any one of them: Anthropic
 * names the input it read as the message opens and the output it wrote as it closes. Telling a
 * count no vendor named apart from one a vendor named as zero is what lets the closing event stand
 * on the opening one rather than erase it.
 */
export type NamedCounts = Partial<ProviderUsage>;

export const emptyProviderUsage = (): ProviderUsage => ({
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  reasoningTokens: 0,
});

function countAt(usage: Record<string, unknown>, ...names: readonly string[]): number | undefined {
  for (const name of names) {
    const value = usage[name];

    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
      return value;
    }
  }

  return undefined;
}

function objectAt(value: unknown, field: string): Record<string, unknown> | undefined {
  if (!isJsonObject(value)) return undefined;

  const nested = value[field];

  return isJsonObject(nested) ? nested : undefined;
}

/**
 * @summary A vendor that names its own total is believed over a sum, except where that total reads
 * zero beside counts that do not: some streams close on an empty usage envelope, and a zero total
 * there means the event carried no reading rather than a turn that spent nothing.
 */
function reportedTotal(total: number | undefined): NamedCounts {
  return total === undefined || total === 0 ? {} : { totalTokens: total };
}

/**
 * The envelopes a body wraps its usage in, in the order a reader opens them.
 *
 * @summary `message` is Anthropic's opening stream event, which is the only place the input and
 * cache counts of a streamed turn are ever stated. Reading it is what keeps a streamed answer from
 * counting its output alone.
 */
const USAGE_ENVELOPES = ['message', 'response', 'interaction'] as const;

function envelopedUsage(body: unknown): Record<string, unknown> | undefined {
  for (const envelope of USAGE_ENVELOPES) {
    const usage = objectAt(objectAt(body, envelope), 'usage');

    if (usage !== undefined) {
      return usage;
    }
  }

  return objectAt(objectAt(body, 'metadata'), 'total_usage');
}

function usageObject(body: unknown): Record<string, unknown> {
  return objectAt(body, 'usage') ?? envelopedUsage(body) ?? {};
}

/** Two counts taken together, or nothing where the body named neither of them. */
function bothNamed(first: number | undefined, second: number | undefined): number | undefined {
  if (first === undefined && second === undefined) {
    return undefined;
  }

  return (first ?? 0) + (second ?? 0);
}

/** One count as a reading states it, which is zero for every count no vendor named. */
export function countOf(counts: NamedCounts, name: keyof ProviderUsage): number {
  return counts[name] ?? 0;
}

function detailsAt(
  usage: Record<string, unknown>,
  primary: string,
  fallback: string,
): Record<string, unknown> {
  return objectAt(usage, primary) ?? objectAt(usage, fallback) ?? {};
}

function tokenCounts(input: number | undefined, output: number | undefined): NamedCounts {
  return {
    ...(input === undefined ? {} : { inputTokens: input }),
    ...(output === undefined ? {} : { outputTokens: output }),
  };
}

function cacheCounts(read: number | undefined, write: number | undefined): NamedCounts {
  return {
    ...(read === undefined ? {} : { cacheReadTokens: read }),
    ...(write === undefined ? {} : { cacheWriteTokens: write }),
  };
}

function reasoningCount(reasoning: number | undefined): NamedCounts {
  return reasoning === undefined ? {} : { reasoningTokens: reasoning };
}

function openAICounts(body: unknown): NamedCounts {
  const usage = usageObject(body);
  const inputDetails = detailsAt(usage, 'input_tokens_details', 'prompt_tokens_details');
  const outputDetails = detailsAt(usage, 'output_tokens_details', 'completion_tokens_details');

  return {
    ...tokenCounts(
      countAt(usage, 'prompt_tokens', 'input_tokens'),
      countAt(usage, 'completion_tokens', 'output_tokens'),
    ),
    ...cacheCounts(
      countAt(inputDetails, 'cached_tokens'),
      countAt(inputDetails, 'cache_write_tokens', 'cache_creation_tokens'),
    ),
    ...reasoningCount(countAt(outputDetails, 'reasoning_tokens')),
    ...reportedTotal(countAt(usage, 'total_tokens')),
  };
}

function anthropicCounts(body: unknown): NamedCounts {
  const usage = usageObject(body);
  const outputDetails = objectAt(usage, 'output_tokens_details');

  return {
    ...tokenCounts(countAt(usage, 'input_tokens'), countAt(usage, 'output_tokens')),
    ...cacheCounts(
      countAt(usage, 'cache_read_input_tokens'),
      countAt(usage, 'cache_creation_input_tokens'),
    ),
    ...reasoningCount(
      countAt(outputDetails ?? {}, 'thinking_tokens') ?? countAt(usage, 'thinking_tokens'),
    ),
  };
}

function geminiCounts(body: unknown): NamedCounts {
  const usage = objectAt(body, 'usageMetadata');

  if (usage === undefined) return {};

  return {
    ...tokenCounts(
      bothNamed(countAt(usage, 'promptTokenCount'), countAt(usage, 'toolUsePromptTokenCount')),
      countAt(usage, 'candidatesTokenCount'),
    ),
    ...cacheCounts(countAt(usage, 'cachedContentTokenCount'), undefined),
    ...reasoningCount(countAt(usage, 'thoughtsTokenCount')),
    ...reportedTotal(countAt(usage, 'totalTokenCount')),
  };
}

function interactionsCounts(body: unknown): NamedCounts {
  const usage = usageObject(body);

  return {
    ...tokenCounts(
      bothNamed(
        countAt(usage, 'input_tokens', 'total_input_tokens'),
        countAt(usage, 'total_tool_use_tokens'),
      ),
      countAt(usage, 'output_tokens', 'total_output_tokens'),
    ),
    ...cacheCounts(
      countAt(usage, 'cached_tokens', 'total_cached_tokens'),
      countAt(usage, 'cache_write_tokens', 'cache_creation_input_tokens'),
    ),
    ...reasoningCount(countAt(usage, 'reasoning_tokens', 'total_thought_tokens')),
    ...reportedTotal(countAt(usage, 'total_tokens')),
  };
}

/** The counts one body named, read the way its own dialect states them. */
export function namedCountsFor(dialect: ProviderDialect, body: unknown): NamedCounts {
  if (dialect === 'gemini') return geminiCounts(body);
  if (dialect === 'anthropic') return anthropicCounts(body);
  if (dialect === 'interactions') return interactionsCounts(body);

  return openAICounts(body);
}

/**
 * What a turn totals where no vendor named a total of its own.
 *
 * @summary Anthropic states its cache buckets beside the input rather than inside it, so a sum that
 * left them out would under-count every cached turn. The rest state reasoning apart from the output
 * the same way.
 */
export function summedCounts(dialect: ProviderDialect, counts: NamedCounts): number {
  const spoken = countOf(counts, 'inputTokens') + countOf(counts, 'outputTokens');
  const cached = countOf(counts, 'cacheReadTokens') + countOf(counts, 'cacheWriteTokens');

  if (dialect === 'anthropic') {
    return spoken + cached;
  }

  if (dialect === 'gemini' || dialect === 'interactions') {
    return spoken + countOf(counts, 'reasoningTokens');
  }

  return spoken;
}
