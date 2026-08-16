import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { RowLead } from './row-lead';

const meta = preview.meta({
  component: RowLead,
  decorators: [
    (Story) => (
      <div className="mx-auto my-4 flex w-40 items-center gap-2.5 field-box px-2.5 py-2">
        <Story />
        <span className="text-control text-ink">Row name</span>
      </div>
    ),
  ],
});

/** A vendor recompose draws a mark for leads with that mark, at the size every list uses. */
export const AVendorMark = meta.story({
  args: { mark: 'anthropic' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('svg')).not.toBeNull();
  },
});

/** A router has no vendor, so it leads with the glyph and color its own card wears. */
export const ARouterGlyph = meta.story({ args: { glyph: 'branch', glyphTint: 'text-router' } });

/** A provider kind leads with its own tint, which is what ties the row to the card it becomes. */
export const AProviderGlyph = meta.story({ args: { glyph: 'target', glyphTint: 'text-provider' } });

/** Nothing named at all still leads with something, so no row starts on a ragged edge. */
export const NothingNamed = meta.story({});

/** The leads in the dark scheme, where each tint has to hold against the box behind it. */
export const DarkScheme = meta.story({
  args: { glyph: 'branch', glyphTint: 'text-router' },
  globals: { theme: 'dark' },
});
