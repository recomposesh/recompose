import { afterEach, expect, test, vi } from 'vitest';

import { loopbackOverrideOrNull } from './loopback-override';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

test('a variable nobody set names no stand-in, so the vendor keeps the call', () => {
  expect(loopbackOverrideOrNull('RECOMPOSE_PRICE_ORIGIN', undefined)).toBeNull();
});

test('every spelling of this machine is honored, because a scenario picks its own', () => {
  for (const origin of ['http://localhost:9000', 'http://127.0.0.1:9000', 'http://[::1]:9000']) {
    expect(loopbackOverrideOrNull('RECOMPOSE_PRICE_ORIGIN', origin)).toBe(origin);
  }
});

test('an origin off this machine is refused, so nothing quietly reaches a stranger', () => {
  const said = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  expect(loopbackOverrideOrNull('RECOMPOSE_PRICE_ORIGIN', 'https://evil.example')).toBeNull();
  expect(said).toHaveBeenCalledWith(
    'recompose ignored RECOMPOSE_PRICE_ORIGIN, because it does not name a loopback host.',
  );
});

test('a value no parser can read is refused rather than joined onto a call', () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);

  expect(loopbackOverrideOrNull('RECOMPOSE_PRICE_ORIGIN', 'not an address')).toBeNull();
});
