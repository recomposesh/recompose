import { expect, test } from 'vitest';

import { renderAgainstBridge, reportingSystem } from '../../testing/render-settings';
import { SettingsPage } from '../settings-page/settings-page';

test('the config folder row names the folder without the account name in it', async () => {
  const screen = await renderAgainstBridge(<SettingsPage />);

  await expect.element(screen.getByText('~/Library/Application Support/recompose')).toBeVisible();
});

test('the reveal action names Finder where the platform ships Finder', async () => {
  const screen = await renderAgainstBridge(<SettingsPage />);

  await expect.element(screen.getByRole('button', { name: 'Reveal in Finder' })).toBeVisible();
});

test('the reveal action names Explorer where the platform ships Explorer', async () => {
  const screen = await renderAgainstBridge(
    <SettingsPage />,
    reportingSystem({ fileBrowser: 'explorer' }),
  );

  await expect.element(screen.getByRole('button', { name: 'Show in Explorer' })).toBeVisible();
});

test('the reveal action names neither where the platform ships its own file manager', async () => {
  const screen = await renderAgainstBridge(
    <SettingsPage />,
    reportingSystem({ fileBrowser: 'file-manager' }),
  );

  await expect.element(screen.getByRole('button', { name: 'Open folder' })).toBeVisible();
});

test('a folder that refuses to open says so on the row', async () => {
  const screen = await renderAgainstBridge(<SettingsPage />, {
    overrides: {
      'system:open-config-folder': async () =>
        Promise.resolve({
          ok: false,
          error: { code: 'folder-open-failed', message: 'the folder did not open' },
        }),
    },
  });

  await screen.getByRole('button', { name: 'Reveal in Finder' }).click();

  await expect.element(screen.getByRole('alert')).toBeVisible();
});

test('the Data section offers three retention windows with 30 days standing', async () => {
  const screen = await renderAgainstBridge(<SettingsPage />);

  await expect
    .element(screen.getByRole('radiogroup', { name: 'Usage retention' }))
    .toBeInTheDocument();
  await expect.element(screen.getByRole('radio', { name: '30 days' })).toBeChecked();
});

test('widening the window applies with no confirmation', async () => {
  const screen = await renderAgainstBridge(<SettingsPage />);

  await screen.getByRole('radio', { name: '90 days' }).click();

  await expect.element(screen.getByRole('radio', { name: '90 days' })).toBeChecked();
  expect(document.querySelector('dialog[open]')).toBeNull();
});

test('a shortening states its cost and holds until answered', async () => {
  const screen = await renderAgainstBridge(<SettingsPage />);

  await screen.getByRole('radio', { name: '7 days' }).click();

  await expect.element(screen.getByText(/drops usage older than 7 days for good/)).toBeVisible();
  await expect.element(screen.getByRole('radio', { name: '30 days' })).toBeChecked();
});

test('declining keeps the window and the history', async () => {
  const screen = await renderAgainstBridge(<SettingsPage />);

  await screen.getByRole('radio', { name: '7 days' }).click();
  await screen.getByRole('button', { name: 'Cancel' }).click();

  await expect.element(screen.getByRole('radio', { name: '30 days' })).toBeChecked();
  expect(document.querySelector('dialog[open]')).toBeNull();
});

test('accepting saves the shorter window', async () => {
  const screen = await renderAgainstBridge(<SettingsPage />);

  await screen.getByRole('radio', { name: '7 days' }).click();
  await screen.getByRole('button', { name: 'Drop history' }).click();

  await expect.element(screen.getByRole('radio', { name: '7 days' })).toBeChecked();
});
