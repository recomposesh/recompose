import preview from '#.storybook/preview';

import { VendorMark } from '../index';

const meta = preview.meta({
  component: VendorMark,
  args: { name: 'anthropic' },
  decorators: [
    (Story) => (
      <div className="flex items-center gap-3 p-4">
        <Story />
      </div>
    ),
  ],
});

/** A vendor recompose draws a mark for leads with that mark. */
export const Marked = meta.story({ args: { name: 'anthropic' } });

/** A vendor with no mark leads with the one stand-in every such row takes. */
export const Unmarked = meta.story({ args: { name: undefined } });

/** The stand-in in the dark scheme, where it still has to read as a drawing rather than a smudge. */
export const DarkScheme = meta.story({ args: { name: undefined }, globals: { theme: 'dark' } });
