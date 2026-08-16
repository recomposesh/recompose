import type { SubscriptionProviderId } from '@recompose/contracts';

import { mkdir, realpath, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const PENDING = 'pending';
const ACTIVE = 'active';

const codexSeededConfig = 'cli_auth_credentials_store = "file"\n';

/**
 * @summary An empty config home reads to Claude Code as a first run, so the tool asks its
 * onboarding questions before it reaches the sign-in. Answering them here leaves the person
 * the sign-in and nothing else.
 */
const claudeCodeSeededConfig = `${JSON.stringify(
  { hasCompletedOnboarding: true, hasTrustDialogAccepted: true },
  null,
  2,
)}\n`;

export type SubscriptionHomes = {
  homeFor: (provider: SubscriptionProviderId, id: string) => string;
  pendingHomeFor: (provider: SubscriptionProviderId) => string;
  activePointerFor: (provider: SubscriptionProviderId) => string;
  resetPending: (provider: SubscriptionProviderId) => Promise<string>;
  promotePending: (provider: SubscriptionProviderId, id: string) => Promise<string>;
  removeHome: (provider: SubscriptionProviderId, id: string) => Promise<void>;
  pointActiveAt: (provider: SubscriptionProviderId, id: string) => Promise<void>;
  clearActive: (provider: SubscriptionProviderId) => Promise<void>;
  readActive: (provider: SubscriptionProviderId) => Promise<string | null>;
  healActive: (
    provider: SubscriptionProviderId,
    survivors: readonly string[],
  ) => Promise<string | null>;
};

async function seedConfigHome(provider: SubscriptionProviderId, home: string): Promise<void> {
  if (provider === 'openai') {
    await writeFile(join(home, 'config.toml'), codexSeededConfig, 'utf8');
  }

  if (provider === 'anthropic') {
    await writeFile(join(home, '.claude.json'), claudeCodeSeededConfig, 'utf8');
  }
}

async function freshPending(folder: string, provider: SubscriptionProviderId): Promise<string> {
  const pending = join(folder, PENDING);

  await rm(pending, { recursive: true, force: true });
  await mkdir(pending, { recursive: true });
  await seedConfigHome(provider, pending);

  return pending;
}

async function adoptPending(folder: string, home: string): Promise<string> {
  await rm(home, { recursive: true, force: true });
  await rename(join(folder, PENDING), home);

  return home;
}

function healer(
  readActive: SubscriptionHomes['readActive'],
  pointActiveAt: SubscriptionHomes['pointActiveAt'],
  clearActive: SubscriptionHomes['clearActive'],
): SubscriptionHomes['healActive'] {
  return async (provider, survivors) => {
    const standing = await readActive(provider);

    if (standing !== null && survivors.includes(standing)) {
      return standing;
    }

    const heir = survivors[0];

    if (heir === undefined) {
      await clearActive(provider);

      return null;
    }

    await pointActiveAt(provider, heir);

    return heir;
  };
}

export function subscriptionHomes(
  userDataPath: string,
  platform: NodeJS.Platform,
): SubscriptionHomes {
  const pointerKind = platform === 'win32' ? 'junction' : 'dir';
  const providerFolder = (provider: SubscriptionProviderId): string =>
    join(userDataPath, 'subscriptions', provider);

  const homeFor: SubscriptionHomes['homeFor'] = (provider, id) =>
    join(providerFolder(provider), id);
  const activePointerFor: SubscriptionHomes['activePointerFor'] = (provider) =>
    join(providerFolder(provider), ACTIVE);

  const clearActive: SubscriptionHomes['clearActive'] = async (provider) => {
    await rm(activePointerFor(provider), { recursive: true, force: true });
  };

  const pointActiveAt: SubscriptionHomes['pointActiveAt'] = async (provider, id) => {
    await mkdir(providerFolder(provider), { recursive: true });
    await clearActive(provider);
    await symlink(homeFor(provider, id), activePointerFor(provider), pointerKind);
  };

  const readActive: SubscriptionHomes['readActive'] = async (provider) =>
    realpath(activePointerFor(provider)).then(
      (resolved) => basename(resolved),
      () => null,
    );

  return {
    homeFor,
    activePointerFor,
    clearActive,
    pointActiveAt,
    readActive,

    pendingHomeFor: (provider) => join(providerFolder(provider), PENDING),

    resetPending: async (provider) => freshPending(providerFolder(provider), provider),

    promotePending: async (provider, id) =>
      adoptPending(providerFolder(provider), homeFor(provider, id)),

    removeHome: async (provider, id) => {
      await rm(homeFor(provider, id), { recursive: true, force: true });
    },

    healActive: healer(readActive, pointActiveAt, clearActive),
  };
}
