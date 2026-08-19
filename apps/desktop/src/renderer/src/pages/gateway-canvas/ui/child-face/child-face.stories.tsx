import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { boundRow, branchRow, elseRow, unruledRow } from '../../testing/router-child.testkit';
import { ChildFace } from './child-face';

const meta = preview.meta({
  component: ChildFace,
  args: { child: boundRow, onOpen: () => {} },
  decorators: [
    (Story) => (
      <div className="mx-auto my-4 flex w-80 field-box px-3 py-1.5">
        <Story />
      </div>
    ),
  ],
});

/** The account a row names, with the real model it serves stacked under it. */
export const Basic = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Work key')).toBeVisible();
    await expect(await canvas.findByText('claude-sonnet-5')).toBeVisible();
  },
});

/** A branch adds its rule under the binding, in one line, with the whole of it in the sheet. */
export const ABranchPreviewsItsRule = meta.story({
  args: { child: branchRow },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/questions about source code/)).toBeVisible();
  },
});

/** A child bound by cable but never ruled says the judge is never offered it. */
export const AnUnruledBranchSaysSo = meta.story({
  args: { child: unruledRow },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/No rule yet/)).toBeVisible();
  },
});

/** The else row carries its reason where the rule would have read. */
export const TheElseFaceCarriesItsReason = meta.story({
  args: { child: elseRow },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/keeps an else branch/)).toBeVisible();
  },
});

/** The face in the dark scheme, where the vendor mark has to hold against the box. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
