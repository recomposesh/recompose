import type { CredentialedAccount, GatewayConfig } from '@recompose/contracts';

import { ACCOUNTS_VERSION, defaultSettings } from '@recompose/contracts';
import { expect, fn, screen, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { gatewaySeed } from '../../../../shared/testing';
import { claudePlan, ollama, openrouter } from '../../testing/found-source';
import { onAStepSurface } from '../../testing/on-a-surface';
import { BuildingStanding } from './building-standing';

const fresh = { ...defaultSettings(), setupWizardSettled: false };

const connected: CredentialedAccount = {
  id: openrouter.id,
  provider: openrouter.provider,
  kind: 'aggregator',
  label: 'OpenRouter',
  credentialRef: 'c1',
  keyTail: '9e2f',
};

/** A machine that already ran setup once, and one that ran it twice. */
const namesakes = [
  gatewaySeed({ slug: 'my-gateway', displayName: 'My Gateway', port: 51234 }),
  gatewaySeed({ slug: 'my-gateway-2', displayName: 'My Gateway 2', port: 51235 }),
];

function overAConnectedAccount(gateways: readonly GatewayConfig[]) {
  return {
    bridge: {
      accounts: { schemaVersion: ACCOUNTS_VERSION, accounts: [connected] },
      gateways,
      providerModels: { [connected.id]: ['anthropic/claude-opus-5'] },
      settings: fresh,
    },
  };
}

async function pointHarnessesAtIt(): Promise<void> {
  await userEvent.click(await screen.findByRole('button', { name: 'Point your harnesses at it' }));
}

const meta = preview.meta({
  component: BuildingStanding,
  args: {
    harnesses: new Set(['claude-code']),
    isMarked: (source) => source.id !== '',
    onBack: () => undefined,
    onBuilt: fn(),
    onSkip: () => undefined,
  },
  parameters: { bridge: { gateways: [], settings: fresh } },
  decorators: [onAStepSurface],
});

/** A machine holding nothing reports no accounts, and the run has only its own work left. */
export const NothingRecorded = meta.story({
  play: async () => {
    await expect(await screen.findByText(/Composing claude-my-model/u)).toBeVisible();
    await expect(await screen.findByText('Creating your gateway')).toBeVisible();
  },
});

/** Every account the sources step recorded reads as finished before the run's own work. */
export const AccountsAlreadyRecorded = meta.story({
  args: { isMarked: (source) => source.id === claudePlan.id || source.id === ollama.id },
  play: async () => {
    await expect(await screen.findByText('Creating your gateway')).toBeVisible();
  },
});

/** A run over a connected account opens the gateway under the plain name and moves on. */
export const OverAConnectedAccount = meta.story({
  args: { isMarked: (source) => source.id === openrouter.id },
  parameters: overAConnectedAccount([]),
  play: async ({ args }) => {
    await pointHarnessesAtIt();

    await expect(args.onBuilt).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'My Gateway' }),
    );
  },
});

/** A machine already holding the plain name gets the next one, rather than a refusal to read. */
export const CountsPastAStoredName = meta.story({
  args: { isMarked: (source) => source.id === openrouter.id },
  parameters: overAConnectedAccount(namesakes.slice(0, 1)),
  play: async ({ args }) => {
    await pointHarnessesAtIt();

    await expect(args.onBuilt).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'My Gateway 2' }),
    );
  },
});

/** It keeps counting past every name stored, however many attempts a person has left behind. */
export const CountsPastEveryStoredName = meta.story({
  args: { isMarked: (source) => source.id === openrouter.id },
  parameters: overAConnectedAccount(namesakes),
  play: async ({ args }) => {
    await pointHarnessesAtIt();

    await expect(args.onBuilt).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'My Gateway 3' }),
    );
  },
});

/** A source the recording never produced is left out, so the run writes no target to match. */
export const AMachineRowNeverBecomesATarget = meta.story({
  args: { isMarked: (source) => source.id === claudePlan.id },
  parameters: overAConnectedAccount([]),
  play: async ({ args }) => {
    await expect(await screen.findByText('Creating your gateway')).toBeVisible();
    await expect(args.onBuilt).not.toHaveBeenCalled();
  },
});
