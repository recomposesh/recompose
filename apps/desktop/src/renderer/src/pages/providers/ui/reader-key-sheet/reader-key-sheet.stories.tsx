import { expect, within } from 'storybook/test';

import preview from '#.storybook/preview';

import { ReaderKeySheet } from './reader-key-sheet';

const ask = {
  label: 'Management key',
  hint: 'sk-or-v1-…',
  note: 'Optional. OpenRouter reads credits only with a management key, and this one never serves a request.',
};

const meta = preview.meta({
  component: ReaderKeySheet,
  args: {
    accountId: 'a1',
    ask,
    open: true,
    onOpenChange: () => undefined,
  },
});

/** The sheet as it opens, naming the key and saying why the account's own key will not do. */
export const AskingForTheKey = meta.story({
  args: { open: true },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement.ownerDocument.body).findByText(/never serves a request/),
    ).toBeVisible();
  },
});

/** The same sheet in the dark scheme, where a secret field has to stay readable. */
export const DarkScheme = meta.story({ args: { open: true }, globals: { theme: 'dark' } });
