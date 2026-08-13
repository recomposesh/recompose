import { isCodexReasoningSignature } from '../dialect/responses-shared';
import { strictNativeClaudeSignature } from '../subscription/claude-signatures';
import { nativeGeminiSignature } from './gemini-signature';
import { isValidKimiThinkingSignature } from './kimi-signature';

/** The families a signature can belong to, and the one for a value that names none. */
export type SignatureProvider = 'claude' | 'gemini' | 'gpt' | 'kimi' | 'grok' | 'unknown';

/** What to do with a signed block crossing into a target that did not sign it. */
type SignatureAction = 'preserve' | 'drop-signature' | 'drop-block';

export type SignatureDecision = {
  targetProvider: SignatureProvider;
  detectedProvider: SignatureProvider;
  compatible: boolean;
  action: SignatureAction;
  reason: string;
};

const NAMED_FAMILIES: readonly (readonly [SignatureProvider, readonly string[]])[] = [
  ['claude', ['claude']],
  ['gemini', ['gemini']],
  ['gpt', ['gpt', 'openai', 'codex']],
  ['kimi', ['kimi', 'moonshot']],
  ['grok', ['grok']],
];

const PREFIXED_FAMILIES: readonly (readonly [SignatureProvider, readonly string[]])[] = [
  ['gpt', ['o1', 'o3', 'o4']],
  ['kimi', ['k2', 'k3']],
];

/** The family a model name belongs to, read from the name alone. */
export function signatureProviderFromModelName(modelName: string): SignatureProvider {
  const lowered = modelName.trim().toLowerCase();
  const named = NAMED_FAMILIES.find(([, marks]) => marks.some((mark) => lowered.includes(mark)));

  if (named !== undefined) return named[0];

  const prefixed = PREFIXED_FAMILIES.find(([, marks]) =>
    marks.some((mark) => lowered.startsWith(mark)),
  );

  return prefixed === undefined ? 'unknown' : prefixed[0];
}

/**
 * The family a signature came from, or unknown where nothing claims it.
 *
 * @summary Every self-describing envelope answers first, because Kimi is recognised by length
 * alone and a foreign value of coincidental length must never be captured by it. Grok is never
 * returned: its encrypted content describes nothing, so a Grok blob and an unclaimed one are the
 * same reading.
 */
export function detectSignatureProvider(rawSignature: string): SignatureProvider {
  if (isCodexReasoningSignature(rawSignature)) return 'gpt';
  if (strictNativeClaudeSignature(rawSignature) !== null) return 'claude';
  if (nativeGeminiSignature(rawSignature) !== null) return 'gemini';

  return isValidKimiThinkingSignature(rawSignature) ? 'kimi' : 'unknown';
}

const REFUSALS: Readonly<
  Record<Exclude<SignatureProvider, 'unknown'>, SignatureDecision['reason']>
> = {
  claude: 'Claude has no cross-provider bypass sentinel for thinking blocks',
  gemini: 'the signature is not compatible with Gemini',
  gpt: 'GPT reasoning content cannot be synthesized from another provider signature',
  kimi: 'Kimi does not read a replayed thinking signature, so the block survives without one',
  grok: 'xAI verifies encrypted content on replay and rejects a foreign or mutated blob',
};

function refusedAction(targetProvider: SignatureProvider): SignatureAction {
  return targetProvider === 'kimi' ? 'drop-signature' : 'drop-block';
}

/**
 * Whether a signed block may cross into a target, and what to do when it may not.
 *
 * @summary Kimi is the only target that keeps the block: its endpoint never reads the signature
 * back, so dropping the whole block would discard recoverable thinking for no upstream benefit.
 * Every other target drops the block outright, because a foreign signature either fails
 * validation upstream or means nothing there.
 */
export function decideSignatureCompatibility(
  targetProvider: SignatureProvider,
  rawSignature: string,
): SignatureDecision {
  const detectedProvider = detectSignatureProvider(rawSignature);

  if (detectedProvider !== 'unknown' && detectedProvider === targetProvider) {
    return {
      targetProvider,
      detectedProvider,
      compatible: true,
      action: 'preserve',
      reason: 'the target produced this signature',
    };
  }

  return {
    targetProvider,
    detectedProvider,
    compatible: false,
    action: refusedAction(targetProvider),
    reason: targetProvider === 'unknown' ? 'unknown target provider' : REFUSALS[targetProvider],
  };
}
