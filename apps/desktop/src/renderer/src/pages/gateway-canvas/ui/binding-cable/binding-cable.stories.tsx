import { expect, waitFor } from 'storybook/test';

import preview from '#.storybook/preview';

import { paintedBox, paintedStyle } from '../../../../shared/testing';
import { BindingCable } from './binding-cable';
import {
  cabledFlow,
  cableSeats,
  cablesDrawn,
  drawnCables,
  forScheme,
  grabEnds,
} from './binding-cable.testkit';

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

/** The pointer reaches the handle on the side the card it stands against does not cover. */
export const TheGrabHandleTakesThePointer = meta.story({
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
      await expect(clear).toHaveLength(1);
    }
  },
});
