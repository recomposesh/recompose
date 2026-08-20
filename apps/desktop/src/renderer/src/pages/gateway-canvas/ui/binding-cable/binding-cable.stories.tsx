import { expect, waitFor } from 'storybook/test';

import preview from '#.storybook/preview';

import type { BranchSeat } from '../../lib/route-graph';

import { paintedBox, paintedCentre, paintedStyle } from '../../../../shared/testing';
import {
  barelyCabledFlow,
  cabledFlow,
  cabledFlowThatLiftsChosenCables,
  cableSeats,
  cablesDrawn,
  drawnCables,
  forScheme,
  grabEnds,
  judgedFlow,
  REFUSED,
} from '../../testing/binding-cable.testkit';
import { BindingCable } from './binding-cable';

const meta = preview.meta({
  component: BindingCable,
  args: cableSeats,
  render: () => cabledFlow('resting'),
});

async function pressTheCable(canvasElement: HTMLElement, press: (on: Element) => Promise<void>) {
  const [drawn] = await cablesDrawn(canvasElement);

  if (drawn === undefined) {
    throw new Error('the canvas drew no cable to press');
  }

  await press(drawn);
}

/** A stored binding at rest, which is what every wired virtual model draws. */
export const Basic = meta.story({});

/** The cable takes the stroke the canvas fixes, so no binding reads heavier than another. */
export const TheCableTakesTheCanvasStroke = meta.story({
  play: async ({ canvasElement }) => {
    const [cable] = await cablesDrawn(canvasElement);

    await expect(paintedStyle(cable).strokeWidth).toBe('2.6px');
    await expect(paintedStyle(cable).stroke).toBe(
      forScheme('rgba(0, 0, 0, 0.45)', 'rgba(255, 255, 255, 0.45)'),
    );
  },
});

/** A cable told nothing about itself still draws, because a pane that fell over loses everything. */
export const ACableCarryingNothingStillDraws = meta.story({
  render: () => barelyCabledFlow(),
  play: async ({ canvasElement }) => {
    const [cable] = await cablesDrawn(canvasElement);

    await expect(paintedStyle(cable).stroke).toBe(
      forScheme('rgba(0, 0, 0, 0.45)', 'rgba(255, 255, 255, 0.45)'),
    );
  },
});

/** A binding whose account left the registry reads broken, so a person can find it to repair. */
export const ABrokenBindingPaintsItsStanding = meta.story({
  render: () => cabledFlow('broken'),
  play: async ({ canvasElement }) => {
    const [cable] = await cablesDrawn(canvasElement);

    await expect(paintedStyle(cable).stroke).toBe(forScheme('rgb(215, 0, 21)', 'rgb(255, 69, 58)'));
  },
});

/** A cable the overlay draws for an unfinished definition reads as a draft rather than as truth. */
export const ADraftCablePaintsItsStanding = meta.story({
  render: () => cabledFlow('draft'),
  play: async ({ canvasElement }) => {
    const [cable] = await cablesDrawn(canvasElement);

    await expect(paintedStyle(cable).stroke).toBe(
      forScheme('rgb(255, 149, 0)', 'rgb(255, 159, 10)'),
    );
  },
});

const CODE_LABEL = 'code';

const codeBranch: BranchSeat = {
  kind: 'rule',
  label: CODE_LABEL,
  rule: 'It writes code.',
};

/**
 * A cable a judge decides carries the word that sends requests down it, and nothing more.
 *
 * @summary The rule reads in the inspector row and edits in the sheet, so a ladder of branches
 * stays legible at the zoom a whole composition fits in.
 */
export const AJudgedCableCarriesItsLabel = meta.story({
  render: () => judgedFlow(codeBranch),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: CODE_LABEL })).toBeVisible();
    await expect(canvas.queryByText('It writes code.')).toBeNull();
  },
});

async function labelCentre(find: (name: string) => Promise<HTMLElement>) {
  return paintedCentre(await find(CODE_LABEL));
}

/** The label rides earlier along the path than the midpoint, which the failure chip keeps. */
export const TheLabelLeavesTheMidpointToTheFailureChip = meta.story({
  render: () => judgedFlow(codeBranch, 'failed', REFUSED),
  play: async ({ canvas }) => {
    const label = await labelCentre(async (name) => canvas.findByRole('button', { name }));
    const error = paintedCentre(await canvas.findByRole('button', { name: 'Last error' }));

    await expect(label.x).toBeLessThan(error.x);
    await expect(label.y).toBeLessThan(error.y);
  },
});

/** The label sits on the cable it names, rather than floating off the curve that bows away. */
export const TheLabelRidesTheCableItself = meta.story({
  render: () => judgedFlow(codeBranch),
  play: async ({ canvas, canvasElement }) => {
    const label = await labelCentre(async (name) => canvas.findByRole('button', { name }));
    const [cable] = await cablesDrawn(canvasElement);
    const path = paintedBox(cable);

    await expect(label.x).toBeGreaterThan(path.x);
    await expect(label.x).toBeLessThan(path.x + path.width / 2);
    await expect(label.y).toBeGreaterThan(path.y);
    await expect(label.y).toBeLessThan(path.y + path.height / 2);
  },
});

/**
 * The else cable rests like every other idle binding, and its pill alone says what it catches.
 *
 * @summary No new stroke vocabulary lands for the fallback: a dashed idle cable would say the
 * binding is unfinished, which is the one thing else never is.
 */
export const TheElseCableRestsLikeAnyOther = meta.story({
  render: () => judgedFlow({ kind: 'else' }),
  play: async ({ canvas, canvasElement }) => {
    const [cable] = await cablesDrawn(canvasElement);

    await expect(await canvas.findByText('Else')).toBeVisible();
    await expect(paintedStyle(cable).strokeDasharray).toBe('none');
    await expect(paintedStyle(cable).stroke).toBe(
      forScheme('rgba(0, 0, 0, 0.45)', 'rgba(255, 255, 255, 0.45)'),
    );
  },
});

/** A binding standing out of a cooldown paints amber and stays still, since nothing is in flight. */
export const ACoolingCablePaintsItsStanding = meta.story({
  render: () => cabledFlow('cooling'),
  play: async ({ canvasElement }) => {
    const [cable] = await cablesDrawn(canvasElement);

    await expect(paintedStyle(cable).stroke).toBe(
      forScheme('rgb(194, 122, 0)', 'rgb(255, 176, 46)'),
    );
    await expect(canvasElement.querySelector('.cable-pulse')).toBeNull();
  },
});

/** A binding cable never breaks, so the dash is what tells an advisor from a target. */
export const ABindingCableNeverBreaks = meta.story({
  play: async ({ canvasElement }) => {
    const [cable] = await cablesDrawn(canvasElement);

    await expect(paintedStyle(cable).strokeDasharray).toBe('none');
  },
});

/** Selecting doubles the cable's stroke, so the cable a press acted on is unmistakable. */
export const SelectingWidensTheCable = meta.story({
  play: async ({ canvasElement, userEvent }) => {
    const [resting] = await cablesDrawn(canvasElement);

    await expect(paintedStyle(resting).strokeWidth).toBe('2.6px');

    await pressTheCable(canvasElement, userEvent.click);
    await waitFor(async () => expect(drawnCables(canvasElement)).toHaveLength(4));

    const cable = drawnCables(canvasElement)[2];

    await expect(paintedStyle(cable).strokeWidth).toBe('3.6px');
  },
});

/** The selected cable wears the node card's own glow: a crisp ring inside a soft bloom. */
export const ASelectedCableWearsTheNodeCardGlow = meta.story({
  play: async ({ canvasElement, userEvent }) => {
    await pressTheCable(canvasElement, userEvent.click);
    await waitFor(async () => expect(drawnCables(canvasElement)).toHaveLength(4));

    const [bloom, ring, cable] = drawnCables(canvasElement);

    await expect(paintedStyle(bloom).strokeWidth).toBe('24px');
    await expect(paintedStyle(bloom).opacity).toBe('0.45');
    await expect(paintedStyle(bloom).filter).toBe('blur(5.5px)');

    await expect(paintedStyle(ring).strokeWidth).toBe('10.6px');
    await expect(paintedStyle(ring).opacity).toBe('0.55');

    await expect(paintedStyle(bloom).stroke).toBe(paintedStyle(cable).stroke);
    await expect(paintedStyle(ring).stroke).toBe(paintedStyle(cable).stroke);
  },
});

/** Both ends of a selected cable offer a handle wide enough to take the drag that rebinds it. */
export const ASelectedCableOffersAGrabHandleAtEachEnd = meta.story({
  play: async ({ canvasElement, userEvent }) => {
    await expect(await cablesDrawn(canvasElement)).toHaveLength(2);
    await expect(grabEnds(canvasElement)).toHaveLength(0);

    await pressTheCable(canvasElement, userEvent.click);
    await waitFor(async () => expect(grabEnds(canvasElement)).toHaveLength(2));

    const ends = grabEnds(canvasElement);

    for (const end of ends) {
      await expect(paintedBox(end).width).toBe(24);
      await expect(paintedBox(end).height).toBe(24);
      await expect(paintedStyle(end).cursor).toBe('grab');
    }
  },
});

/** A grab handle paints in its cable's own tint, so a broken binding stays broken to the hand. */
export const AGrabHandleTakesTheCableTint = meta.story({
  render: () => cabledFlow('broken'),
  play: async ({ canvasElement, userEvent }) => {
    await pressTheCable(canvasElement, userEvent.click);
    await waitFor(async () => expect(grabEnds(canvasElement)).toHaveLength(2));

    const broken = forScheme('rgb(215, 0, 21)', 'rgb(255, 69, 58)');

    for (const end of grabEnds(canvasElement)) {
      const dot = end.firstElementChild;

      await expect(paintedStyle(dot).borderTopColor).toBe(broken);
      await expect(paintedStyle(dot).backgroundColor).toBe(broken);
    }
  },
});

/** The pointer reaches the handle at either end, because selection lifts the cable over its cards. */
export const TheGrabHandleTakesThePointer = meta.story({
  render: () => cabledFlowThatLiftsChosenCables('resting'),
  play: async ({ canvasElement, userEvent }) => {
    await pressTheCable(canvasElement, userEvent.click);
    await waitFor(async () => expect(grabEnds(canvasElement)).toHaveLength(2));

    for (const end of grabEnds(canvasElement)) {
      const over = paintedBox(end);
      const middle = over.y + over.height / 2;
      const clear = [over.left + 1, over.right - 1].filter((across) =>
        end.contains(document.elementFromPoint(across, middle)),
      );

      await expect(paintedStyle(end).pointerEvents).toBe('auto');
      await expect(clear).toHaveLength(2);
    }
  },
});
