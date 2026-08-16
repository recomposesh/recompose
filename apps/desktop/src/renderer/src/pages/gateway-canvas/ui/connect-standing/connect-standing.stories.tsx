import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { ConnectStanding } from './connect-standing';

const meta = preview.meta({
  component: ConnectStanding,
  args: { answered: 0, name: 'Claude Code' },
});

/** Nothing has arrived yet, so the line names the client a person is about to run. */
export const Waiting = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      'Nothing has reached this gateway yet. Run Claude Code once',
    );
  },
});

/** One request landed, which is the moment a person is waiting for and so reads in the singular. */
export const FirstRequest = meta.story({
  args: { answered: 1 },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('status')).toHaveTextContent('The log holds 1 request');
  },
});

/** Traffic already running, which says the wiring landed before this sheet was even opened. */
export const AlreadyServing = meta.story({
  args: { answered: 42 },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('status')).toHaveTextContent('The log holds 42 requests');
  },
});

/** The same two standings in the dark scheme, where the green mark carries the arrival. */
export const DarkScheme = meta.story({
  globals: { theme: 'dark' },
  args: { answered: 3 },
});
