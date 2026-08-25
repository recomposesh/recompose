import { ACCOUNTS_VERSION, defaultSettings } from '@recompose/contracts';
import { expect, fn, screen } from 'storybook/test';

import preview from '#.storybook/preview';

import { onAStepSurface } from '../../testing/on-a-surface';
import { SourcesStanding } from './sources-standing';

const fresh = { ...defaultSettings(), setupWizardSettled: false };

const connected = {
  id: 'a1',
  provider: 'openrouter',
  kind: 'aggregator' as const,
  label: 'OpenRouter',
  credentialRef: 'c1',
  keyTail: '9e2f',
};

/** The row the look turned up, told from the catalog tile below by the identity only it carries. */
const CONNECTED_ROW = /sk-or-v1/u;

const overAConnectedAccount = {
  bridge: {
    accounts: { schemaVersion: ACCOUNTS_VERSION, accounts: [connected] },
    settings: fresh,
  },
};

const meta = preview.meta({
  component: SourcesStanding,
  args: {
    isMarked: () => false,
    onBack: fn(),
    onConnect: fn(),
    onContinue: fn(),
    onMark: fn(),
    onSkip: fn(),
  },
  parameters: { bridge: { settings: fresh } },
  decorators: [onAStepSurface],
});

/** A machine holding nothing asks for a provider rather than reporting an empty look. */
export const NothingOnThisMachine = meta.story({
  play: async () => {
    await expect(
      await screen.findByText(/recompose found nothing on this machine yet/u),
    ).toBeVisible();
  },
});

/** An account the app already holds stands as its own row, ready to be picked. */
export const AnAccountAlreadyConnected = meta.story({
  parameters: overAConnectedAccount,
  play: async () => {
    await expect(await screen.findByRole('button', { name: CONNECTED_ROW })).toBeVisible();
    await expect(await screen.findByText(/One source is already here/u)).toBeVisible();
  },
});

/** A source the caller reports as marked draws marked, because the mark lives above this step. */
export const AMarkedSourceDrawsMarked = meta.story({
  args: { isMarked: () => true },
  parameters: overAConnectedAccount,
  play: async () => {
    await expect(await screen.findByRole('button', { name: CONNECTED_ROW })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
});
