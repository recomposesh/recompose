import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { FoundAccountRow } from './found-account-row';

const meta = preview.meta({
  component: FoundAccountRow,
  args: {
    signedInAs: 'dev@example.com',
    plan: 'max',
    toolName: 'Claude Code',
    standing: 'connected' as const,
    inert: false,
    connecting: false,
    onConnect: () => undefined,
  },
  decorators: [
    (Story) => (
      <div className="w-80 p-4">
        <div className="field-box">
          <Story />
        </div>
      </div>
    ),
  ],
});

/**
 * The account the machine already holds, named by address and plan.
 *
 * @summary The reading asks for the whole row as the act, because the row is the way in and a
 * button inside it would rank this way over the sign-in beside it.
 */
export const Found = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByText('dev@example.com')).toBeVisible();
    await expect(canvas.getByText('max')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Connect dev@example.com' })).toBeEnabled();
  },
});

/**
 * A record naming no address, which still connects under the tool's own name.
 */
export const WithoutAnAddress = meta.story({
  args: { signedInAs: undefined, plan: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Claude Code')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Connect Claude Code' })).toBeEnabled();
  },
});

/**
 * The act while it runs, which reports itself on the row's own quiet line rather than going silent.
 */
export const Connecting = meta.story({
  args: { connecting: true, inert: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Connecting')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Connect dev@example.com' })).toBeDisabled();
  },
});

/**
 * The row while the sign-in beside it runs, standing inert in place rather than disappearing.
 */
export const Inert = meta.story({
  args: { inert: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Already signed in through Claude Code')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Connect dev@example.com' })).toBeDisabled();
  },
});

/**
 * An account whose credential stopped working, which says so before a person tries to connect it.
 */
export const Lapsed = meta.story({
  args: { standing: 'lapsed' as const },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Signed out in Claude Code')).toBeVisible();
  },
});

/** The same row in the dark scheme, where the initial disc has to hold its edge. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
