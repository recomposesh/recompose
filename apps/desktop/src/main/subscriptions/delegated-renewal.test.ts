import { describe, expect, test } from 'vitest';

import type { RenewalRun } from './delegated-renewal';

import { delegatedRenewal } from './delegated-renewal';

function aTool(over: Partial<RenewalRun> = {}) {
  const runs: string[] = [];

  return {
    runs,
    run: {
      toolFile: async () => Promise.resolve('/usr/local/bin/claude'),
      stale: async () => Promise.resolve(runs.length === 0),
      renew: async (binary: string, args: readonly string[]) => {
        runs.push([binary, ...args].join(' '));

        return Promise.resolve();
      },
      ...over,
    },
  };
}

describe('renewing a credential the provider tool owns', () => {
  test('given a tool that renews, the run reports the store was freshened', async () => {
    const { run, runs } = aTool();

    await expect(delegatedRenewal('anthropic', run)).resolves.toEqual({ verdict: 'renewed' });
    expect(runs).toEqual(['/usr/local/bin/claude auth status']);
  });

  test('given two asks at once, the tool runs once and both hear the same answer', async () => {
    const { run, runs } = aTool();
    const renew = delegatedRenewal.bind(null, 'anthropic', run);

    const [first, second] = await Promise.all([renew(), renew()]);

    expect(runs).toHaveLength(1);
    expect([first, second]).toEqual([{ verdict: 'renewed' }, { verdict: 'renewed' }]);
  });

  test('given the tool renews behind a named run, that run is the one spawned', async () => {
    const { run, runs } = aTool();

    await delegatedRenewal('anthropic', run);

    expect(runs).toEqual(['/usr/local/bin/claude auth status']);
  });

  test('given the store already freshened, the tool is never run again', async () => {
    const { run, runs } = aTool({ stale: async () => Promise.resolve(false) });

    await expect(delegatedRenewal('anthropic', run)).resolves.toEqual({ verdict: 'renewed' });
    expect(runs).toEqual([]);
  });
});

describe('a renewal that cannot happen', () => {
  test('given the tool is gone, the run reports it rather than pretending', async () => {
    const { run, runs } = aTool({ toolFile: async () => Promise.resolve(null) });

    await expect(delegatedRenewal('anthropic', run)).resolves.toEqual({ verdict: 'tool-missing' });
    expect(runs).toEqual([]);
  });

  test('given the run fails, the outcome names the failure and nothing is deleted', async () => {
    const { run } = aTool({
      renew: async () => Promise.reject(new Error('the tool exited 1')),
    });

    await expect(delegatedRenewal('anthropic', run)).resolves.toMatchObject({
      verdict: 'run-failed',
    });
  });

  test('given a run that fails, a later ask still tries again rather than staying poisoned', async () => {
    let attempts = 0;
    const run: RenewalRun = {
      toolFile: async () => Promise.resolve('/usr/local/bin/claude'),
      stale: async () => Promise.resolve(true),
      renew: async () => {
        attempts += 1;

        return attempts === 1 ? Promise.reject(new Error('first run broke')) : Promise.resolve();
      },
    };

    await delegatedRenewal('anthropic', run);

    await expect(delegatedRenewal('anthropic', run)).resolves.toEqual({ verdict: 'renewed' });
  });

  test('given the plan no tool signs into, nothing is spawned and no table is read', async () => {
    const { run, runs } = aTool();

    await expect(delegatedRenewal('copilot', run)).resolves.toEqual({
      verdict: 'no-headless-run',
    });
    expect(runs).toEqual([]);
  });

  test('given a tool that names no run, the outcome says so and nothing is spawned', async () => {
    const { run, runs } = aTool();

    await expect(delegatedRenewal('openai', run)).resolves.toEqual({
      verdict: 'no-headless-run',
    });
    expect(runs).toEqual([]);
  });
});
