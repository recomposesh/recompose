import type { CredentialedAccount, GatewayConfig } from '@recompose/contracts';

import { ACCOUNTS_VERSION, defaultSettings } from '@recompose/contracts';
import { expect, fn, screen, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { gatewaySeed } from '../../../../shared/testing';
import { claudePlan, openrouter } from '../../testing/found-source';
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

/**
 * A machine holding nothing says so, rather than turning on a run it can never open.
 *
 * @summary A run with no connected source has nothing to ask and nothing to route to, so the
 * reading refuses before it asks anything. Left as a wait it turned forever, on a step whose acts
 * only arrive with an outcome, and the surface offered a person nothing but leaving setup.
 */
export const NothingRecorded = meta.story({
  play: async () => {
    await expect(
      await screen.findByText('No source is connected yet. Go back and connect one.'),
    ).toBeVisible();
    await expect(await screen.findByRole('button', { name: 'Back' })).toBeVisible();
  },
});

/** Every account the sources step recorded reads as finished before the run's own work. */
export const AccountsAlreadyRecorded = meta.story({
  args: { isMarked: (source) => source.id === openrouter.id },
  parameters: overAConnectedAccount([]),
  play: async () => {
    await expect(await screen.findByText('OpenRouter connected')).toBeVisible();
    await expect(await screen.findByText('Creating your gateway')).toBeVisible();
  },
});

/**
 * An account that answers nothing about its models stops the run and offers the way out.
 *
 * @summary Asking an account what it serves is the one piece of this run that leaves the machine,
 * so it is the one that can go silent. Folded into the wait it left the surface turning forever
 * with no control to press, and the only way on was to abandon setup. The reason names the account
 * a person has to go and look at, and both the way back and the way to ask again stand under it.
 */
export const ASilentAccountStopsTheRun = meta.story({
  args: { isMarked: (source) => source.id === openrouter.id },
  parameters: {
    bridge: {
      accounts: { schemaVersion: ACCOUNTS_VERSION, accounts: [connected] },
      gateways: [],
      settings: fresh,
    },
  },
  play: async ({ args }) => {
    await expect(
      await screen.findByText(
        "recompose couldn't read the model list for OpenRouter. Check the connection and try again.",
      ),
    ).toBeVisible();
    await expect(await screen.findByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(await screen.findByRole('button', { name: 'Back' })).toBeVisible();
    await expect(args.onBuilt).not.toHaveBeenCalled();
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
    await expect(
      await screen.findByText('No source is connected yet. Go back and connect one.'),
    ).toBeVisible();
    await expect(args.onBuilt).not.toHaveBeenCalled();
  },
});
