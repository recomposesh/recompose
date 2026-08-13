import { expect, fn, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';
import { inSettingsColumn } from '#.storybook/settings-column';

import { SheetField } from '../sheet-field/sheet-field';
import { ConnectStep } from './connect-step';

const meta = preview.meta({
  component: ConnectStep,
  args: {
    formId: 'a-step',
    lead: { mark: 'anthropic' as const },
    title: 'Anthropic API',
    caption: <p className="text-detail text-ink-secondary">This key reaches api.anthropic.com</p>,
    children: <SheetField label="Name" onChangeValue={() => undefined} value="" />,
    ready: true,
    pending: false,
    onSubmit: fn(),
  },
  decorators: [inSettingsColumn],
});

/**
 * The anatomy every connect step shares, holding whichever fields its own way asks for.
 *
 * @summary A key, a plan token, an address and a port differ only in what they ask for, so only
 * the fields are passed in. The reading asks for the picked product over the fields and the act
 * at the foot, because that shape is what a person recognizes across all four.
 */
export const Standing = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'Anthropic API' })).toBeVisible();
    await expect(await canvas.findByLabelText('Name')).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Connect' })).toBeEnabled();
  },
});

/** A draft still missing something keeps the act out of reach rather than refusing on press. */
export const NotReadyYet = meta.story({
  args: { ready: false },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'Connect' })).toBeDisabled();
  },
});

/** A connect already out keeps the act out of reach, so one press asks one connect. */
export const AlreadyConnecting = meta.story({
  args: { pending: true },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'Connect' })).toBeDisabled();
  },
});

/** A refusal stands under the fields and reads as an alert, so nothing about it is quiet. */
export const Refused = meta.story({
  args: { refusal: 'recompose cannot store this key as it stands.' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toHaveTextContent('cannot store this key');
  },
});

/** The act settles the step rather than the form deciding on its own. */
export const SubmitsOncePressed = meta.story({
  play: async ({ args, canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Connect' }));

    await expect(args.onSubmit).toHaveBeenCalled();
  },
});

/** The same anatomy in the dark scheme, where the field box lifts off the sheet. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
