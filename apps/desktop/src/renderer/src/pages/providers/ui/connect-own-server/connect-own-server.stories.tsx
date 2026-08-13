import { expect, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';
import { inSettingsColumn } from '#.storybook/settings-column';

import { entryNamed } from '../../testing/catalog-entry';
import { ConnectOwnServer } from './connect-own-server';

const meta = preview.meta({
  component: ConnectOwnServer,
  args: { entry: entryNamed('custom-local'), onConnected: () => undefined },
  decorators: [inSettingsColumn],
});

/**
 * The port a person names, and the host they never do.
 *
 * @summary A documented runtime knows the port its own project publishes, so its step opens a
 * look straight away. This one has nothing to look at until a person names a port, and no project
 * to name the row by. The reading looks for the loopback host printed rather than asked for,
 * because a typed host could aim a stored row off this machine.
 */
export const NamesThePortAndNotTheHost = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('127.0.0.1')).toBeVisible();
    await expect(await canvas.findByLabelText('Port')).toBeVisible();
    await expect(canvas.queryByLabelText('Host')).toBeNull();
    await expect(canvas.queryByLabelText('Base URL')).toBeNull();
  },
});

/** A port outside what a loopback server can bind says so before anything is stored. */
export const RefusesAPortNoServerCanBind = meta.story({
  play: async ({ canvas }) => {
    await userEvent.type(await canvas.findByLabelText('Port'), '70000');

    await expect(await canvas.findByRole('alert')).toHaveTextContent('Accepts 1 through 65535');
    await expect(await canvas.findByRole('button', { name: 'Connect' })).toBeDisabled();
  },
});

/** Both fields answered turns the act on, because nothing else is left to ask. */
export const ReadyOnceBothAnswered = meta.story({
  play: async ({ canvas }) => {
    await userEvent.type(await canvas.findByLabelText('Name'), 'Bench box');
    await userEvent.type(await canvas.findByLabelText('Port'), '8000');

    await expect(await canvas.findByRole('button', { name: 'Connect' })).toBeEnabled();
  },
});

/** The same step in the dark scheme, where the field box lifts off the sheet. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
