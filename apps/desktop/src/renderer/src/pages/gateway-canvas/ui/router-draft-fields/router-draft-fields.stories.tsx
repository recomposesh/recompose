import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { RouterDraftFields } from './router-draft-fields';

const meta = preview.meta({
  component: RouterDraftFields,
  args: { mode: 'failover' as const, name: '', onNameChange: () => {} },
  decorators: [
    (Story) => (
      <div className="mx-auto my-4 w-72 field-box">
        <Story />
      </div>
    ),
  ],
});

/**
 * The step the save waits on, reading back the mode chosen a step earlier over the name field.
 *
 * @summary The mode is a fact here rather than a control, because a person landing back from the
 * judge and the else branch presses save on this step: the one answer that decides what all of it
 * means has to be readable where it becomes final.
 */
export const Failover = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Failover')).toBeVisible();
    await expect(await canvas.findByText(/topmost healthy provider/)).toBeVisible();
  },
});

/** The other mode names the prompt cache it costs, which is the reason to weigh the two. */
export const RoundRobin = meta.story({
  args: { mode: 'round-robin' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Round-robin')).toBeVisible();
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

/** The fields in the dark scheme, where the mode fact has to hold against the box. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
