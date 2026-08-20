import type { ReactNode } from 'react';

import { expect, waitFor } from 'storybook/test';

import preview from '#.storybook/preview';

import type { OptionGroup } from '../option-list/option-list';

import { paintedBox } from '../../../../shared/testing';
import { pickerMetaArgs } from '../../testing/picker-args.testkit';
import { DropPicker } from './drop-picker';

const accounts: readonly OptionGroup[] = [
  {
    heading: 'API Keys',
    options: [
      { id: 'key-work', name: 'work key', mark: 'anthropic' },
      { id: 'key-side', name: 'side project', mark: 'openai' },
    ],
  },
  {
    heading: 'Subscriptions',
    options: [{ id: 'sub-max', name: 'Claude Max', mark: 'anthropic' }],
  },
];

const models: readonly OptionGroup[] = [
  {
    options: [
      { id: 'claude-sonnet-5', name: 'claude-sonnet-5' },
      { id: 'claude-opus-4-1', name: 'claude-opus-4-1' },
      { id: 'claude-haiku-4', name: 'claude-haiku-4' },
    ],
  },
];

const manyModels: readonly OptionGroup[] = [
  {
    options: [...Array.from({ length: 24 }).keys()].map((place) => ({
      id: `claude-model-${place}`,
      name: `claude-model-${place}`,
    })),
  },
];

function PendingCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-96 w-160 items-start justify-center bg-surface-content p-6 dot-grid">
      <div className="relative w-45">
        <div className="flex h-19 items-center justify-center rounded-canvas-card border border-dashed border-line-strong bg-surface-card text-card-title text-ink">
          New target
        </div>
        {children}
      </div>
    </div>
  );
}

const meta = preview.meta({
  component: DropPicker,
  args: pickerMetaArgs(accounts),
  decorators: [
    (Story) => (
      <PendingCard>
        <Story />
      </PendingCard>
    ),
  ],
});

const asked = { name: 'Connected providers' };

function scrollRegion(canvasElement: HTMLElement): HTMLElement | null {
  return canvasElement.querySelector('[data-picker-body]');
}

/** The accounts a dropped cable can bind to, standing on the card it landed as. */
export const Basic = meta.story({});

function clippedWords(canvasElement: HTMLElement): readonly string[] {
  const words = [...canvasElement.querySelectorAll<HTMLElement>('li button span')];

  return words.filter((word) => word.scrollWidth > word.clientWidth).map((word) => word.innerText);
}

/** The first thing a drop asks, which is the one stage nothing stands behind. */
export const TheKindAskWearsNoWayBack = meta.story({
  args: { stage: { step: 'kind' }, groups: [] },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: /Router/ })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: /^Select/ })).toBeNull();
  },
});

/** Both kinds print whole, name and fact alike, because the ask has to teach the two apart. */
export const TheKindAskPrintsBothKindsWhole = meta.story({
  args: { stage: { step: 'kind' }, groups: [] },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByRole('button', { name: /Router/ })).toBeVisible();
    await expect(clippedWords(canvasElement)).toEqual([]);
  },
});

/** Reached from the kind ask, the account stage offers the chevron back to it. */
export const TheAccountStageOffersTheWayBackToTheKindAsk = meta.story({
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Select router or provider' }));

    await expect(args.onStepBack).toHaveBeenCalled();
  },
});

/** A cable let go on a stored target settles the account itself, so that stage wears no chevron. */
export const AStageNothingStandsBehindWearsNoChevron = meta.story({
  render: (args) => <DropPicker {...args} onStepBack={undefined} />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'work key' })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Select router or provider' })).toBeNull();
  },
});

/** The account settled, the picker asks the account's own list for the model that serves. */
export const TheSecondStageAsksForTheProviderModel = meta.story({
  args: {
    stage: { step: 'provider-model', asks: 'target', accountId: 'key-work' },
    groups: models,
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'claude-sonnet-5' })).toBeVisible();
    await expect(canvas.queryByRole('dialog', asked)).toBeNull();
  },
});

/** The picker hangs off the card the cable landed on, never off a coordinate a person must hunt. */
export const ThePickerStandsOnItsPendingCard = meta.story({
  play: async ({ canvas, canvasElement }) => {
    const card = await canvas.findByText('New target');
    const asking = await canvas.findByRole('dialog', asked);
    const stood = paintedBox(card);
    const standing = paintedBox(asking);

    await expect(standing.top).toBeGreaterThanOrEqual(stood.bottom);
    await expect(standing.left).toBe(stood.left);
    await expect(paintedBox(canvasElement).bottom).toBeGreaterThan(standing.top);
  },
});

/** An account whose models cannot be read says why, instead of offering an empty silence. */
export const ARefusalStandsForTheList = meta.story({
  args: {
    stage: { step: 'provider-model', asks: 'target', accountId: 'key-work' },
    groups: [],
    refusal: "recompose couldn't read this account's model list.",
  },
  play: async ({ canvas }) => {
    await waitFor(async () =>
      expect(
        await canvas.findByText("recompose couldn't read this account's model list."),
      ).toBeVisible(),
    );
    await expect(canvas.queryByRole('searchbox')).toBeNull();
  },
});

/** A long list caps its height and scrolls, so the picker never runs off the canvas. */
export const ALongListCapsItsHeightAndScrolls = meta.story({
  args: {
    stage: { step: 'provider-model', asks: 'target', accountId: 'key-work' },
    groups: manyModels,
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByRole('button', { name: 'claude-model-0' })).toBeVisible();

    const scrolling = scrollRegion(canvasElement);

    await expect(paintedBox(scrolling).height).toBeLessThanOrEqual(256);
    await expect(scrolling?.scrollHeight).toBeGreaterThan(paintedBox(scrolling).height);
  },
});

/** A list long enough to lose track of offers its search, which is the shipped list's own doing. */
export const ALongListOffersItsSearch = meta.story({
  args: {
    stage: { step: 'provider-model', asks: 'target', accountId: 'key-work' },
    groups: manyModels,
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('searchbox', { name: 'Search models' })).toBeVisible();
  },
});

/**
 * A router nested here says how it spreads, on the same rows the drawer stacks for that question.
 *
 * @summary Three sentences of cost have nowhere to stand side by side in this column either, so
 * the canvas reads the choice exactly as the drawer does rather than shortening it into a strip.
 */
export const NestingARouterAsksHowItSpreads = meta.story({
  args: { stage: { step: 'router-mode' }, groups: [] },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Pick the routing mode')).toBeVisible();
    await expect(await canvas.findByRole('radio', { name: 'Conditional' })).not.toBeChecked();
    await expect(await canvas.findByText(/topmost healthy provider/)).toBeVisible();
  },
});

/** Conditional walks on to the judge, and the heading says which of the two lists this one is. */
export const ANestedConditionalAsksForItsJudge = meta.story({
  args: { stage: { step: 'account', asks: 'judge' }, groups: accounts },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Pick the judge')).toBeVisible();
    await expect(
      await canvas.findByRole('button', { name: 'Choose a different routing mode' }),
    ).toBeVisible();
  },
});

/** The judge's own model list reads as the list it judges with, never as the list it serves. */
export const ANestedJudgeReadsTheModelsItJudgesWith = meta.story({
  args: {
    stage: { step: 'provider-model', asks: 'judge', accountId: 'key-work' },
    groups: models,
    pickedName: 'work key',
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Models work key judges with')).toBeVisible();
  },
});

/** The judge whole, the same account list asks where everything no rule placed goes instead. */
export const ANestedConditionalAsksForItsElseBranch = meta.story({
  args: { stage: { step: 'account', asks: 'else' }, groups: accounts },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Pick the else branch')).toBeVisible();
    await expect(
      await canvas.findByRole('button', { name: 'Select a different judge' }),
    ).toBeVisible();
  },
});

/** The mode rows in the dark scheme, where each row's ring has to hold against the menu surface. */
export const NestedModeDarkScheme = meta.story({
  args: { stage: { step: 'router-mode' }, groups: [] },
  globals: { theme: 'dark' },
});
