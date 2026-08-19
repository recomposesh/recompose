import { expect, fn, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { TextArea } from './text-area';

const meta = preview.meta({
  component: TextArea,
  args: {
    label: 'Branch rule',
    value: '',
    placeholder: 'Questions about source code, diffs, and build failures',
    onChangeValue: () => {},
  },
  decorators: [
    (Story) => (
      <div className="mx-auto my-4 w-80">
        <Story />
      </div>
    ),
  ],
});

/** The empty field, standing at the height it keeps until a person drags it taller. */
export const Basic = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText('Branch rule')).toHaveValue('');
  },
});

/** Prose reads across lines rather than scrolling sideways, which is the whole point of it. */
export const HoldingProse = meta.story({
  args: {
    value:
      'Questions about source code, diffs, build failures, and anything that names a file path.',
  },
  play: async ({ canvas }) => {
    const field = await canvas.findByLabelText('Branch rule');

    await expect(field.scrollWidth).toBeLessThanOrEqual(field.clientWidth);
  },
});

/** Every keystroke travels out, because the draft belongs to the form rather than to the field. */
export const EveryKeystrokeTravels = meta.story({
  args: { onChangeValue: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.type(await canvas.findByLabelText('Branch rule'), 'hi');

    await expect(args.onChangeValue).toHaveBeenCalledTimes(2);
  },
});

/** An inert field stays reachable and readable, so a keyboard reader still meets its value. */
export const Inert = meta.story({
  args: { inert: true, value: 'questions about source code' },
  play: async ({ canvas }) => {
    const field = await canvas.findByLabelText('Branch rule');

    await expect(field).toHaveAttribute('aria-disabled', 'true');
    await expect(field).toHaveAttribute('readonly');
  },
});

/** A taller field for a rule that runs long, which the caller asks for by line count. */
export const Tall = meta.story({ args: { rows: 8 } });

/** The field in the dark scheme, where its inset has to read against the surface behind it. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
