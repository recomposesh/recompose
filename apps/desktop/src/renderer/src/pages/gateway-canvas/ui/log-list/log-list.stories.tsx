import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { servedRequest, servedRun, storedAccounts } from '../../testing/gateway-canvas.testkit';
import { LogList } from './log-list';

const meta = preview.meta({
  component: LogList,
  args: {
    rows: servedRun(40),
    scope: 'all',
    accounts: storedAccounts.accounts,
    nothingYet: 'No requests from any client app yet.',
  },
  decorators: [
    (Story) => (
      <div className="mx-auto my-4 flex h-70 w-160 flex-col field-box">
        <Story />
      </div>
    ),
  ],
});

/** A gateway with history behind it, which is the list a person opens the drawer to read. */
export const Serving = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('listbox', { name: 'Served requests' })).toBeVisible();
    await expect(await canvas.findByText('14:22:09')).toBeVisible();
  },
});

/** A scope narrowed past every request, which says so rather than reading as broken. */
export const NothingInScope = meta.story({
  args: { rows: [] },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No requests from any client app yet.')).toBeVisible();
  },
});

/** The three standings down one run, where a person scans a column rather than each line. */
export const EveryStandingDownTheRun = meta.story({
  args: {
    rows: [
      servedRequest({ id: 'a', status: 200 }),
      servedRequest({ id: 'b', status: 429, virtualModel: 'creative' }),
      servedRequest({ id: 'c', status: 500, durationMs: undefined }),
      servedRequest({
        id: 'd',
        origin: 'gateway',
        provider: undefined,
        accountId: undefined,
        providerModel: undefined,
        status: 502,
        durationMs: undefined,
      }),
    ],
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('502')).toBeVisible();
    await expect(await canvas.findByText('429')).toBeVisible();
  },
});

/** The keyboard contract: one tab stop, then the arrows walk a cursor down the run. */
export const WalkedByTheKeyboard = meta.story({
  play: async ({ canvas, userEvent }) => {
    const list = await canvas.findByRole('listbox', { name: 'Served requests' });

    list.focus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');

    await expect(list.getAttribute('aria-activedescendant')).toContain('served-2');
  },
});

/** The same run in the dark scheme, where every ink has to hold against the box. */
export const DarkScheme = meta.story({
  globals: { theme: 'dark' },
  args: {
    rows: [
      servedRequest({ id: 'a', status: 200 }),
      servedRequest({ id: 'b', status: 429, virtualModel: 'creative' }),
      servedRequest({ id: 'c', status: 500, durationMs: undefined, accountId: 'gone' }),
    ],
  },
});
