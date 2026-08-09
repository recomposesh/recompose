import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import type { OptionGroup } from '../option-list/option-list';
import type { PickerStage } from './drop-picker';

import { DropPicker } from './drop-picker';

const accounts: readonly OptionGroup[] = [
  { heading: 'API Keys', options: [{ id: 'key-work', name: 'work key' }] },
  { heading: 'Subscriptions', options: [{ id: 'sub-max', name: 'Claude Max' }] },
];

const models: readonly OptionGroup[] = [
  { options: [{ id: 'claude-sonnet-5', name: 'claude-sonnet-5' }] },
];

async function renderPicker(stage: PickerStage, groups: readonly OptionGroup[]) {
  const heard: string[] = [];
  const screen = await render(
    <DropPicker
      groups={groups}
      refusal={undefined}
      onDismiss={() => {
        heard.push('dismissed');
      }}
      onPickAccount={(accountId) => {
        heard.push(`account ${accountId}`);
      }}
      onPickProviderModel={(providerModel) => {
        heard.push(`provider model ${providerModel}`);
      }}
      stage={stage}
    />,
  );

  return { heard, screen };
}

test('the picker opens on the stored accounts, gathered under the kinds they are', async () => {
  const { screen } = await renderPicker({ step: 'account' }, accounts);

  await expect.element(screen.getByRole('button', { name: 'work key' })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Claude Max' })).toBeVisible();
  await expect.element(screen.getByText('API Keys')).toBeVisible();
});

test('picking an account hands its id back, which is what carries the binding on', async () => {
  const { heard, screen } = await renderPicker({ step: 'account' }, accounts);

  await screen.getByRole('button', { name: 'work key' }).click();

  expect(heard).toEqual(['account key-work']);
});

test('the second stage picks the model the account serves, which completes the binding', async () => {
  const { heard, screen } = await renderPicker(
    { step: 'provider-model', accountId: 'key-work' },
    models,
  );

  await screen.getByRole('button', { name: 'claude-sonnet-5' }).click();

  expect(heard).toEqual(['provider model claude-sonnet-5']);
});

test('Esc dismisses the picker, which is what takes the pending card away with it', async () => {
  const { heard } = await renderPicker({ step: 'account' }, accounts);

  await userEvent.keyboard('{Escape}');

  expect(heard).toEqual(['dismissed']);
});

test('Esc at the second stage dismisses just as it does at the first', async () => {
  const { heard } = await renderPicker({ step: 'provider-model', accountId: 'key-work' }, models);

  await userEvent.keyboard('{Escape}');

  expect(heard).toEqual(['dismissed']);
});

test('the picker lands focus on its first option, so a keyboard alone can bind', async () => {
  const { screen } = await renderPicker({ step: 'account' }, accounts);

  await expect.element(screen.getByRole('button', { name: 'work key' })).toHaveFocus();
});

test('a picker offering nothing to pick still takes focus, so Esc has somewhere to land', async () => {
  const { heard, screen } = await renderPicker({ step: 'account' }, []);

  await expect.poll(() => screen.container.contains(document.activeElement)).toBe(true);

  await userEvent.keyboard('{Escape}');

  expect(heard).toEqual(['dismissed']);
});

test('moving to the second stage carries focus onto the model list it opens on', async () => {
  const { screen } = await renderPicker({ step: 'account' }, accounts);

  await expect.element(screen.getByRole('button', { name: 'work key' })).toHaveFocus();

  await screen.rerender(
    <DropPicker
      groups={models}
      refusal={undefined}
      onDismiss={() => {}}
      onPickAccount={() => {}}
      onPickProviderModel={() => {}}
      stage={{ step: 'provider-model', accountId: 'key-work' }}
    />,
  );

  await expect.element(screen.getByRole('button', { name: 'claude-sonnet-5' })).toHaveFocus();
});

test('a stage that offers nothing says so rather than standing empty', async () => {
  const { heard, screen } = await renderPicker(
    { step: 'provider-model', accountId: 'key-work' },
    [],
  );

  await expect.element(screen.getByText('No model matches that.')).toBeVisible();
  expect(heard).toEqual([]);
});
