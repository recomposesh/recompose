import { ACCOUNTS_VERSION, defaultSettings } from '@recompose/contracts';
import { expect, fn, screen } from 'storybook/test';

import preview from '#.storybook/preview';

import { openrouter } from '../../testing/found-source';
import { onAStepSurface } from '../../testing/on-a-surface';
import { ComposeStanding } from './compose-standing';

const fresh = { ...defaultSettings(), setupWizardSettled: false };

const connected = {
  id: openrouter.id,
  provider: openrouter.provider,
  kind: 'aggregator' as const,
  label: 'OpenRouter',
  credentialRef: 'c1',
  keyTail: '9e2f',
};

const meta = preview.meta({
  component: ComposeStanding,
  args: {
    harnesses: new Set(['claude-code']),
    isMarked: (source) => source.id === openrouter.id,
    onBack: fn(),
    onCreate: fn(),
    onSkip: fn(),
  },
  parameters: {
    bridge: {
      accounts: { schemaVersion: ACCOUNTS_VERSION, accounts: [connected] },
      providerModels: { [connected.id]: ['anthropic/claude-opus-5'] },
      settings: fresh,
    },
  },
  decorators: [onAStepSurface],
});

/** The plan the marked sources add up to, drawn before anything is built. */
export const OverAMarkedSource = meta.story({
  play: async () => {
    await expect(await screen.findByText('My Gateway')).toBeVisible();
    await expect(await screen.findByText('claude-my-model')).toBeVisible();
  },
});

/** The target's model comes from the account's own listing rather than a name recompose carries. */
export const TheModelComesFromTheListing = meta.story({
  play: async () => {
    await expect(await screen.findByText('anthropic/claude-opus-5')).toBeVisible();
  },
});

/** Nothing marked leaves the router with no target, and the step says so rather than inventing one. */
export const NothingMarked = meta.story({
  args: { isMarked: () => false },
  play: async () => {
    await expect(await screen.findByText('My Gateway')).toBeVisible();
    await expect(screen.queryByText('anthropic/claude-opus-5')).toBeNull();
  },
});
