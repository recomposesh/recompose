import { afterEach, expect, test, vi } from 'vitest';

import { priceAddressBehindTheStandIn } from './price-origin';

const VENDOR = 'https://models.dev/api.json';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

test('a price lookup reaches the vendor while no stand-in is named', () => {
  expect(priceAddressBehindTheStandIn(VENDOR)).toBe(VENDOR);
});

test('the stand-in on this machine takes the call, and the vendor path rides along', () => {
  vi.stubEnv('RECOMPOSE_PRICE_ORIGIN', 'http://127.0.0.1:9412');

  expect(priceAddressBehindTheStandIn(VENDOR)).toBe('http://127.0.0.1:9412/api.json');
});

test('a stand-in off this machine is refused, and the refusal names the variable', () => {
  const said = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  vi.stubEnv('RECOMPOSE_PRICE_ORIGIN', 'https://prices.example');

  expect(priceAddressBehindTheStandIn(VENDOR)).toBe(VENDOR);
  expect(said).toHaveBeenCalledWith(
    'recompose ignored RECOMPOSE_PRICE_ORIGIN, because it does not name a loopback host.',
  );
});

test('no other variable redirects a price lookup', () => {
  vi.stubEnv('RECOMPOSE_CONTROL_ORIGIN', 'http://127.0.0.1:9412');

  expect(priceAddressBehindTheStandIn(VENDOR)).toBe(VENDOR);
});
