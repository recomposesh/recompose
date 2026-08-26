import { expect, fn, userEvent, waitFor } from 'storybook/test';

import preview from '#.storybook/preview';

import { MoveRuntimeDialog } from './move-runtime-dialog';

const meta = preview.meta({
  component: MoveRuntimeDialog,
  args: {
    open: true,
    name: 'Ollama',
    address: 'http://127.0.0.1:11434',
    onCancel: fn(),
    onMove: fn(),
  },
});

/**
 * The one knob a runtime's port change needs, prefilled with where the row answers today.
 *
 * @summary The heading and the confirming act say the same words the overflow said, so the person
 * who picked Change port never has to work out whether the dialog is the one they asked for.
 */
export const Standing = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: "Change Ollama's port" })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Change port' })).toBeVisible();
    await expect(canvas.getByRole('textbox', { name: 'Port' })).toHaveValue('11434');
  },
});

/** A port a person typed lands as a number, not as the text they typed it in. */
export const PortChanged = meta.story({
  play: async ({ args, canvas }) => {
    const port = canvas.getByRole('textbox', { name: 'Port' });

    await userEvent.clear(port);
    await userEvent.type(port, '11435');
    await userEvent.click(canvas.getByRole('button', { name: 'Change port' }));

    await waitFor(() => {
      void expect(args.onMove).toHaveBeenCalledWith(11435);
    });
  },
});

/** A port no server can hold says so, and the row stays where it answered. */
export const PortOutOfRange = meta.story({
  play: async ({ args, canvas }) => {
    const port = canvas.getByRole('textbox', { name: 'Port' });

    await userEvent.clear(port);
    await userEvent.type(port, '70000');

    await expect(await canvas.findByText(/Accepts 1 through 65535/u)).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Change port' }));

    void expect(args.onMove).not.toHaveBeenCalled();
  },
});

/** Backing out leaves the row exactly where it answered. */
export const BackedOut = meta.story({
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      void expect(args.onCancel).toHaveBeenCalled();
    });
    void expect(args.onMove).not.toHaveBeenCalled();
  },
});

/** The dialog in the dark scheme, where it has to lift off the surface behind it. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
