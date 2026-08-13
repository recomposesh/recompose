import { expect, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';
import { inSettingsColumn } from '#.storybook/settings-column';

import { SheetField } from './sheet-field';

const meta = preview.meta({
  component: SheetField,
  args: { label: 'Name', value: '', onChangeValue: () => undefined, placeholder: 'My endpoint' },
  decorators: [
    (Story) => (
      <div className="field-box">
        <Story />
      </div>
    ),
    inSettingsColumn,
  ],
});

/**
 * One row inside a sheet's field box, at the width every connect step shares.
 *
 * @summary The width is a fact about the sheet rather than about the field, so no connect step
 * repeats it. The reading asks for the label as its accessible name, because that word is how a
 * screen reader announces the control a person is about to type into.
 */
export const Standing = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText('Name')).toBeVisible();
  },
});

/** A field holding a secret hides what it holds, so a shoulder never reads it. */
export const HoldingASecret = meta.story({
  args: { label: 'Key', type: 'password' as const, placeholder: undefined },
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText('Key')).toHaveAttribute('type', 'password');
  },
});

/** Typing reaches the caller rather than staying in the control. */
export const CarriesWhatWasTyped = meta.story({
  args: { value: 'Bench box' },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByLabelText('Name'));

    await expect(await canvas.findByLabelText('Name')).toHaveValue('Bench box');
  },
});

/** The same row in the dark scheme, where the field box lifts off the sheet. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
