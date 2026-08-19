import { expect, fn, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { framedAsDrawerBox } from '../../testing/subject-shell.testkit';
import { JudgeSection } from './judge-section';

const targets = [
  {
    heading: 'API keys',
    options: [
      { id: 'k1', name: 'work', mark: 'anthropic' as const },
      { id: 'k2', name: 'personal', mark: 'openai' as const },
    ],
  },
];

const meta = preview.meta({
  component: JudgeSection,
  args: {
    accountName: 'work',
    providerModel: 'claude-haiku-4-5',
    targets,
    picking: undefined,
    onPicking: () => {},
    models: ['gpt-5-mini', 'gpt-5'],
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
    await expect(await canvas.findByRole('button', { name: 'work' })).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'personal' })).toBeVisible();
  },
});

/** An account picked walks on to its models, with the way back to the providers beside them. */
export const APickedAccountShowsItsModels = meta.story({
  args: { picking: 'k2' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'gpt-5-mini' })).toBeVisible();
    await expect(
      await canvas.findByRole('button', { name: 'Select a different provider' }),
    ).toBeVisible();
  },
});

/** Picking a model lands the whole binding, because half a judge refuses every request it reads. */
export const PickingAModelBindsTheWholeJudge = meta.story({
  args: { picking: 'k2', onBindJudge: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'gpt-5-mini' }));

    await expect(args.onBindJudge).toHaveBeenCalledWith({
      accountId: 'k2',
      providerModel: 'gpt-5-mini',
    });
  },
});

/** A look that reached nothing says so where the models would have stood. */
export const AModelListThatAnsweredNothing = meta.story({
  args: { picking: 'k2', models: [], modelRefusal: 'That key no longer reaches this provider.' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toHaveTextContent(/no longer reaches/);
  },
});

/** The judge at rest in the dark scheme, where the fact rows sit on the drawer panel. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
