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

const asked = { name: 'Pick an account' };

function scrollRegion(canvasElement: HTMLElement): HTMLElement | null {
  return canvasElement.querySelector('[data-picker-body]');
}

/** The accounts a dropped cable can bind to, standing on the card it landed as. */
export const Basic = meta.story({});

/** The account settled, the picker asks the account's own list for the model that serves. */
export const TheSecondStageAsksForTheProviderModel = meta.story({
  args: {
    stage: { step: 'provider-model', accountId: 'key-work' },
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
    stage: { step: 'provider-model', accountId: 'key-work' },
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
  args: { stage: { step: 'provider-model', accountId: 'key-work' }, groups: manyModels },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByRole('button', { name: 'claude-model-0' })).toBeVisible();

    const scrolling = scrollRegion(canvasElement);

    await expect(paintedBox(scrolling).height).toBeLessThanOrEqual(256);
    await expect(scrolling?.scrollHeight).toBeGreaterThan(paintedBox(scrolling).height);
  },
});

/** A list long enough to lose track of offers its search, which is the shipped list's own doing. */
export const ALongListOffersItsSearch = meta.story({
  args: { stage: { step: 'provider-model', accountId: 'key-work' }, groups: manyModels },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('searchbox', { name: 'Search models' })).toBeVisible();
  },
});
