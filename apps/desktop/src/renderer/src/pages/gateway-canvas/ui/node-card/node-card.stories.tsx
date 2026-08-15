import { expect, fn, waitFor } from 'storybook/test';

import preview from '#.storybook/preview';

import type { NodeCardProps } from './node-card';

import { paintedBox, paintedStyle } from '../../../../shared/testing';
import { cardOnCanvas, draggedFromPort, inScheme } from '../../testing/canvas-flow.testkit';
import { NodeCard } from './node-card';

type WornBy = { data: NodeCardProps; selected: boolean };

function CardUnderProof({ data, selected }: WornBy) {
  return <NodeCard {...data} selected={selected} />;
}

const worn: NodeCardProps = {
  chipGlyph: 'spark',
  chipMark: undefined,
  chipTint: 'text-virtual-model',
  frame: '',
  incoming: true,
  kicker: 'Virtual model',
  kickerTint: 'text-virtual-model-ink',
  name: 'Everyday Sonnet',
  nameInk: 'text-ink',
  outgoing: { bound: true, ask: 'Pick a provider', onAsk: fn(() => {}) },
  selected: false,
  subtitle: 'sonnet-latest',
  subtitleInk: 'text-ink-secondary',
  tint: 'node-tint-virtual-model',
};

const meta = preview.meta({
  component: NodeCard,
  args: worn,
  render: (args) => cardOnCanvas('virtual-model', CardUnderProof, args, args.selected),
});

const plus = { name: 'Pick a provider' };

/** The template every canvas card wears, which is the one place its measure is decided. */
export const Basic = meta.story({});

/** The card takes the template's measure, so cables draw against it on the very first paint. */
export const TheCardTakesTheTemplateMeasure = meta.story({
  play: async ({ canvas }) => {
    const drawn = paintedBox(await canvas.findByRole('button', { name: /Everyday Sonnet/ }));

    await expect(drawn.width).toBe(184);
    await expect(drawn.height).toBe(88);
  },
});

/** The kicker reads at ten in caps and the line under the name at eleven in mono. */
export const TheTypeScaleFollowsTheTemplate = meta.story({
  play: async ({ canvas }) => {
    const lines = (await canvas.findByRole('button', { name: /Everyday Sonnet/ })).children;

    await expect(paintedStyle(lines[0]?.children[1]).fontSize).toBe('10px');
    await expect(paintedStyle(lines[0]?.children[1]).textTransform).toBe('uppercase');
    await expect(paintedStyle(lines[1]).fontSize).toBe('13px');
    await expect(paintedStyle(lines[1]).fontWeight).toBe('600');
    await expect(paintedStyle(lines[2]).fontSize).toBe('11px');
    await expect(paintedStyle(lines[2]).fontFamily).toContain('SF Mono');
  },
});

/** Both ports hang where the template measures them, each on a target a pointer can hit. */
export const EveryPortStandsOnAPointerTarget = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await canvas.findByRole('button', { name: /Everyday Sonnet/ });

    const ports = canvasElement.querySelectorAll('.react-flow__handle');

    await expect(ports).toHaveLength(2);

    for (const port of ports) {
      await expect(paintedStyle(port).top).toBe('44px');
      await expect(paintedBox(port).width).toBe(24);
      await expect(paintedBox(port).height).toBe(24);
      await expect(paintedBox(port.firstElementChild).width).toBe(9);
    }
  },
});

/** A bound port fills with the card's tint, and one nothing answers yet keeps the card's surface. */
export const APortFillsOnlyOnceACableMeetsIt = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await canvas.findByRole('button', { name: /Everyday Sonnet/ });

    const bound = canvasElement.querySelector('.react-flow__handle.source > span');

    await expect(paintedStyle(bound).backgroundColor).toBe(
      inScheme('rgb(173, 45, 117)', 'rgb(255, 114, 196)'),
    );
  },
});

/** The ask paints nothing for a pointer: no icon stands beside the card and no click reaches it. */
export const TheAskStaysUnpaintedForAPointer = meta.story({
  play: async ({ canvas }) => {
    const ask = await canvas.findByRole('button', plus);

    await expect(paintedStyle(ask).opacity).toBe('0');
    await expect(paintedStyle(ask).pointerEvents).toBe('none');
  },
});

/** The ask steps aside while a cable is in flight, since the drag already asks the same thing. */
export const TheAskStepsAsideForACableInFlight = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await canvas.findByRole('button', plus);

    await waitFor(async () => {
      draggedFromPort(canvasElement.querySelector('.react-flow__handle.source'));
      await expect(canvas.queryByRole('button', plus)).toBeNull();
    });

    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    await expect(await canvas.findByRole('button', plus)).toBeInTheDocument();
  },
});

/** A keyboard reaches the card and then its ask, which paints only once focus lands on it. */
export const TheKeyboardReachesTheCardAndItsAsk = meta.story({
  play: async ({ canvas, userEvent }) => {
    const card = await canvas.findByRole('button', { name: /Everyday Sonnet/ });

    await userEvent.tab();
    await expect(card).toHaveFocus();
    await expect(paintedStyle(card).outlineColor).toBe('rgba(0, 0, 0, 0)');

    await userEvent.tab();

    const ask = await canvas.findByRole('button', plus);

    await expect(ask).toHaveFocus();
    await expect(paintedBox(ask).width).toBe(24);
    await expect(paintedBox(ask).height).toBe(24);
    await expect(paintedStyle(ask).opacity).toBe('1');
  },
});

/** A name too long for the card cuts off and hands its whole self to a pointer resting on it. */
export const ALongNameTruncatesAndKeepsItsWhole = meta.story({
  args: { name: 'The one everybody points their editor at on a Monday morning' },
  play: async ({ canvas }) => {
    const line = (await canvas.findByRole('button', { name: /Monday morning/ })).children[1];

    await expect(line).toHaveAttribute(
      'title',
      'The one everybody points their editor at on a Monday morning',
    );
    await expect(paintedStyle(line).textOverflow).toBe('ellipsis');
    await expect(paintedBox(line).width).toBeLessThan(184);
  },
});

/** A selected card rings in its own tint, which is how the canvas says the inspector is on it. */
export const ASelectedCardRingsInItsTint = meta.story({
  args: { selected: true },
  play: async ({ canvas }) => {
    const card = await canvas.findByRole('button', { name: /Everyday Sonnet/ });

    await expect(card).toHaveAttribute('aria-pressed', 'true');
    await expect(paintedStyle(card).boxShadow).toContain(
      inScheme(
        'color(srgb 0.678431 0.176471 0.458824 / 0.55)',
        'color(srgb 1 0.447059 0.768627 / 0.55)',
      ),
    );
  },
});
