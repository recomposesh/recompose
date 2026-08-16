import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { RouterDraftFields } from './router-draft-fields';

const meta = preview.meta({
  component: RouterDraftFields,
  args: {
    mode: 'failover' as const,
    onModeChange: () => {},
    name: '',
    onNameChange: () => {},
  },
  decorators: [
    (Story) => (
      <div className="mx-auto my-4 w-72 field-box">
        <Story />
      </div>
    ),
  ],
});

/**
 * The two decisions a router carries into existence, with the mode's cost said at the point of choice.
 *
 * @summary The sentence follows the strip rather than standing above it, so it describes the mode
 * a person just landed on rather than reading as fixed help about both.
 */
export const Failover = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('radiogroup', { name: 'Routing mode' })).toBeVisible();
    await expect(await canvas.findByText(/topmost healthy provider/)).toBeVisible();
  },
});

/** The other mode names the prompt cache it costs, which is the reason to weigh the two. */
export const RoundRobin = meta.story({
  args: { mode: 'round-robin' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/prompt cache/)).toBeVisible();
  },
});

/** An unnamed router shows the name it answers to as the placeholder, so leaving it alone is whole. */
export const NamedByItsMode = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByPlaceholderText('Failover')).toHaveValue('');
  },
});

/** A name a person wrote outranks the mode from then on, everywhere the router is spoken of. */
export const NamedByHand = meta.story({
  args: { name: 'Cheap first' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText('Router name')).toHaveValue('Cheap first');
  },
});

/** The fields in the dark scheme, where the segmented track has to hold against the box. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
