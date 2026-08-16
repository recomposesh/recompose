import type { AccountTransportPolicy, SubscriptionProviderId } from '@recompose/contracts';

import { describe, expect, it } from 'vitest';

import type { ClaudeProfile } from './claude-oauth-profile';

import { parseSubscriptionCredential } from './credentials';
import { readyClaudeIdentity } from './ready-claude-identity';

const anthropic: SubscriptionProviderId = 'anthropic';

function blobFor(accessToken: string): string {
  return JSON.stringify({ claudeAiOauth: { accessToken, refreshToken: 'refresh' } });
}

function readyFrom(blob: string) {
  const credential = parseSubscriptionCredential('anthropic', blob);

  if (credential === null) throw new Error('the test credential could not be read');

  return { blob, credential };
}

function heldProfiles() {
  const waiting: (() => void)[] = [];

  return {
    release: () => {
      for (const settle of waiting) settle();
    },
    fetchClaudeProfile: async (
      _accessToken: string,
      _policy?: AccountTransportPolicy,
    ): Promise<ClaudeProfile> => {
      await new Promise<void>((settle) => {
        waiting.push(settle);
      });

      throw new Error('the Claude profile lookup failed');
    },
  };
}

function runtimeWith(fetchClaudeProfile: ReturnType<typeof heldProfiles>['fetchClaudeProfile']) {
  return {
    persist: async () => {
      await Promise.resolve();
    },
    newClaudeDeviceId: () => 'a'.repeat(64),
    fetchClaudeProfile,
  };
}

describe('a Claude identity that cannot be initialized', () => {
  it('lets every waiting caller see the failure', async () => {
    const profiles = heldProfiles();
    const runtime = runtimeWith(profiles.fetchClaudeProfile);
    const spend = { provider: anthropic, accountId: 'racing-account' };
    const first = readyClaudeIdentity(spend, readyFrom(blobFor('token-one')), runtime);
    const second = readyClaudeIdentity(spend, readyFrom(blobFor('token-two')), runtime);

    profiles.release();

    await expect(first).rejects.toThrow('the Claude profile lookup failed');
    await expect(second).rejects.toThrow('the Claude profile lookup failed');
  });

  it('lets the next caller try again', async () => {
    const spend = { provider: anthropic, accountId: 'retrying-account' };
    const runtime = runtimeWith(async () => {
      await Promise.resolve();

      return { account: { uuid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } };
    });
    const ready = await readyClaudeIdentity(spend, readyFrom(blobFor('token-three')), runtime);

    expect(ready.credential.deviceIds).toEqual(['a'.repeat(64)]);
  });
});

describe('stamping an identity onto a credential the app does not own', () => {
  function runtimeCounting(kept: string[]) {
    return {
      persist: async (
        _provider: SubscriptionProviderId,
        _accountId: string,
        credential: string,
      ) => {
        kept.push(credential);

        await Promise.resolve();
      },
      newClaudeDeviceId: () => 'b'.repeat(64),
      fetchClaudeProfile: async () => {
        await Promise.resolve();

        return { account: { uuid: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' } };
      },
    };
  }

  it('serves the identified credential without keeping a copy of it', async () => {
    const kept: string[] = [];
    const spend = {
      provider: anthropic,
      accountId: 'adopted-account',
      renewal: 'owning-tool',
    } as const;
    const ready = await readyClaudeIdentity(
      spend,
      readyFrom(blobFor('token-adopted')),
      runtimeCounting(kept),
    );

    expect(ready.credential.deviceIds).toEqual(['b'.repeat(64)]);
    expect(kept).toEqual([]);
  });

  it('keeps the identified credential for an account the app signed in', async () => {
    const kept: string[] = [];
    const spend = { provider: anthropic, accountId: 'app-account', renewal: 'app' } as const;

    await readyClaudeIdentity(spend, readyFrom(blobFor('token-owned')), runtimeCounting(kept));

    expect(kept).toHaveLength(1);
  });
});

describe('a Claude credential blob that lost its OAuth tokens', () => {
  it('refuses to hand back an identity it cannot read', async () => {
    const spend = { provider: anthropic, accountId: 'lossy-account' };
    const runtime = runtimeWith(async () => {
      await Promise.resolve();

      return { account: { uuid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } };
    });
    const ready = { ...readyFrom(blobFor('token-four')), blob: JSON.stringify({ note: 'empty' }) };

    await expect(readyClaudeIdentity(spend, ready, runtime)).rejects.toThrow(
      'the identified subscription credential could not be read',
    );
  });
});
