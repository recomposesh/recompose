import type { MachineCredentialReading } from '@recompose/contracts';

import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { machineReadingQueryOptions } from './subscriptions';

const anAccountOnTheMachine: MachineCredentialReading = {
  holds: 'account',
  standing: 'connected',
  signedInAs: 'ada@ex.com',
};

function theBridgeAnswers(answer: unknown) {
  const detect = vi.fn(async () => Promise.resolve(answer));

  vi.stubGlobal('window', { recompose: { 'subscriptions:detect': detect } });

  return detect;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('asking what the provider tool left on this machine', () => {
  it('asks for the provider it was given and hands back what the machine holds', async () => {
    const detect = theBridgeAnswers({ ok: true, value: anAccountOnTheMachine });

    await expect(
      new QueryClient().ensureQueryData(machineReadingQueryOptions('anthropic')),
    ).resolves.toEqual(anAccountOnTheMachine);
    expect(detect).toHaveBeenCalledWith({ provider: 'anthropic' });
  });

  it('keys each provider apart, so one answer never stands for the other', () => {
    expect(machineReadingQueryOptions('anthropic').queryKey).not.toEqual(
      machineReadingQueryOptions('openai').queryKey,
    );
  });

  it('never asks again on a mount, because opening a store can raise a prompt', () => {
    const options = machineReadingQueryOptions('anthropic');

    expect(options.staleTime).toBe(Infinity);
    expect(options.refetchOnMount).toBe(false);
  });

  it('given a refusal, it travels rather than reading as a machine holding nothing', async () => {
    theBridgeAnswers({
      ok: false,
      error: { code: 'storage-failed', message: 'the store went away' },
    });

    await expect(
      new QueryClient().ensureQueryData(machineReadingQueryOptions('anthropic')),
    ).rejects.toThrow('the store went away');
  });
});
