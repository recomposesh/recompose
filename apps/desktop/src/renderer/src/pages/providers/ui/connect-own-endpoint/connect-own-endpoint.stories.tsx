import type { CredentialedAccountKind } from '@recompose/contracts';

import { expect, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';
import { inSettingsColumn } from '#.storybook/settings-column';

import { entryNamed } from '../../testing/catalog-entry';
import { ConnectOwnEndpoint } from './connect-own-endpoint';

const heldAs: CredentialedAccountKind = 'api-key';

const meta = preview.meta({
  component: ConnectOwnEndpoint,
  args: { entry: entryNamed('custom-endpoint'), kind: heldAs, onConnected: () => undefined },
  decorators: [inSettingsColumn],
});

/**
 * The one step that asks for an address, because it is the one entry nothing documents.
 *
 * @summary Every named vendor carries an address and a dialect the directory holds, so its form
 * asks only for the secret and never makes a person be right about what recompose already knows.
 * Here the person is the only source of both, so the reading counts all four fields.
 */
export const AsksForTheAddressAndTheDialect = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText('Name')).toBeVisible();
    await expect(await canvas.findByLabelText('Base URL')).toBeVisible();
    await expect(await canvas.findByLabelText('Dialect')).toBeVisible();
    await expect(await canvas.findByLabelText('Key')).toBeVisible();
  },
});

/** The dialect picker offers the three the gateway translates and nothing beyond them. */
export const OffersTheDialectsTheGatewaySpeaks = meta.story({
  play: async ({ canvas }) => {
    const picker = await canvas.findByLabelText('Dialect');

    await expect(picker).toHaveDisplayValue('OpenAI Chat Completions');
    await expect(await canvas.findByRole('option', { name: 'Anthropic Messages' })).toBeVisible();
    await expect(await canvas.findByRole('option', { name: 'OpenAI Responses' })).toBeVisible();
  },
});

/** An address no request could reach says so before a secret is stored against it. */
export const RefusesAnAddressNothingCanReach = meta.story({
  play: async ({ canvas }) => {
    await userEvent.type(await canvas.findByLabelText('Base URL'), 'models.example.com');

    await expect(await canvas.findByRole('alert')).toHaveTextContent('starting with https://');
    await expect(await canvas.findByRole('button', { name: 'Connect' })).toBeDisabled();
  },
});

/** Every field answered turns the act on, because nothing else is left to ask. */
export const ReadyOnceEveryFieldAnswered = meta.story({
  play: async ({ canvas }) => {
    await userEvent.type(await canvas.findByLabelText('Name'), 'My endpoint');
    await userEvent.type(await canvas.findByLabelText('Base URL'), 'https://models.example.com');
    await userEvent.type(await canvas.findByLabelText('Key'), 'a-secret');

    await expect(await canvas.findByRole('button', { name: 'Connect' })).toBeEnabled();
  },
});

/** The same step in the dark scheme, where the field box lifts off the sheet. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
