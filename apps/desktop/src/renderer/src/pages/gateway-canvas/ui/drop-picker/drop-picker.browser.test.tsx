import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import type { OptionGroup } from '../option-list/option-list';
import type { PickerStage } from './drop-picker';

import { RouterFooting } from '../../testing/router-footing.testkit';
import { DropPicker } from './drop-picker';

const accounts: readonly OptionGroup[] = [
  { heading: 'API Keys', options: [{ id: 'key-work', name: 'work key' }] },
  { heading: 'Subscriptions', options: [{ id: 'sub-max', name: 'Claude Max' }] },
];

const models: readonly OptionGroup[] = [
  { options: [{ id: 'claude-sonnet-5', name: 'claude-sonnet-5' }] },
];

async function renderPicker(
  stage: PickerStage,
  groups: readonly OptionGroup[],
  standsBehind = true,
) {
  const heard: string[] = [];
  const screen = await render(
    <RouterFooting>
      <DropPicker
        groups={groups}
        pickedName={undefined}
        refusal={undefined}
        onDismiss={() => {
          heard.push('dismissed');
        }}
        onPickAccount={(accountId) => {
          heard.push(`account ${accountId}`);
        }}
        onPickKind={(kind) => {
          heard.push(`kind ${kind}`);
        }}
        onPickProviderModel={(providerModel) => {
          heard.push(`provider model ${providerModel}`);
        }}
        onPickRouterMode={(mode) => {
          heard.push(`router mode ${mode}`);
        }}
        onStepBack={
          standsBehind
            ? () => {
                heard.push('stepped back');
              }
            : undefined
        }
        stage={stage}
      />
    </RouterFooting>,
  );

  return { heard, screen };
}

test('the ask offers a router or a target before anything else', async () => {
  const { screen } = await renderPicker({ step: 'kind' }, []);

  await expect.element(screen.getByRole('button', { name: /Router/ })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: /Provider/ })).toBeVisible();
  await expect.element(screen.getByRole('searchbox')).not.toBeInTheDocument();
});

test('picking the target hands the kind back, which is what carries the ask into the accounts', async () => {
  const { heard, screen } = await renderPicker({ step: 'kind' }, []);

  await screen.getByRole('button', { name: /Provider/ }).click();

  expect(heard).toEqual(['kind target']);
});

test('picking the router hands the kind back, which is what drops a wired router', async () => {
  const { heard, screen } = await renderPicker({ step: 'kind' }, []);

  await screen.getByRole('button', { name: /Router/ }).click();

  expect(heard).toEqual(['kind router']);
});

test('Esc at the kind ask dismisses just as it does at every other stage', async () => {
  const { heard } = await renderPicker({ step: 'kind' }, []);

  await userEvent.keyboard('{Escape}');

  expect(heard).toEqual(['dismissed']);
});

test('the picker opens on the stored accounts, gathered under the kinds they are', async () => {
  const { screen } = await renderPicker({ step: 'account', asks: 'target' }, accounts);

  await expect.element(screen.getByRole('button', { name: 'work key' })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Claude Max' })).toBeVisible();
  await expect.element(screen.getByText('API Keys')).toBeVisible();
});

test('picking an account hands its id back, which is what carries the binding on', async () => {
  const { heard, screen } = await renderPicker({ step: 'account', asks: 'target' }, accounts);

  await screen.getByRole('button', { name: 'work key' }).click();

  expect(heard).toEqual(['account key-work']);
});

test('the second stage picks the model the account serves, which completes the binding', async () => {
  const { heard, screen } = await renderPicker(
    { step: 'provider-model', asks: 'target', accountId: 'key-work' },
    models,
  );

  await screen.getByRole('button', { name: 'claude-sonnet-5' }).click();

  expect(heard).toEqual(['provider model claude-sonnet-5']);
});

test('the second stage offers the way back to the provider choices', async () => {
  const { heard, screen } = await renderPicker(
    { step: 'provider-model', asks: 'target', accountId: 'key-work' },
    models,
  );

  await screen.getByRole('button', { name: 'Select a different provider' }).click();

  expect(heard).toEqual(['stepped back']);
});

test('the account stage offers the way back to the ask that opened it', async () => {
  const { heard, screen } = await renderPicker({ step: 'account', asks: 'target' }, accounts);

  await screen.getByRole('button', { name: 'Select router or provider' }).click();

  expect(heard).toEqual(['stepped back']);
});

test('a stage nothing stands behind offers no way back, so the chevron never lies', async () => {
  const { screen } = await renderPicker({ step: 'account', asks: 'target' }, accounts, false);

  await expect
    .element(screen.getByRole('button', { name: 'Select router or provider' }))
    .not.toBeInTheDocument();
});

test('the kind ask offers no way back, because it is the first thing a binding asks', async () => {
  const { screen } = await renderPicker({ step: 'kind' }, []);

  await expect.element(screen.getByRole('button', { name: /Select/ })).not.toBeInTheDocument();
});

test('Esc dismisses the picker, which is what takes the pending card away with it', async () => {
  const { heard } = await renderPicker({ step: 'account', asks: 'target' }, accounts);

  await userEvent.keyboard('{Escape}');

  expect(heard).toEqual(['dismissed']);
});

test('Esc at the second stage dismisses just as it does at the first', async () => {
  const { heard } = await renderPicker(
    { step: 'provider-model', asks: 'target', accountId: 'key-work' },
    models,
  );

  await userEvent.keyboard('{Escape}');

  expect(heard).toEqual(['dismissed']);
});

test('the picker lands focus on its first option, so a keyboard alone can bind', async () => {
  const { screen } = await renderPicker({ step: 'account', asks: 'target' }, accounts);

  await expect.element(screen.getByRole('button', { name: 'work key' })).toHaveFocus();
});

test('a picker offering nothing to pick still takes focus, so Esc has somewhere to land', async () => {
  const { heard, screen } = await renderPicker({ step: 'account', asks: 'target' }, []);

  await expect.poll(() => screen.container.contains(document.activeElement)).toBe(true);

  await userEvent.keyboard('{Escape}');

  expect(heard).toEqual(['dismissed']);
});

test('moving to the second stage carries focus onto the model list it opens on', async () => {
  const { screen } = await renderPicker({ step: 'account', asks: 'target' }, accounts);

  await expect.element(screen.getByRole('button', { name: 'work key' })).toHaveFocus();

  await screen.rerender(
    <RouterFooting>
      <DropPicker
        groups={models}
        pickedName="work key"
        refusal={undefined}
        onDismiss={() => {}}
        onPickAccount={() => {}}
        onPickKind={() => {}}
        onPickProviderModel={() => {}}
        onPickRouterMode={() => {}}
        onStepBack={() => {}}
        stage={{ step: 'provider-model', asks: 'target', accountId: 'key-work' }}
      />
    </RouterFooting>,
  );

  await expect.element(screen.getByRole('searchbox', { name: 'Search models' })).toHaveFocus();
});

test('a stage that offers nothing says so rather than standing empty', async () => {
  const { heard, screen } = await renderPicker(
    { step: 'provider-model', asks: 'target', accountId: 'key-work' },
    [],
  );

  await expect.element(screen.getByText('No model matches that.')).toBeVisible();
  expect(heard).toEqual([]);
});
