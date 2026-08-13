import { describe, expect, it } from 'vitest';

import {
  decideSignatureCompatibility,
  detectSignatureProvider,
  signatureProviderFromModelName,
} from './signature-compatibility';

const A_CLAUDE_SIGNATURE = classicClaudeSignature();

describe('reading a signature provider from a model name', () => {
  it('should name the family every served model belongs to', () => {
    for (const [model, provider] of [
      ['kimi-k3', 'kimi'],
      ['kimi-k2.7-code-highspeed', 'kimi'],
      ['k3', 'kimi'],
      ['k2-thinking', 'kimi'],
      ['moonshot-v1-128k', 'kimi'],
      ['grok-4.5', 'grok'],
      ['grok-code-fast-1', 'grok'],
      ['claude-opus-5', 'claude'],
      ['gemini-3.6-flash', 'gemini'],
      ['gpt-5.6-sol', 'gpt'],
    ] as const) {
      expect(signatureProviderFromModelName(model)).toBe(provider);
    }
  });

  it('should leave a model it cannot place unknown', () => {
    expect(signatureProviderFromModelName('llama-4')).toBe('unknown');
  });
});

describe('detecting the provider a signature came from', () => {
  it('should never classify a value as Grok, whose blobs describe nothing', () => {
    expect(detectSignatureProvider('a'.repeat(200))).toBe('unknown');
  });

  it('should reach a self-describing envelope before the Kimi length probe', () => {
    expect(detectSignatureProvider(A_CLAUDE_SIGNATURE)).toBe('claude');
  });
});

describe('deciding what to do with a signature crossing into a target', () => {
  it('should drop the signature but keep the block for a Kimi target', () => {
    const decision = decideSignatureCompatibility('kimi', A_CLAUDE_SIGNATURE);

    expect(decision.compatible).toBe(false);
    expect(decision.action).toBe('drop-signature');
  });

  it('should drop the whole block for a Grok target', () => {
    const decision = decideSignatureCompatibility('grok', A_CLAUDE_SIGNATURE);

    expect(decision.compatible).toBe(false);
    expect(decision.action).toBe('drop-block');
  });

  it('should preserve a signature the target itself produced', () => {
    const decision = decideSignatureCompatibility('claude', A_CLAUDE_SIGNATURE);

    expect(decision.compatible).toBe(true);
    expect(decision.action).toBe('preserve');
  });
});

function varint(value: number): Buffer {
  const bytes: number[] = [];
  let remaining = value;

  while (remaining > 0x7f) {
    bytes.push((remaining & 0x7f) | 0x80);
    remaining >>>= 7;
  }

  bytes.push(remaining);

  return Buffer.from(bytes);
}

function varintField(number: number, value: number): Buffer {
  return Buffer.concat([varint(number * 8), varint(value)]);
}

function bytesField(number: number, value: Uint8Array): Buffer {
  return Buffer.concat([varint(number * 8 + 2), varint(value.length), value]);
}

function classicClaudeSignature(): string {
  const channel = Buffer.concat([varintField(1, 12), varintField(2, 2)]);
  const container = bytesField(1, channel);
  const payload = Buffer.concat([bytesField(2, container), varintField(3, 1)]);

  return payload.toString('base64');
}
