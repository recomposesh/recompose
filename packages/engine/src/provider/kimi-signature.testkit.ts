import { createHash } from 'node:crypto';

import { KIMI_SIGNATURE_STREAMING_LENGTH } from './kimi-signature';

const STREAMING_DECODED_LENGTH = 3255;

/**
 * A signature carrying the shape Kimi produces, for specs about the replay store itself.
 *
 * @summary The store now judges a signature before it holds a turn, so a spec about generations,
 * eviction, or scoping needs a value that passes that judgement. The bytes come from a hash chain
 * rather than a fixed string, because the validator refuses low-entropy filler.
 */
export function kimiThinkingSignature(seed = 'recompose'): string {
  const bytes = Buffer.alloc(STREAMING_DECODED_LENGTH);
  let filled = 0;
  let counter = 0;

  while (filled < bytes.length) {
    const block = createHash('sha256')
      .update(`${seed}-${String(counter++)}`)
      .digest();
    const taken = Math.min(block.length, bytes.length - filled);

    block.copy(bytes, filled, 0, taken);
    filled += taken;
  }

  const signature = bytes.toString('base64').replace(/=+$/u, '');

  if (signature.length !== KIMI_SIGNATURE_STREAMING_LENGTH) {
    throw new Error(`kimi testkit signature is ${String(signature.length)} characters`);
  }

  return signature;
}
