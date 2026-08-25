import { expect, fn, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { claudePlan, ollama } from '../../testing/found-source';
import { inACard } from '../../testing/on-a-surface';
import { SourceRow } from './source-row';

const meta = preview.meta({
  component: SourceRow,
  args: { marked: false, onToggle: fn(), source: claudePlan },
  decorators: [inACard],
});

/** A plan the machine holds, carrying the account that tells it apart from another. */
export const Unmarked = meta.story({
  play: async ({ canvas }) => {
    const row = await canvas.findByRole('button', { name: /Your Claude plan/u });

    await expect(row).toHaveAttribute('aria-pressed', 'false');
    await expect(await canvas.findByText('alpcan@alpcanaydin.com')).toBeVisible();
  },
});

/** A marked row reports the standing rather than leaving it to the box alone. */
export const Marked = meta.story({
  args: { marked: true },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: /Your Claude plan/u })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
});

/** The tick reads against the fill it sits on rather than inheriting the surface's own ink. */
export const TheTickReadsAgainstItsFill = meta.story({
  args: { marked: true },
  play: async ({ canvasElement }) => {
    const box = canvasElement.querySelector('[aria-hidden="true"]');

    if (!box) {
      throw new Error('The row drew no standing box.');
    }

    await expect(getComputedStyle(box).color).toBe('rgb(255, 255, 255)');
  },
});

/** A source carrying a condition says it under the row rather than leaving it to be discovered. */
export const WithACondition = meta.story({
  args: { note: "Claude Code signs in on its own and spends this plan, under Claude's terms." },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/spends this plan/u)).toBeVisible();
  },
});

/** A local runtime reads its address, because that is what tells two of them apart. */
export const ALocalRuntime = meta.story({
  args: { source: ollama },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('127.0.0.1:11434')).toBeVisible();
  },
});

/** The whole row takes the press, so the box in the margin is never the only target. */
export const TheWholeRowPresses = meta.story({
  play: async ({ args, canvas }) => {
    await userEvent.click(await canvas.findByText('alpcan@alpcanaydin.com'));

    await expect(args.onToggle).toHaveBeenCalledOnce();
  },
});
