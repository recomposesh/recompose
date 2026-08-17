import type { Settings, SystemState } from '@recompose/contracts';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, type ReactNode } from 'react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import type { BridgeParameters } from '../../../../shared/testing';

import { unwrapIpcResult } from '../../../../shared/api';
import { installFakeBridge } from '../../../../shared/testing';
import { SettingsPage } from './settings-page';

async function mount(page: ReactNode, parameters: BridgeParameters) {
  installFakeBridge(parameters);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>{page}</Suspense>
    </QueryClientProvider>,
  );
}

async function renderSettings(parameters: BridgeParameters = {}) {
  return mount(<SettingsPage />, parameters);
}

async function renderSettingsFromShortcut(parameters: BridgeParameters = {}) {
  return mount(<SettingsPage focus="first-control" />, parameters);
}

function runningOn(loginItem: SystemState['loginItem']): BridgeParameters {
  const observed: SystemState = {
    fileBrowser: 'finder',
    loginItem,
    loginItemEnabled: false,
    menuBarVisible: false,
    configFolder: '~/Library/Application Support/recompose',
    version: '0.3.0',
  };

  return {
    overrides: { 'system:get': async () => Promise.resolve({ ok: true, value: observed }) },
  };
}

async function storedSettings(): Promise<Settings> {
  return unwrapIpcResult(await window.recompose['settings:get']());
}

test('the screen groups its settings under General, Server, Appearance, and Data in that order', async () => {
  const screen = await renderSettings();

  await expect.element(screen.getByRole('group', { name: 'General' })).toBeVisible();

  const headings = screen.getByRole('heading', { level: 2 }).elements();

  expect(headings.map((heading) => heading.textContent)).toEqual([
    'General',
    'Server',
    'Appearance',
    'Data',
  ]);
});

test('the launch switch is live, and turning it on stores the choice', async () => {
  const screen = await renderSettings();
  const control = screen.getByRole('switch', { name: 'Start gateways on launch' });

  await expect.element(control).not.toHaveAttribute('aria-disabled');
  await expect.element(control).toHaveAttribute('aria-checked', 'false');

  control.element().focus();
  await userEvent.keyboard(' ');

  await expect.element(control).toHaveAttribute('aria-checked', 'true');
  await expect.poll(async () => (await storedSettings()).startGatewaysOnLaunch).toBe(true);
});

test('the bind address defaults to loopback and remains editable', async () => {
  const screen = await renderSettings();

  await expect
    .element(screen.getByRole('textbox', { name: 'Bind address' }))
    .toHaveValue('127.0.0.1');
  await expect.element(screen.getByText(/Use 0\.0\.0\.0 or another host/iu)).toBeVisible();
});

test('settling another bind address stores it', async () => {
  const screen = await renderSettings();
  const field = screen.getByRole('textbox', { name: 'Bind address' });

  await field.fill('0.0.0.0');
  await userEvent.keyboard('{Enter}');

  await expect.poll(async () => (await storedSettings()).bindAddress).toBe('0.0.0.0');
});

test('changing the bind address asks before restarting running gateways', async () => {
  const screen = await renderSettings({
    engineStates: { codex: { status: 'running' } },
  });
  const field = screen.getByRole('textbox', { name: 'Bind address' });

  await field.fill('0.0.0.0');
  field.element().blur();

  await expect
    .element(screen.getByRole('heading', { name: 'Restart running gateways?' }))
    .toBeVisible();
  await expect.element(screen.getByText(/restarts 1 running gateway/iu)).toBeVisible();
  expect((await storedSettings()).bindAddress).toBe('127.0.0.1');

  await screen.getByRole('button', { name: 'Restart gateways' }).click();

  await expect.poll(async () => (await storedSettings()).bindAddress).toBe('0.0.0.0');
});

test('the Appearance group offers the theme alone, and nothing names wire motion', async () => {
  const screen = await renderSettings();

  await expect.element(screen.getByRole('group', { name: 'Appearance' })).toBeVisible();

  expect(screen.getByRole('radiogroup', { name: 'Theme' }).elements()).toHaveLength(1);
  expect(screen.getByRole('switch', { name: 'Reduce wire motion' }).elements()).toHaveLength(0);
  expect(screen.getByText(/wire/iu).elements()).toHaveLength(0);
});

test('no waiting row owns a field in the settings document', async () => {
  await renderSettings();

  expect(Object.keys(await storedSettings()).sort()).toEqual([
    'bindAddress',
    'firstRequestServed',
    'launchAtLogin',
    'schemaVersion',
    'showInMenuBar',
    'showOnboardingChecklist',
    'startGatewaysOnLaunch',
    'theme',
    'usageRetentionDays',
  ]);
});

test('the Server group offers no token and no switch demanding one', async () => {
  const screen = await renderSettings();

  await expect.element(screen.getByRole('group', { name: 'Server' })).toBeVisible();

  expect(screen.getByRole('switch', { name: 'Require API token' }).elements()).toHaveLength(0);
  expect(screen.getByText(/token/iu).elements()).toHaveLength(0);
});

test('the General group carries no telemetry row', async () => {
  const screen = await renderSettings();

  expect(screen.getByText('Telemetry', { exact: true }).elements()).toHaveLength(0);
  expect(screen.getByText(/never phones home/i).elements()).toHaveLength(0);
});

test('switching the theme to dark stores the new document', async () => {
  const screen = await renderSettings();

  await screen.getByRole('radio', { name: 'Dark' }).click();

  await expect.poll(async () => (await storedSettings()).theme).toBe('dark');
});

test('a rejected write returns the theme to the stored value and states what went wrong', async () => {
  const screen = await renderSettings({
    overrides: {
      'settings:save': async () =>
        Promise.resolve({
          ok: false,
          error: { code: 'storage-failed', message: 'the settings file could not be written' },
        }),
    },
  });

  await screen.getByRole('radio', { name: 'Dark' }).click();

  await expect.element(screen.getByRole('alert')).toBeVisible();
  await expect
    .element(screen.getByRole('radio', { name: 'System' }))
    .toHaveAttribute('aria-checked', 'true');
  expect((await storedSettings()).theme).toBe('system');
});

test('two changes in quick succession both survive', async () => {
  const screen = await renderSettings();

  await screen.getByRole('radio', { name: 'Dark' }).click();
  screen.getByRole('switch', { name: 'Show in menu bar' }).element().focus();
  await userEvent.keyboard(' ');

  await expect
    .poll(async () => {
      const stored = await storedSettings();

      return `${stored.theme}:${String(stored.showInMenuBar)}`;
    })
    .toBe('dark:true');
});

test('a change leaves the maintainer on the control they used', async () => {
  const screen = await renderSettings();

  await screen.getByRole('radio', { name: 'Dark' }).click();

  await expect.poll(async () => (await storedSettings()).theme).toBe('dark');
  expect(document.activeElement?.textContent).toBe('Dark');
});

test('the shortcut lands on the launch switch where the operating system keeps login items', async () => {
  const screen = await renderSettingsFromShortcut(runningOn('available'));

  await expect.element(screen.getByRole('switch', { name: 'Launch at login' })).toHaveFocus();
});

test('the shortcut skips the launch switch a development build cannot move', async () => {
  const screen = await renderSettingsFromShortcut(runningOn('unpackaged'));

  await expect.element(screen.getByRole('switch', { name: 'Launch at login' })).not.toHaveFocus();
  await expect.element(screen.getByRole('switch', { name: 'Show in menu bar' })).toHaveFocus();
});

test('the shortcut lands on the menu bar switch where no login item exists', async () => {
  const screen = await renderSettingsFromShortcut(runningOn('unsupported'));

  await expect.element(screen.getByRole('switch', { name: 'Show in menu bar' })).toHaveFocus();
});

test('a settings arrival without the shortcut disturbs nobody', async () => {
  const screen = await renderSettings(runningOn('available'));

  await expect.element(screen.getByRole('group', { name: 'General' })).toBeVisible();
  await expect.element(screen.getByRole('switch', { name: 'Launch at login' })).not.toHaveFocus();
});

test('the screen offers no save, apply, or cancel action', async () => {
  const screen = await renderSettings();

  await expect.element(screen.getByRole('group', { name: 'General' })).toBeVisible();

  for (const name of ['Save', 'Apply', 'Cancel']) {
    expect(screen.getByRole('button', { name }).elements()).toHaveLength(0);
  }
});
