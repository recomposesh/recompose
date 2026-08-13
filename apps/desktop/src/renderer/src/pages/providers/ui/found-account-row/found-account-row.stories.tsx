import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { FoundAccountRow } from './found-account-row';

const meta = preview.meta({
  component: FoundAccountRow,
  args: {
    signedInAs: 'dev@example.com',
    plan: 'max',
    toolName: 'Claude Code',
    inert: false,
    connecting: false,
    onConnect: () => undefined,
  },
  decorators: [
    (Story) => (
      <div className="w-80 p-4">
        <Story />
      </div>
    ),
  ],
});

/**
 * The account the machine already holds, named by address and plan.
 */
export const Found = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByText('dev@example.com')).toBeVisible();
    await expect(canvas.getByText('max')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Connect' })).toBeEnabled();
  },
});

/**
 * A record naming no address, which still connects under the tool's own name.
 */
export const WithoutAnAddress = meta.story({
  args: { signedInAs: undefined, plan: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Claude Code')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Connect' })).toBeEnabled();
  },
});

/**
 * The act while it runs, which reports itself rather than going quiet.
 */
export const Connecting = meta.story({
  args: { connecting: true, inert: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Connecting' })).toBeDisabled();
  },
});

/**
 * The row while the sign-in beneath it runs, standing inert in place rather than disappearing.
 */
export const Inert = meta.story({
  args: { inert: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Connect' })).toBeDisabled();
  },
});
