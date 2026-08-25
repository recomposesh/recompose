import { expect, fn, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { clientNamed } from '../../../../entities/harness';
import { HarnessTile } from './harness-tile';

const meta = preview.meta({
  component: HarnessTile,
  args: { client: clientNamed('claude-code'), onToggle: fn(), picked: false },
  decorators: [
    (Story) => (
      <div className="w-19 bg-surface-content p-4">
        <Story />
      </div>
    ),
  ],
});

/** A harness nobody has picked, drawn with its own mark and its catalog name. */
export const Unpicked = meta.story({
  play: async ({ canvas }) => {
    const tile = await canvas.findByRole('button', { name: /Claude Code/u });

    await expect(tile).toHaveAttribute('aria-pressed', 'false');
  },
});

/** A picked harness reports the standing rather than leaving it to the border alone. */
export const Picked = meta.story({
  args: { picked: true },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: /Claude Code/u })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
});

/** The whole tile takes the press, so the box in the corner is never the only target. */
export const TheWholeTilePresses = meta.story({
  play: async ({ args, canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /Claude Code/u }));

    await expect(args.onToggle).toHaveBeenCalledOnce();
  },
});

/** The tick reads against the fill it sits on rather than inheriting the surface's own ink. */
export const TheTickReadsAgainstItsFill = meta.story({
  args: { picked: true },
  play: async ({ canvasElement }) => {
    const box = canvasElement.querySelector('[aria-hidden="true"]');

    if (!box) {
      throw new Error('The tile drew no standing box.');
    }

    const painted = getComputedStyle(box);

    await expect(painted.color).not.toBe(painted.backgroundColor);
    await expect(painted.color).toBe('rgb(255, 255, 255)');
  },
});

/** One press reads as one press, because the box in the corner takes none of its own. */
export const TheBoxTakesNoPressOfItsOwn = meta.story({
  play: async ({ args, canvasElement }) => {
    const box = canvasElement.querySelector('[aria-hidden="true"]');

    if (!box) {
      throw new Error('The tile drew no standing box.');
    }

    await userEvent.click(box);

    await expect(args.onToggle).toHaveBeenCalledOnce();
  },
});
