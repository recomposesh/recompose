import { expect, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { emitLaunchRefused } from '../../../../shared/testing';
import { ConnectWay } from './connect-way';

const NOTHING_OPENED = 'no terminal emulator on this machine could run claude /login';
const ANOTHER_PLANS_NOTE = 'no terminal emulator on this machine could run codex login';

/** An empty machine whose sign-in never answers, which is the only way the wait stays on screen. */
const waitingOnASignIn = {
  machineReading: { holds: 'nothing' as const },
  overrides: { 'subscriptions:sign-in': async () => new Promise<never>(() => undefined) },
};

type WaitingCanvas = {
  findByRole: (role: string, options: { name: string }) => Promise<HTMLElement>;
  findByText: (text: string) => Promise<HTMLElement>;
};

async function theWaitIsOnScreen(canvas: WaitingCanvas): Promise<void> {
  await userEvent.click(await canvas.findByRole('button', { name: 'Sign in to Anthropic' }));

  await expect(
    await canvas.findByText('Waiting for Claude Code to finish signing in.'),
  ).toBeVisible();
}

const accountOnTheMachine = {
  machineReading: {
    holds: 'account' as const,
    signedInAs: 'dev@example.com',
    plan: 'max',
    standing: 'connected' as const,
  },
};

const meta = preview.meta({
  component: ConnectWay,
  args: {
    lead: { mark: 'anthropic' as const },
    name: 'Anthropic',
    provider: 'anthropic' as const,
    toolName: 'Claude Code',
    command: 'CLAUDE_CONFIG_DIR="/Users/dev/.recompose/pending" claude',
    terms: (
      <p className="text-detail text-ink-secondary">
        Claude Code signs in on its own and spends your Anthropic plan, under Anthropic&apos;s
        terms. Claude Code serves one account at a time.
      </p>
    ),
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
 * The machine already holds an account, so the step asks which of two ways to take.
 *
 * @summary The reading asks for both ways as rows of one list, because neither outranks the other
 * once an account is standing there to take.
 */
export const AccountFound = meta.story({
  parameters: { bridge: accountOnTheMachine },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'Claude Code' })).toBeVisible();
    await expect(
      await canvas.findByRole('button', { name: 'Connect dev@example.com' }),
    ).toBeEnabled();
    await expect(
      await canvas.findByRole('button', { name: 'Sign in with a different account' }),
    ).toBeEnabled();
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

/**
 * The wait, saying no terminal opened, with the command still there for the person to run.
 *
 * @summary The launch and the wait are one act to the main process, so the news that nothing
 * opened arrives as a push part way through rather than as the act's answer. It reads as a quiet
 * line rather than a refusal, because the sign-in still lands if the person runs the command.
 */
export const NoTerminalOpened = meta.story({
  parameters: { bridge: waitingOnASignIn },
  play: async ({ canvas }) => {
    await theWaitIsOnScreen(canvas);

    emitLaunchRefused({ provider: 'anthropic', note: NOTHING_OPENED });

    await expect(await canvas.findByText(NOTHING_OPENED)).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Copy the Claude Code sign-in command' }),
    ).toBeVisible();
  },
});

/** A refusal meant for another plan's sign-in never lands on this one. */
export const AnotherPlansTerminal = meta.story({
  parameters: { bridge: waitingOnASignIn },
  play: async ({ canvas }) => {
    await theWaitIsOnScreen(canvas);

    emitLaunchRefused({ provider: 'openai', note: ANOTHER_PLANS_NOTE });
    emitLaunchRefused({ provider: 'anthropic', note: NOTHING_OPENED });

    await expect(await canvas.findByText(NOTHING_OPENED)).toBeVisible();
    await expect(canvas.queryByText(ANOTHER_PLANS_NOTE)).toBeNull();
  },
});

/** The two ways in the dark scheme, where the list has to lift off the sheet behind it. */
export const DarkScheme = meta.story({
  parameters: { bridge: accountOnTheMachine },
  globals: { theme: 'dark' },
});
