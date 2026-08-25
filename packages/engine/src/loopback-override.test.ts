import { afterEach, expect, test, vi } from 'vitest';

import { controlPlaneUrl } from './loopback-override';

const VENDOR = 'https://api.anthropic.com/api/oauth/profile';

afterEach(() => {
  vi.unstubAllEnvs();
});

test('a control-plane call reaches the vendor while no stand-in is named', () => {
  expect(controlPlaneUrl(VENDOR)).toBe(VENDOR);
});

test('the stand-in the control origin names takes the call, keeping the vendor path', () => {
  vi.stubEnv('RECOMPOSE_CONTROL_ORIGIN', 'http://127.0.0.1:7788');

  expect(controlPlaneUrl(VENDOR)).toBe('http://127.0.0.1:7788/api/oauth/profile');
});

test('no other variable stands in, so one scenario cannot redirect another vendor call', () => {
  vi.stubEnv('RECOMPOSE_PROBE_ORIGIN', 'http://127.0.0.1:7788');

  expect(controlPlaneUrl(VENDOR)).toBe(VENDOR);
});
