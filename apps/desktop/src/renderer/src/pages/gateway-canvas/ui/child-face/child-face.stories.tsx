import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import {
  boundRow,
  branchRow,
  elseRow,
  unruledRow,
  unwordedRow,
} from '../../testing/router-child.testkit';
import { ChildFace } from './child-face';

const A_CODE_RULE = 'questions about source code, diffs, and build failures';

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

/** A branch leads with its word, previews its rule, and names the binding under both. */
export const ABranchPreviewsItsRule = meta.story({
  args: { child: branchRow },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('code')).toBeVisible();
    await expect(await canvas.findByText(/questions about source code/)).toBeVisible();
    await expect(await canvas.findByText('3 pinned')).toBeVisible();
  },
});

/** A branch nobody has worded asks for its words where the label would have read. */
export const AnUnwordedBranchAsksForItsWords = meta.story({
  args: { child: unwordedRow },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Needs a rule')).toBeVisible();
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

/** Where a rule can be written, the rule line is the press that writes it. */
export const TheRuleLineIsItsOwnPress = meta.story({
  args: { child: branchRow, onEditRule: () => {} },
  play: async ({ canvas }) => {
    const preview = canvas.getByRole('button', { name: A_CODE_RULE });

    await expect(preview).toBeVisible();
    await expect(preview.tagName).toBe('BUTTON');
  },
});

/** Without a way to write one, the rule stays a line to read rather than a press that goes nowhere. */
export const AFaceThatCannotBeRuledOffersNoPress = meta.story({
  args: { child: branchRow },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button', { name: A_CODE_RULE })).toBeNull();
  },
});

/** The rule press in the dark scheme, where its focus ring and quiet ink both have to hold. */
export const TheRuleLinePressInDarkScheme = meta.story({
  args: { child: branchRow, onEditRule: () => {} },
  globals: { theme: 'dark' },
});

/** A branch face in the dark scheme, where its word, its rule and its mark all have to hold. */
export const DarkScheme = meta.story({ args: { child: branchRow }, globals: { theme: 'dark' } });

/** An unworded face in the dark scheme, where the attention ink has to carry. */
export const AnUnwordedBranchInDarkScheme = meta.story({
  args: { child: unwordedRow },
  globals: { theme: 'dark' },
});
