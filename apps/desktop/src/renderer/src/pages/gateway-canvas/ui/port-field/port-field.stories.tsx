import { expect, fn } from 'storybook/test';

import preview from '#.storybook/preview';

import { PortField } from './port-field';

const meta = preview.meta({
  component: PortField,
  args: { port: 8397, onCommit: fn() },
  decorators: [
    (Story) => (
      <div className="mx-auto my-4 w-40 rounded-control bg-surface-toolbar p-3">
        <Story />
      </div>
    ),
  ],
});

/** The field at rest, reading the stored port back. */
export const TheStoredPort = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('textbox', { name: 'Port' })).toHaveValue('8397');
  },
});

/** A draft outside the port range settles back to the stored port instead of committing. */
export const AnOutOfRangeDraftSettlesBack = meta.story({
  play: async ({ args, canvas, userEvent }) => {
    const field = await canvas.findByRole('textbox', { name: 'Port' });

    await userEvent.clear(field);
    await userEvent.type(field, '80{Enter}');

    await expect(field).toHaveValue('8397');
    await expect(args.onCommit).not.toHaveBeenCalled();
  },
});
