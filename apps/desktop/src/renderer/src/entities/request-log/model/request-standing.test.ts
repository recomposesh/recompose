import type { LogRow } from '@recompose/contracts';

import { expect, test } from 'vitest';

import { requestFailed, requestInFlight } from './request-standing';

const CLIENT_KEY = `sha256:${'a'.repeat(64)}`;

type RowStanding = {
  status?: number;
  origin?: LogRow['origin'];
  durationMs?: number | undefined;
};

function row(id: string, standing: RowStanding): LogRow {
  const { status = 200, origin = 'provider', ...took } = standing;

  return {
    id,
    at: 0,
    gateway: 'main',
    origin,
    method: 'POST',
    status,
    durationMs: 12,
    clientKey: CLIENT_KEY,
    ...took,
  };
}

function stillRunning(logged: LogRow): LogRow {
  const { durationMs: _stillRunning, ...rest } = logged;

  return rest;
}

test('a provider response without a duration yet stands in flight', () => {
  expect(requestInFlight(stillRunning(row('running', {})))).toBe(true);
});

test('a provider response with its duration measured has landed', () => {
  expect(requestInFlight(row('landed', {}))).toBe(false);
});

test('a request the gateway raised is never in flight, because it already answered', () => {
  expect(requestInFlight(stillRunning(row('refused', { origin: 'gateway', status: 502 })))).toBe(
    false,
  );
});

test('a request answered at 400 reads as failed and one answered at 399 does not', () => {
  expect(requestFailed(row('refused', { status: 400 }))).toBe(true);
  expect(requestFailed(row('redirected', { status: 399 }))).toBe(false);
});

test('a failing status still in flight does not read as failed until the answer lands', () => {
  expect(requestFailed(stillRunning(row('running', { status: 502 })))).toBe(false);
});

test('a gateway-raised failure reads as failed the moment it lands as a row', () => {
  expect(requestFailed(row('raised', { origin: 'gateway', status: 502 }))).toBe(true);
});
