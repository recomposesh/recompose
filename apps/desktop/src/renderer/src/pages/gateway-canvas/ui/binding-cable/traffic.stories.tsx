import { expect, screen } from 'storybook/test';

import preview from '#.storybook/preview';

import { paintedStyle } from '../../../../shared/testing';
import {
  REFUSED,
  cableSeats,
  cabledFlow,
  cablesDrawn,
  forScheme,
  pulseIn,
} from '../../testing/binding-cable.testkit';
import { BindingCable } from './binding-cable';

const meta = preview.meta({
  component: BindingCable,
  args: cableSeats,
  render: () => cabledFlow('served'),
});

const SERVED_INK = { light: 'rgb(26, 158, 51)', dark: 'rgb(50, 215, 75)' };

const LIVE_INK = { light: 'rgb(40, 205, 65)', dark: 'rgb(50, 215, 75)' };

const FAILED_INK = { light: 'rgb(215, 0, 21)', dark: 'rgb(255, 69, 58)' };

function stilled(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

async function standsWholeAndStill(canvasElement: HTMLElement): Promise<void> {
  const [cable] = await cablesDrawn(canvasElement);

  await expect(paintedStyle(cable).strokeDasharray).toBe('none');
  await expect(paintedStyle(cable).animationName).toBe('none');
  await expect(canvasElement.querySelector('.cable-pulse')).toBeNull();
}

/** A binding whose last request came back served reads green, which no cable wears unearned. */
export const AServedBindingPaintsItsStanding = meta.story({
  play: async ({ canvasElement }) => {
    const [cable] = await cablesDrawn(canvasElement);

    await expect(paintedStyle(cable).stroke).toBe(forScheme(SERVED_INK.light, SERVED_INK.dark));
  },
});

/** A live binding keeps its line whole and sends a pulse down it, which is what flowing looks like. */
export const ALiveBindingPulsesAlongAWholeLine = meta.story({
  render: () => cabledFlow('live'),
  play: async ({ canvasElement }) => {
    const [cable] = await cablesDrawn(canvasElement);
    const traveling = pulseIn(canvasElement);

    await expect(paintedStyle(cable).strokeDasharray).toBe('none');
    await expect(paintedStyle(traveling).stroke).toBe(forScheme(LIVE_INK.light, LIVE_INK.dark));
    await expect(paintedStyle(traveling).animationName).toBe(
      stilled() ? 'none' : 'cable-pulse-travel',
    );
  },
});

/**
 * A request in flight stays readable on a machine that asked for no motion.
 *
 * @summary Travel is the only thing reduced motion may take. The dark scheme paints `live` and
 * `served` the same green, so a pulse that went transparent left the two standings identical and a
 * person watching a streaming answer saw a cable that never flowed at all. The whole suite runs
 * under reduce, so this is the one scenario standing between that reading and the canvas.
 */
export const ALiveBindingStaysReadableWhenMotionStandsDown = meta.story({
  render: () => cabledFlow('live'),
  play: async ({ canvasElement }) => {
    await cablesDrawn(canvasElement);

    const traveling = pulseIn(canvasElement);

    await expect(paintedStyle(traveling).opacity).toBe('1');
    await expect(paintedStyle(traveling).visibility).toBe('visible');
  },
});

/** The pulse is decoration, so it never takes the press meant for the cable it rides. */
export const ThePulseTakesNoPointer = meta.story({
  render: () => cabledFlow('live'),
  play: async ({ canvasElement }) => {
    await cablesDrawn(canvasElement);

    await expect(paintedStyle(pulseIn(canvasElement)).pointerEvents).toBe('none');
  },
});

/** A binding whose last request failed reads red, so the one that stopped answering is findable. */
export const AFailedBindingPaintsItsStanding = meta.story({
  render: () => cabledFlow('failed', REFUSED),
  play: async ({ canvasElement }) => {
    const [cable] = await cablesDrawn(canvasElement);

    await expect(paintedStyle(cable).stroke).toBe(forScheme(FAILED_INK.light, FAILED_INK.dark));
  },
});

/** A failed binding holds its line whole and still, because red already carries the news. */
export const AFailedBindingStandsWholeAndStill = meta.story({
  render: () => cabledFlow('failed', REFUSED),
  play: async ({ canvasElement }) => {
    await standsWholeAndStill(canvasElement);
  },
});

/** A binding nothing has flowed through stands still and whole, so movement always means a request. */
export const AnUntriedBindingStandsStill = meta.story({
  render: () => cabledFlow('resting'),
  play: async ({ canvasElement }) => {
    await standsWholeAndStill(canvasElement);
  },
});

/** The failed binding carries the last error, which hands over the status and the sentence. */
export const AFailedBindingCarriesItsLastError = meta.story({
  render: () => cabledFlow('failed', REFUSED),
  play: async ({ canvas, userEvent }) => {
    const chip = await canvas.findByRole('button', { name: /last error/i });

    await userEvent.click(chip);

    const reading = await screen.findByRole('dialog', { name: 'Last error' });

    await expect(reading).toHaveTextContent(REFUSED.detail);
    await expect(reading).toHaveTextContent(/Status 502/u);

    const lifted = chip.closest('.react-flow__edgelabel-renderer > div');

    await expect(getComputedStyle(lifted ?? chip).zIndex).toBe('1002');
  },
});

/** Reading the error leaves the cable where it was, so the drawer never opens behind the answer. */
export const ReadingTheErrorSelectsNothing = meta.story({
  render: () => cabledFlow('failed', REFUSED),
  play: async ({ canvas, canvasElement, userEvent }) => {
    await cablesDrawn(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: /last error/i }));

    await expect(await screen.findByRole('dialog', { name: 'Last error' })).toBeVisible();
    await expect(canvasElement.querySelector('.react-flow__edge.selected')).toBeNull();
  },
});

/** A binding nothing has failed through carries no error to press, so green needs no explaining. */
export const AServedBindingCarriesNoError = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await cablesDrawn(canvasElement);

    await expect(canvas.queryByRole('button', { name: /last error/i })).toBeNull();
  },
});

/** A failed binding in the dark scheme, where the error ink has to read against the canvas. */
export const DarkScheme = meta.story({
  render: () => cabledFlow('failed', REFUSED),
  globals: { theme: 'dark' },
});
