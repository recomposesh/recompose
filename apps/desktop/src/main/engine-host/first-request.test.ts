import type { EngineTrafficReport } from '@recompose/contracts';

import { describe, expect, test, vi } from 'vitest';

import { noticingTheFirstServed } from './first-request';

const AT = 1_700_000_000_000;

function report(outcome: 'live' | 'served' | 'failed'): EngineTrafficReport {
  return {
    kind: 'traffic',
    slug: 'my-gateway',
    virtualModel: 'claude-my-model',
    routeNode: 'seat:1',
    request:
      outcome === 'failed'
        ? { outcome, at: AT, status: 401, detail: 'the provider turned the key away' }
        : { outcome, at: AT },
  };
}

describe('noticing the first request a gateway served', () => {
  test('a served outcome reports it', () => {
    const told = vi.fn<() => void>();

    noticingTheFirstServed(told)(report('served'));

    expect(told).toHaveBeenCalledOnce();
  });

  test('a request that reached a target and was turned away reports nothing', () => {
    const told = vi.fn<() => void>();
    const notice = noticingTheFirstServed(told);

    notice(report('failed'));

    expect(told).not.toHaveBeenCalled();
  });

  test('a request still answering reports nothing, because it has served nobody yet', () => {
    const told = vi.fn<() => void>();

    noticingTheFirstServed(told)(report('live'));

    expect(told).not.toHaveBeenCalled();
  });

  test('a live request that later serves reports once', () => {
    const told = vi.fn<() => void>();
    const notice = noticingTheFirstServed(told);

    notice(report('live'));
    notice(report('served'));

    expect(told).toHaveBeenCalledOnce();
  });

  test('the latch closes on the first served request and never reopens', () => {
    const told = vi.fn<() => void>();
    const notice = noticingTheFirstServed(told);

    notice(report('served'));
    notice(report('served'));
    notice(report('served'));

    expect(told).toHaveBeenCalledOnce();
  });

  test('a refusal after the first served request changes nothing', () => {
    const told = vi.fn<() => void>();
    const notice = noticingTheFirstServed(told);

    notice(report('served'));
    notice(report('failed'));

    expect(told).toHaveBeenCalledOnce();
  });
});
