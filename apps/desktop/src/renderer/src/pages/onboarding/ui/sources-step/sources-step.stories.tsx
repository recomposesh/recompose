import { expect, fn, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { catalogEntries, offeredUnder } from '../../../../entities/provider';
import { claudePlan, ollama, openrouter } from '../../testing/found-source';
import { SourcesStep } from './sources-step';

const meta = preview.meta({
  component: SourcesStep,
  args: {
    found: [claudePlan, ollama],
    marked: new Set(['machine:anthropic', 'machine:ollama']),
    onBack: fn(),
    onConnect: fn(),
    onContinue: fn(),
    onSkip: fn(),
    onToggle: fn(),
  },
  decorators: [
    (Story) => (
      <div className="h-250 w-full bg-surface-content">
        <Story />
      </div>
    ),
  ],
});

/** What a machine already running Claude Code and Ollama meets, both marked. */
export const Prefilled = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/Two sources are already here/u)).toBeVisible();
    await expect(await canvas.findByRole('button', { name: /Your Claude plan/u })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(
      await canvas.findByRole('button', { name: 'Continue with 2 sources' }),
    ).toBeEnabled();
  },
});

/** Clearing a mark keeps the row and its identity, and drops the count. */
export const OneMarkCleared = meta.story({
  args: { marked: new Set(['machine:anthropic']) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('127.0.0.1:11434')).toBeVisible();
    await expect(
      await canvas.findByRole('button', { name: 'Continue with 1 source' }),
    ).toBeEnabled();
  },
});

/** Nothing marked leaves the control that continues refusing. */
export const NothingMarked = meta.story({
  args: { marked: new Set<string>() },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'Continue' })).toBeDisabled();
  },
});

/** A machine holding nothing is asked rather than told it came up empty. */
export const TheLookFoundNothing = meta.story({
  args: { found: [], marked: new Set<string>() },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/found nothing on this machine yet/u)).toBeVisible();
    await expect(canvas.queryByRole('heading', { name: 'Your sources' })).toBeNull();
    await expect(await canvas.findByRole('button', { name: 'Continue' })).toBeDisabled();
  },
});

/** A provider connected during setup joins the rows and raises the count. */
export const AfterConnectingOne = meta.story({
  args: {
    found: [claudePlan, ollama, openrouter],
    marked: new Set(['machine:anthropic', 'machine:ollama', 'a1']),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('sk-or-v1-…9e2f')).toBeVisible();
    await expect(
      await canvas.findByRole('button', { name: 'Continue with 3 sources' }),
    ).toBeEnabled();
  },
});

/** Every column of the catalog stands under the rows, in the catalog's own order. */
export const TheWholeCatalogStands = meta.story({
  play: async ({ canvas }) => {
    for (const title of ['Subscriptions', 'API keys', 'Aggregators', 'Local runtimes']) {
      await expect(await canvas.findByRole('heading', { name: title })).toBeVisible();
    }

    const aggregators = offeredUnder(catalogEntries, 'aggregator');

    await expect(canvas.getAllByRole('button', { name: /Custom/u }).length).toBeGreaterThan(0);
    await expect(aggregators.length).toBeGreaterThan(1);
  },
});

/** Picking a provider reports which one and which column asked, so the sheet opens on it. */
export const PickingAProviderReportsIt = meta.story({
  play: async ({ args, canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'OpenRouter' }));

    await expect(args.onConnect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'openrouter' }),
      'aggregator',
    );
  },
});

/** A stored plan never marks the same provider's key tile, because the two are different products. */
export const APlanNeverMarksTheKeyTile = meta.story({
  play: async ({ canvas }) => {
    const plan = await canvas.findByRole('button', { name: 'Claude' });
    const key = await canvas.findByRole('button', { name: 'Anthropic API' });

    await expect(getComputedStyle(plan).borderTopColor).not.toBe(
      getComputedStyle(key).borderTopColor,
    );
  },
});
