import { fc, test } from '@fast-check/vitest';
import { describe, expect } from 'vitest';

import {
  GATEWAY_API_KEY_PREFIX,
  gatewayApiKeySchema,
  maskGatewayApiKey,
  mintGatewayApiKey,
} from './gateway-api-key';

const HIDDEN_CHARACTERS = 8;

const SHOWN_TAIL = 4;

const bodyArb = fc.stringMatching(/^[A-Za-z0-9_-]{0,60}$/u);

const keyArb = fc.oneof(
  bodyArb.map((body) => `${GATEWAY_API_KEY_PREFIX}${body}`),
  bodyArb.filter((body) => !body.startsWith(GATEWAY_API_KEY_PREFIX)),
);

const longBodyArb = fc.stringMatching(
  new RegExp(`^[A-Za-z0-9_-]{${String(HIDDEN_CHARACTERS + SHOWN_TAIL)},60}$`, 'u'),
);

const longKeyArb = fc.oneof(
  longBodyArb.map((body) => `${GATEWAY_API_KEY_PREFIX}${body}`),
  longBodyArb.filter((body) => !body.startsWith(GATEWAY_API_KEY_PREFIX)),
);

function bodyOf(key: string): string {
  return key.startsWith(GATEWAY_API_KEY_PREFIX) ? key.slice(GATEWAY_API_KEY_PREFIX.length) : key;
}

function revealedBodyOf(key: string): string {
  const mask = maskGatewayApiKey(key);
  const withoutPrefix = mask.startsWith(GATEWAY_API_KEY_PREFIX)
    ? mask.slice(GATEWAY_API_KEY_PREFIX.length)
    : mask;

  return withoutPrefix.replaceAll('•', '');
}

describe('the law every mask obeys, whatever the key', () => {
  test.prop([keyArb])('a mask reveals at most the last four characters of the key', (key) => {
    expect(revealedBodyOf(key).length).toBeLessThanOrEqual(SHOWN_TAIL);
  });

  test.prop([keyArb])('a mask never reads back as the key it stands for', (key) => {
    expect(maskGatewayApiKey(key)).not.toBe(key);
  });

  test.prop([keyArb])('whatever it reveals belongs to the end of the key', (key) => {
    expect(bodyOf(key).endsWith(revealedBodyOf(key))).toBe(true);
  });

  test.prop([longKeyArb])('a key long enough keeps at least eight characters hidden', (key) => {
    const body = bodyOf(key);

    expect(body.length - revealedBodyOf(key).length).toBeGreaterThanOrEqual(HIDDEN_CHARACTERS);
  });

  test.prop([keyArb])('a mask claims the prefix exactly when the key carries it', (key) => {
    expect(maskGatewayApiKey(key).startsWith(GATEWAY_API_KEY_PREFIX)).toBe(
      key.startsWith(GATEWAY_API_KEY_PREFIX),
    );
  });
});

describe('the law every minted key obeys', () => {
  test.prop([fc.integer({ min: 1, max: 12 })])(
    'every key a mint answers is one the stored shape accepts',
    (mints) => {
      const minted = Array.from({ length: mints }, () => mintGatewayApiKey());

      for (const value of minted) {
        expect(() => gatewayApiKeySchema.parse({ value, required: true })).not.toThrow();
      }
    },
  );

  test.prop([fc.integer({ min: 2, max: 12 })])('a run of mints repeats none of itself', (mints) => {
    const minted = Array.from({ length: mints }, () => mintGatewayApiKey());

    expect(new Set(minted).size).toBe(mints);
  });

  test.prop([fc.integer({ min: 1, max: 12 })])(
    'every minted key masks without revealing more than four of its characters',
    (mints) => {
      for (const value of Array.from({ length: mints }, () => mintGatewayApiKey())) {
        expect(revealedBodyOf(value).length).toBe(SHOWN_TAIL);
      }
    },
  );
});
