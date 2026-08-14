import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  GATEWAY_API_KEY_PREFIX,
  gatewayApiKeySchema,
  maskGatewayApiKey,
  mintGatewayApiKey,
} from './gateway-api-key';
import {
  GATEWAY_CONFIG_VERSION,
  type GatewayConfig,
  enforcedApiKey,
  withGatewayApiKey,
} from './gateway-config';

const KEY_BYTES = 32;

afterEach(() => {
  vi.restoreAllMocks();
});

function storedGateway(): GatewayConfig {
  return {
    schemaVersion: GATEWAY_CONFIG_VERSION,
    slug: 'my-gateway',
    displayName: 'My Gateway',
    port: 8397,
    virtualModels: [],
    layout: { nodes: {} },
  };
}

describe('the key a gateway hands its callers', () => {
  test('a minted key announces itself as a recompose value', () => {
    expect(mintGatewayApiKey().startsWith(GATEWAY_API_KEY_PREFIX)).toBe(true);
  });

  test('a minted key carries 43 characters of randomness, which is past 128 bits', () => {
    expect(mintGatewayApiKey().slice(GATEWAY_API_KEY_PREFIX.length)).toHaveLength(43);
  });

  test('a minted key spells its randomness in an alphabet every wire carries unescaped', () => {
    expect(mintGatewayApiKey().slice(GATEWAY_API_KEY_PREFIX.length)).toMatch(/^[A-Za-z0-9_-]+$/u);
  });

  test('two mints never answer the same key', () => {
    expect(mintGatewayApiKey()).not.toBe(mintGatewayApiKey());
  });

  test('bytes that spell every slash come back as underscores, at full width', () => {
    const everySlash = new Uint8Array(KEY_BYTES).fill(0xff);

    vi.spyOn(globalThis.crypto, 'getRandomValues').mockReturnValue(everySlash);

    const body = mintGatewayApiKey().slice(GATEWAY_API_KEY_PREFIX.length);

    expect(body).toHaveLength(43);
    expect(body).toContain('_');
  });

  test('bytes that spell every plus come back as dashes, at full width', () => {
    const everyPlus = Uint8Array.from(
      { length: KEY_BYTES },
      (_unused, index) => [0xfb, 0xef, 0xbe][index % 3] ?? 0,
    );

    vi.spyOn(globalThis.crypto, 'getRandomValues').mockReturnValue(everyPlus);

    const body = mintGatewayApiKey().slice(GATEWAY_API_KEY_PREFIX.length);

    expect(body).toHaveLength(43);
    expect(body).toContain('-');
  });

  test('a minted key is one the stored shape accepts', () => {
    const minted = mintGatewayApiKey();

    expect(gatewayApiKeySchema.parse({ value: minted, required: true })).toEqual({
      value: minted,
      required: true,
    });
  });

  test('a blank key is not a key', () => {
    expect(() => gatewayApiKeySchema.parse({ value: '   ', required: true })).toThrow();
  });

  test('a key without the answer to whether it is required is not storable', () => {
    expect(() => gatewayApiKeySchema.parse({ value: 'rc-local-abc' })).toThrow();
  });
});

const HIDDEN = '••••••••';

const LONG_BODY = 'abcdefghijkl';

const OWN_KEY = 'someonesOwnKeyValue';

describe('the mask a screen shows in place of the key', () => {
  test('the mask keeps the prefix, which names the value rather than revealing it', () => {
    expect(maskGatewayApiKey(`${GATEWAY_API_KEY_PREFIX}${LONG_BODY}`)).toContain(
      GATEWAY_API_KEY_PREFIX,
    );
  });

  test('the mask ends in the last four characters, so a person can tell two keys apart', () => {
    const masked = maskGatewayApiKey(`${GATEWAY_API_KEY_PREFIX}${LONG_BODY}`);

    expect(masked.endsWith(LONG_BODY.slice(-4))).toBe(true);
  });

  test('the mask hides everything between the prefix and those four', () => {
    expect(maskGatewayApiKey(`${GATEWAY_API_KEY_PREFIX}${LONG_BODY}`)).toBe(
      `${GATEWAY_API_KEY_PREFIX}${HIDDEN}${LONG_BODY.slice(-4)}`,
    );
  });

  test('a key too short to hide eight characters shows no tail at all', () => {
    expect(maskGatewayApiKey(`${GATEWAY_API_KEY_PREFIX}abcd`)).toBe(
      `${GATEWAY_API_KEY_PREFIX}${HIDDEN}`,
    );
  });

  test('a hand-written key carrying no prefix claims none', () => {
    expect(maskGatewayApiKey(OWN_KEY)).toBe(`${HIDDEN}${OWN_KEY.slice(-4)}`);
  });

  test('a minted key never reads back through its own mask', () => {
    const minted = mintGatewayApiKey();

    expect(maskGatewayApiKey(minted)).not.toBe(minted);
  });
});

describe('putting a key on a stored gateway and taking one off', () => {
  test('a gateway stores the key it was handed, and requires it', () => {
    expect(
      withGatewayApiKey(storedGateway(), { value: 'rc-local-abcdef', required: true }),
    ).toEqual({ ...storedGateway(), apiKey: { value: 'rc-local-abcdef', required: true } });
  });

  test('turning the requirement off keeps the value the clients already carry', () => {
    const required = withGatewayApiKey(storedGateway(), {
      value: 'rc-local-abcdef',
      required: true,
    });

    expect(
      withGatewayApiKey(required, { value: 'rc-local-abcdef', required: false }).apiKey,
    ).toEqual({ value: 'rc-local-abcdef', required: false });
  });

  test('a replacement key leaves no trace of the one before it', () => {
    const first = withGatewayApiKey(storedGateway(), { value: 'rc-local-first', required: true });

    expect(withGatewayApiKey(first, { value: 'rc-local-second', required: true }).apiKey).toEqual({
      value: 'rc-local-second',
      required: true,
    });
  });

  test('taking the key off drops the field rather than leaving it undefined', () => {
    const held = withGatewayApiKey(storedGateway(), { value: 'rc-local-abcdef', required: true });

    expect('apiKey' in withGatewayApiKey(held, undefined)).toBe(false);
  });

  test('the rewrite leaves every other stored value alone', () => {
    expect(
      withGatewayApiKey(storedGateway(), { value: 'rc-local-abcdef', required: true }),
    ).toMatchObject({ slug: 'my-gateway', displayName: 'My Gateway', port: 8397 });
  });

  test('a gateway carrying a key still parses under the stored shape', () => {
    const held = withGatewayApiKey(storedGateway(), { value: 'rc-local-abcdef', required: true });

    expect(() => gatewayApiKeySchema.parse(held.apiKey)).not.toThrow();
  });
});

describe('which key the engine is allowed to enforce', () => {
  test('a required key reaches the engine', () => {
    const held = withGatewayApiKey(storedGateway(), { value: 'rc-local-abcdef', required: true });

    expect(enforcedApiKey(held)).toBe('rc-local-abcdef');
  });

  test('a stored key the gateway no longer requires reaches nothing', () => {
    const held = withGatewayApiKey(storedGateway(), { value: 'rc-local-abcdef', required: false });

    expect(enforcedApiKey(held)).toBeUndefined();
  });

  test('a gateway that never minted a key reaches nothing', () => {
    expect(enforcedApiKey(storedGateway())).toBeUndefined();
  });
});
