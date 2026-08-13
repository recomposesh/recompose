import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { ConnectWay } from './connect-way';

const meta = preview.meta({
  component: ConnectWay,
  args: {
    name: 'Anthropic',
    provider: 'anthropic' as const,
    toolName: 'Claude Code',
    command: 'CLAUDE_CONFIG_DIR="/Users/dev/.recompose/pending" claude',
    onConnected: () => undefined,
  },
  decorators: [
    (Story) => (
      <div className="w-80 p-4 text-center">
        <Story />
      </div>
    ),
  ],
});

/**
 * The machine already holds an account, so it leads and the sign-in drops to a quiet act.
 */
export const AccountFound = meta.story({
  parameters: {
    bridge: {
      machineReading: {
        holds: 'account' as const,
        signedInAs: 'dev@example.com',
        plan: 'max',
        standing: 'connected' as const,
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('dev@example.com')).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Connect' })).toBeEnabled();
    await expect(
      await canvas.findByRole('button', { name: 'Sign in with a different account' }),
    ).toBeVisible();
  },
});

/**
 * Nothing on the machine, so the sign-in is the way in and stands as the primary act.
 */
export const NothingFound = meta.story({
  parameters: { bridge: { machineReading: { holds: 'nothing' as const } } },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText('Claude Code has not signed in on this machine.'),
    ).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Sign in to Anthropic' })).toBeEnabled();
  },
});

/**
 * A record standing here with no account behind it, which reads apart from an empty machine.
 */
export const SignedOutOnThisMachine = meta.story({
  parameters: { bridge: { machineReading: { holds: 'no-account-credential' as const } } },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText('Claude Code is set up here but signed out.'),
    ).toBeVisible();
  },
});

/**
 * A store that refused to open, which is never reported as an empty machine.
 */
export const StoreRefused = meta.story({
  parameters: { bridge: { machineReading: { holds: 'store-refused' as const } } },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText('macOS did not allow access to the login keychain.'),
    ).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Sign in to Anthropic' })).toBeEnabled();
  },
});
