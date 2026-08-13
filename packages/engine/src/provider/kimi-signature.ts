import { isCodexReasoningSignature } from '../dialect/responses-shared';
import { strictNativeClaudeSignature } from '../subscription/claude-signatures';

/** The raw length Kimi emits for a non-streaming Messages response. */
export const KIMI_SIGNATURE_NON_STREAMING_LENGTH = 12_946;

/** The raw length Kimi emits in the streaming signature delta. */
export const KIMI_SIGNATURE_STREAMING_LENGTH = 4_340;

const MINIMUM_ENTROPY_RATIO = 0.85;

const UNPADDED_BASE64 = /^[A-Za-z0-9+/]+$/u;

/** Which upstream path produced a signature, read from its length alone. */
type KimiSignatureMode = 'non-streaming' | 'streaming';

export type KimiSignatureInfo = {
  rawLength: number;
  decodedLength: number;
  mode: KimiSignatureMode;
};

const MODE_BY_LENGTH = new Map<number, KimiSignatureMode>([
  [KIMI_SIGNATURE_NON_STREAMING_LENGTH, 'non-streaming'],
  [KIMI_SIGNATURE_STREAMING_LENGTH, 'streaming'],
]);

function byteEntropyRatio(bytes: Buffer): number {
  const counts = Array.from<number>({ length: 256 }).fill(0);

  for (const byte of bytes) counts[byte] = (counts[byte] ?? 0) + 1;

  const total = bytes.length;
  const entropy = counts.reduce((sum, count) => {
    if (count === 0) return sum;

    const share = count / total;

    return sum - share * Math.log2(share);
  }, 0);
  const symbols = Math.min(total, 256);

  return symbols <= 1 ? 0 : entropy / Math.log2(symbols);
}

function wearsAnotherProvidersEnvelope(signature: string): boolean {
  return isCodexReasoningSignature(signature) || strictNativeClaudeSignature(signature) !== null;
}

function carriesKimiTransportShape(raw: string): boolean {
  return (
    raw === raw.trim() &&
    raw !== '' &&
    UNPADDED_BASE64.test(raw) &&
    !raw.includes('#') &&
    !wearsAnotherProvidersEnvelope(raw)
  );
}

/**
 * What a Kimi thinking signature is, or nothing where the value is not one.
 *
 * @summary This proves nothing about the payload. It reports that a value has the size and
 * character class Kimi produces, which is the only signal Kimi's own wire offers: the endpoint
 * never reads the field back, so a mutated or absent signature answers 200 either way. Size alone
 * could capture another provider by coincidence, so every self-describing envelope is refused
 * first and the length pair is consulted last.
 */
export function inspectKimiThinkingSignature(raw: string): KimiSignatureInfo | null {
  const mode = MODE_BY_LENGTH.get(raw.length);

  if (mode === undefined || !carriesKimiTransportShape(raw)) return null;

  const decoded = Buffer.from(raw, 'base64');

  return byteEntropyRatio(decoded) < MINIMUM_ENTROPY_RATIO
    ? null
    : { rawLength: raw.length, decodedLength: decoded.length, mode };
}

/** Whether a value carries the transport shape of a Kimi thinking signature. */
export function isValidKimiThinkingSignature(raw: string): boolean {
  return inspectKimiThinkingSignature(raw) !== null;
}
