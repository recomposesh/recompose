import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { paintedStyle } from '../../../../shared/testing';
import {
  cableSeats,
  cablesDrawn,
  forScheme,
  pulseIn,
  tiedFlow,
  tiedFlowWhileJudging,
} from '../../testing/binding-cable.testkit';
import { BindingCable } from './binding-cable';

const meta = preview.meta({
  component: BindingCable,
  args: cableSeats,
  render: () => tiedFlow(),
});

const ROUTER_TINT = { light: 'rgb(94, 92, 230)', dark: 'rgb(125, 122, 255)' };

/** A tie always breaks into dashes and always wears the router tint, pulsing or not. */
async function expectATieDrawnAsOne(canvasElement: HTMLElement): Promise<void> {
  const [tie] = await cablesDrawn(canvasElement);

  await expect(paintedStyle(tie).strokeDasharray).toBe('4px, 3px');
  await expect(paintedStyle(tie).stroke).toBe(forScheme(ROUTER_TINT.light, ROUTER_TINT.dark));
}

/** The tie to a judge breaks into dashes and wears the router tint, because an advisor belongs to its router. */
export const ATieToAJudgeDrawsDotted = meta.story({
  render: () => tiedFlow(),
  play: async ({ canvasElement }) => {
    await expectATieDrawnAsOne(canvasElement);
  },
});

/** A tie pulses while its router waits on the judge, so a person can watch judging happen. */
export const ATiePulsesWhileTheJudgeDecides = meta.story({
  render: () => tiedFlowWhileJudging(),
  play: async ({ canvasElement }) => {
    await cablesDrawn(canvasElement);

    const traveling = pulseIn(canvasElement);

    await expect(paintedStyle(traveling).stroke).toBe(
      forScheme(ROUTER_TINT.light, ROUTER_TINT.dark),
    );
  },
});

/** The tie keeps its dash and its tint while it pulses, because only the pulse joins them. */
export const AJudgingTieKeepsItsDashAndTint = meta.story({
  render: () => tiedFlowWhileJudging(),
  play: async ({ canvasElement }) => {
    await expectATieDrawnAsOne(canvasElement);
  },
});

/** A tie whose router waits on nothing stays still, so the pulse means judging and only that. */
export const ATieAtRestNeverPulses = meta.story({
  render: () => tiedFlow(),
  play: async ({ canvasElement }) => {
    await cablesDrawn(canvasElement);

    await expect(canvasElement.querySelector('.cable-pulse')).toBeNull();
  },
});

/** The judging tie in the dark scheme, where the router tint has to carry the pulse too. */
export const AJudgingTieInDarkScheme = meta.story({
  render: () => tiedFlowWhileJudging(),
  globals: { theme: 'dark' },
});
