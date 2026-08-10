import type { ReactNode } from 'react';

import { expect, within } from 'storybook/test';

import preview from '#.storybook/preview';

import { StatusChip } from '../index';

const transparent = 'rgba(0, 0, 0, 0)';

const tinted = [
  { tone: 'positive', word: 'Live' },
  { tone: 'attention', word: 'Needs sign-in' },
  { tone: 'danger', word: 'Failed' },
] as const;

function markOf(chip: HTMLElement): Element {
  const mark = chip.querySelector('[aria-hidden="true"]');

  if (mark === null) {
    throw new Error('The status chip drew its word without a mark beside it.');
  }

  return mark;
}

function around(chip: HTMLElement): HTMLElement {
  const setting = chip.parentElement;

  if (setting === null) {
    throw new Error('The status chip stood in no setting at all.');
  }

  return setting;
}

function channel(value: number): number {
  const scaled = value / 255;

  return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function luminance(color: string): number {
  const [red = 0, green = 0, blue = 0] = (color.match(/[\d.]+/g) ?? []).map(Number);

  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function contrastOnItsSurface(chip: HTMLElement): number {
  const ink = luminance(getComputedStyle(chip).color);
  const surface = luminance(getComputedStyle(around(chip)).backgroundColor);

  return (Math.max(ink, surface) + 0.05) / (Math.min(ink, surface) + 0.05);
}

function inPlainProse(chip: ReactNode) {
  return <div className="text-ink">{chip}</div>;
}

function onSurface(surface: string) {
  return (
    <div className={`flex gap-4 p-2 ${surface}`}>
      {tinted.map(({ tone, word }) => (
        <StatusChip key={word} tone={tone} word={word} />
      ))}
    </div>
  );
}

async function paintsItsOwnStanding(canvasElement: HTMLElement, word: string) {
  const chip = await within(canvasElement).findByText(word);

  await expect(getComputedStyle(markOf(chip)).backgroundColor).not.toBe(transparent);
  await expect(getComputedStyle(chip).color).not.toBe(getComputedStyle(around(chip)).color);
}

const meta = preview.meta({
  component: StatusChip,
});

/** An account whose sign-in still holds, which asks nothing of anybody. */
export const Holding = meta.story({
  args: { word: 'Connected', tone: 'positive' },
  render: (args) => inPlainProse(<StatusChip {...args} />),
  play: async ({ canvasElement }) => {
    await paintsItsOwnStanding(canvasElement, 'Connected');
  },
});

/** An account whose sign-in lapsed, carrying the amber that asks a person to look. */
export const NeedsAttention = meta.story({
  args: { word: 'Needs sign-in', tone: 'attention' },
  play: async ({ canvas }) => {
    const chip = await canvas.findByText('Needs sign-in');

    await expect(getComputedStyle(markOf(chip)).backgroundColor).not.toBe(transparent);
  },
});

/** A request the gateway could not serve, which reads as a failure rather than as a warning. */
export const Failing = meta.story({
  args: { word: 'Failed', tone: 'danger' },
  render: (args) => inPlainProse(<StatusChip {...args} />),
  play: async ({ canvasElement }) => {
    await paintsItsOwnStanding(canvasElement, 'Failed');
  },
});

/** A standing that is a quiet fact rather than an alarm, like a server that isn't running. */
export const Quiet = meta.story({
  args: { word: 'Not running', tone: 'inert' },
  play: async ({ canvas }) => {
    const chip = await canvas.findByText('Not running');

    await expect(getComputedStyle(markOf(chip)).backgroundColor).not.toBe(transparent);
  },
});

/** The four standings together, where the mark tells them apart without the color doing the work. */
export const AllStandings = meta.story({
  render: () => (
    <div className="flex gap-4">
      <StatusChip tone="positive" word="Connected" />
      <StatusChip tone="attention" word="Needs sign-in" />
      <StatusChip tone="danger" word="Failed" />
      <StatusChip tone="inert" word="Not running" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const words = ['Connected', 'Needs sign-in', 'Failed', 'Not running'];
    const marks = await Promise.all(
      words.map(async (word) => getComputedStyle(markOf(await canvas.findByText(word)))),
    );

    await expect(new Set(marks.map((mark) => mark.backgroundColor)).size).toBe(words.length);
    await expect(new Set(marks.map((mark) => mark.width)).size).toBe(1);
  },
});

/**
 * Every tinted standing on the two surfaces it prints on.
 *
 * @summary The word carries the standing on a screen that renders no color, so each ink has to
 * clear the small-text contrast floor against the toolbar and the card in either scheme.
 */
export const ReadableOnBothSurfaces = meta.story({
  render: () => (
    <div className="flex flex-col gap-2">
      {onSurface('bg-surface-toolbar')}
      {onSurface('bg-surface-card')}
    </div>
  ),
  play: async ({ canvas }) => {
    for (const { word } of tinted) {
      for (const chip of await canvas.findAllByText(word)) {
        await expect(contrastOnItsSurface(chip)).toBeGreaterThanOrEqual(4.5);
      }
    }
  },
});
