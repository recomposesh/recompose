import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  inspectKimiThinkingSignature,
  isValidKimiThinkingSignature,
  KIMI_SIGNATURE_NON_STREAMING_LENGTH,
  KIMI_SIGNATURE_STREAMING_LENGTH,
} from './kimi-signature';

describe('a Kimi thinking signature crossing the validator', () => {
  it('should pair each accepted raw length with the mode that produces it', () => {
    expect(inspectKimiThinkingSignature(kimiSignature('non-streaming'))).toEqual({
      rawLength: KIMI_SIGNATURE_NON_STREAMING_LENGTH,
      decodedLength: 9709,
      mode: 'non-streaming',
    });
    expect(inspectKimiThinkingSignature(kimiSignature('streaming'))).toEqual({
      rawLength: KIMI_SIGNATURE_STREAMING_LENGTH,
      decodedLength: 3255,
      mode: 'streaming',
    });
  });

  it('should refuse a length one character off either accepted size', () => {
    for (const mode of ['non-streaming', 'streaming'] as const) {
      const native = kimiSignature(mode);

      expect(isValidKimiThinkingSignature(native.slice(0, -1))).toBe(false);
      expect(isValidKimiThinkingSignature(`${native}A`)).toBe(false);
    }
  });

  it('should refuse whitespace, padding, and characters outside base64', () => {
    const native = kimiSignature('streaming');

    for (const malformed of [
      '',
      '   ',
      ` ${native}`,
      `${native} `,
      `${native.slice(0, -2)}==`,
      `${native.slice(0, -1)}!`,
      `claude#${native}`,
    ]) {
      expect(isValidKimiThinkingSignature(malformed)).toBe(false);
    }
  });

  it('should refuse a same-length filler that carries no entropy', () => {
    for (const length of [KIMI_SIGNATURE_STREAMING_LENGTH, KIMI_SIGNATURE_NON_STREAMING_LENGTH]) {
      expect(isValidKimiThinkingSignature('A'.repeat(length))).toBe(false);
    }
  });
});

function kimiSignature(mode: 'non-streaming' | 'streaming'): string {
  const decodedLength = mode === 'non-streaming' ? 9709 : 3255;
  const bytes = Buffer.alloc(decodedLength);
  let filled = 0;
  let counter = 0;

  while (filled < decodedLength) {
    const block = createHash('sha256')
      .update(`kimi-${mode}-${String(counter++)}`)
      .digest();
    const taken = Math.min(block.length, decodedLength - filled);

    block.copy(bytes, filled, 0, taken);
    filled += taken;
  }

  return bytes.toString('base64').replace(/=+$/u, '');
}
