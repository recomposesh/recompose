import { expect, fn, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { clientNamed, servingGateway } from '../../../../entities/harness';
import { inACard } from '../../testing/on-a-surface';
import { HarnessGuide } from './harness-guide';

const meta = preview.meta({
  component: HarnessGuide,
  args: {
    client: clientNamed('claude-code'),
    facts: servingGateway,
    onOpen: fn(),
    open: true,
  },
  decorators: [inACard],
});

/** One harness and the lines that point it at the gateway a person just built. */
export const Opened = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: /Claude Code/u })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect((await canvas.findAllByRole('listitem')).length).toBeGreaterThan(0);
  },
});

/** A closed entry keeps its name and nothing else, so the list reads as a list. */
export const Closed = meta.story({
  args: { open: false },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: /Claude Code/u })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(canvas.queryAllByRole('listitem')).toHaveLength(0);
  },
});

/** Pressing the name asks for this entry, and the caller decides which one closes. */
export const OpeningAsksTheCaller = meta.story({
  args: { open: false },
  play: async ({ args, canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /Claude Code/u }));

    await expect(args.onOpen).toHaveBeenCalledOnce();
  },
});

/** The lines are written from the gateway's own facts, never from copy kept beside them. */
export const TheLinesCarryTheGatewayItBuilt = meta.story({
  play: async ({ canvas }) => {
    await expect((await canvas.findAllByText(/127\.0\.0\.1:8397/u)).length).toBeGreaterThan(0);
  },
});

/** Nothing marks an entry done: setup cannot see inside a terminal. */
export const NothingClaimsItIsDone = meta.story({
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-glyph="check"]')).toBeNull();
  },
});
