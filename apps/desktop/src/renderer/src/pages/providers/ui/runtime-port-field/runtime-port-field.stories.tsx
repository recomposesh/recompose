import { expect, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { usePortForm } from '../../model/runtime-port';
import { RuntimePortField } from './runtime-port-field';

/**
 * The field with a draft of its own.
 *
 * @summary The form comes from a hook, so a story cannot hand one over as an argument. The port it
 * opens on can be, which is the only thing a story here varies.
 */
function FieldOpenedOn({ port }: { port: string }) {
  return (
    <div className="w-80 field-box text-start">
      <RuntimePortField form={usePortForm(port)} />
    </div>
  );
}

const meta = preview.meta({
  component: FieldOpenedOn,
  args: { port: '11434' },
});

/** The field as it opens, on whichever port the surface asking started from. */
export const Standing = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'Port' })).toHaveValue('11434');
  },
});

/**
 * A port no server can hold says so while it is typed.
 *
 * @summary The refusal comes from the range itself rather than from a sentence written beside it,
 * so the step that adds a runtime and the dialog that moves one refuse in the same words.
 */
export const OutOfRange = meta.story({
  play: async ({ canvas }) => {
    const port = canvas.getByRole('textbox', { name: 'Port' });

    await userEvent.clear(port);
    await userEvent.type(port, '70000');

    await expect(await canvas.findByText('Accepts 1 through 65535.')).toBeVisible();
  },
});

/** The field in the dark scheme, where the refusal has to hold against the box behind it. */
export const DarkScheme = meta.story({
  args: { port: '70000' },
  globals: { theme: 'dark' },
});
