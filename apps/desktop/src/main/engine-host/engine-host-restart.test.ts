import {
  type EngineGateway,
  type EngineStates,
  type GatewayEngineState,
} from '@recompose/contracts';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { createEngineHost, DIRECTIVE_TIMEOUT_MS } from './engine-host';
import { grantsNothing, scriptedChild } from './engine-host.testkit';

const codex: EngineGateway = { slug: 'codex', displayName: 'Codex', port: 8397, virtualModels: [] };

const running: GatewayEngineState = { status: 'running' };

const stopped: GatewayEngineState = { status: 'stopped' };

/**
 * A child that answers each directive with the next word handed to it, and silence past the last.
 *
 * @summary A restart is two directives deep, so a scenario about one of its halves going
 * unanswered has to say which half, which one answer for every directive cannot.
 */
function answering(...words: readonly (GatewayEngineState | null)[]) {
  const queue = [...words];

  return () => queue.shift() ?? null;
}

/**
 * Watches a restart's refusal the moment it begins, without standing between it and its scenario.
 *
 * @summary The clock is wound forward after the act begins, so a refusal lands before a scenario
 * could reach for it, and a rejection nothing was watching would fail the run rather than the
 * assertion it belongs to.
 */
function watchTheRefusal(restarting: Promise<GatewayEngineState>): void {
  restarting.catch(() => undefined);
}

function aHostWatchingStates(...words: readonly (GatewayEngineState | null)[]) {
  const scripted = scriptedChild(answering(...words));
  const heard: EngineStates[] = [];
  const host = createEngineHost({
    knownSlugs: ['codex'],
    grantFor: grantsNothing,
    spawnChild: () => scripted.child,
  });

  host.onStatesChanged((states) => {
    heard.push(states);
  });

  return { heard, host };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('a restart that comes back up', () => {
  test('the gateway never reads as stopped in between, so a save makes nothing blink', async () => {
    const { host, heard } = aHostWatchingStates(running, stopped, running);

    await host.start(codex);
    await host.restart(codex);

    expect(heard).toEqual([{ codex: running }, { codex: running }]);
  });

  test('the gateway is left serving, which is the whole of what a restart is for', async () => {
    const { host } = aHostWatchingStates(running, stopped, running);

    await host.start(codex);
    await host.restart(codex);

    expect(host.states()).toEqual({ codex: running });
  });
});

describe('a restart that never comes back up', () => {
  test('the gateway reads as stopped, so no window says it serves while nothing listens', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.useFakeTimers();
    const { host } = aHostWatchingStates(running, stopped, null);

    await host.start(codex);
    const restarting = host.restart(codex);

    watchTheRefusal(restarting);

    await vi.advanceTimersByTimeAsync(DIRECTIVE_TIMEOUT_MS);
    await restarting.catch(() => undefined);

    expect(host.states()).toEqual({ codex: stopped });
  });

  test('every window hears it, because the outcome reaches the screen rather than the log alone', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.useFakeTimers();
    const { heard, host } = aHostWatchingStates(running, stopped, null);

    await host.start(codex);
    const restarting = host.restart(codex);

    watchTheRefusal(restarting);

    await vi.advanceTimersByTimeAsync(DIRECTIVE_TIMEOUT_MS);
    await restarting.catch(() => undefined);

    expect(heard.at(-1)).toEqual({ codex: stopped });
  });

  test('the caller is refused too, so a lane holding the gateway learns it as well', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.useFakeTimers();
    const { host } = aHostWatchingStates(running, stopped, null);

    await host.start(codex);
    const restarting = host.restart(codex);

    watchTheRefusal(restarting);

    await vi.advanceTimersByTimeAsync(DIRECTIVE_TIMEOUT_MS);

    await expect(restarting).rejects.toThrow(/"codex"/);
  });
});

describe('a restart no half of which is answered', () => {
  test('the gateway still reads as stopped, rather than as still serving', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.useFakeTimers();
    const { host } = aHostWatchingStates(running, null, null);

    await host.start(codex);
    const restarting = host.restart(codex);

    watchTheRefusal(restarting);

    await vi.advanceTimersByTimeAsync(DIRECTIVE_TIMEOUT_MS * 2);
    await restarting.catch(() => undefined);

    expect(host.states()).toEqual({ codex: stopped });
  });

  test('a later restart that works reads as running again, so no notice outlives its cause', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.useFakeTimers();
    const { host } = aHostWatchingStates(running, stopped, null, stopped, running);

    await host.start(codex);
    const failing = host.restart(codex);

    watchTheRefusal(failing);

    await vi.advanceTimersByTimeAsync(DIRECTIVE_TIMEOUT_MS);
    await failing.catch(() => undefined);

    const serving = host.restart(codex);

    watchTheRefusal(serving);

    await vi.advanceTimersByTimeAsync(DIRECTIVE_TIMEOUT_MS);
    await serving;

    expect(host.states()).toEqual({ codex: running });
  });
});

describe('a stop a person asked for', () => {
  test('reads as stopped straight away, because no restart stands over it', async () => {
    const { host, heard } = aHostWatchingStates(running, stopped);

    await host.start(codex);
    await host.stop('codex');

    expect(heard).toEqual([{ codex: running }, { codex: stopped }]);
  });
});
