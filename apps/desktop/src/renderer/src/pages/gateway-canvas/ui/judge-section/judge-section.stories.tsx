import { expect, fn, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { storedAccounts } from '../../testing/gateway-canvas.testkit';
import { framedAsDrawerBox } from '../../testing/subject-shell.testkit';
import { JudgeSection } from './judge-section';

const meta = preview.meta({
  component: JudgeSection,
  args: {
    accounts: storedAccounts.accounts,
    bound: { accountId: 'k1', providerModel: 'claude-haiku-4-5' },
    picking: undefined,
    onPicking: () => {},
    offered: { offered: ['gpt-5-mini', 'gpt-5'], refusal: undefined },
    onBindJudge: () => {},
  },
  decorators: [framedAsDrawerBox],
});

/** The judge at rest: the account it reads through, the model it runs, and why a small one wins. */
export const Basic = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('claude-haiku-4-5')).toBeVisible();
    await expect(await canvas.findByText(/Fast, cheap models judge best/)).toBeVisible();
  },
});

/** Editing opens on the providers, because a judge is an account before it is a model. */
export const EditingOpensOnTheProviders = meta.story({
  args: { picking: '' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: /Anthropic/u })).toBeVisible();
    await expect(await canvas.findByRole('button', { name: /OpenRouter/u })).toBeVisible();
  },
});

/** An account picked walks on to its models, with the way back to the providers beside them. */
export const APickedAccountShowsItsModels = meta.story({
  args: { picking: 'g1' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'gpt-5-mini' })).toBeVisible();
    await expect(
      await canvas.findByRole('button', { name: 'Select a different provider' }),
    ).toBeVisible();
  },
});

/** Picking a model lands the whole binding, because half a judge refuses every request it reads. */
export const PickingAModelBindsTheWholeJudge = meta.story({
  args: { picking: 'g1', onBindJudge: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'gpt-5-mini' }));

    await expect(args.onBindJudge).toHaveBeenCalledWith({
      accountId: 'g1',
      providerModel: 'gpt-5-mini',
    });
  },
});

/** A look that reached nothing says so where the models would have stood. */
export const AModelListThatAnsweredNothing = meta.story({
  args: {
    picking: 'g1',
    offered: { offered: [], refusal: 'That key no longer reaches this provider.' },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toHaveTextContent(/no longer reaches/);
  },
});

/**
 * A judge whose account left the registry says so where the provider would have stood.
 *
 * @summary The stored id is the only thing left of a departed account, and printing it would hand
 * a person a string they have never seen in place of a name they would recognize.
 */
export const AnAccountThatLeftTheRegistry = meta.story({
  args: { bound: { accountId: 'k9', providerModel: 'claude-haiku-4-5' } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Account left the registry')).toBeVisible();
    await expect(canvas.queryByText('k9')).toBeNull();
  },
});

/** The judge at rest in the dark scheme, where the fact rows sit on the drawer panel. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
