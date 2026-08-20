import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { paintedCentre } from '../../../../shared/testing';
import {
  cableSeats,
  cablesDrawn,
  judgedFlow,
  judgedFlowBesideAChosenCard,
} from '../../testing/binding-cable.testkit';
import { oneCableOn, sagOffTheCable } from '../../testing/cable-geometry.testkit';
import { BindingCable } from './binding-cable';

const meta = preview.meta({
  component: BindingCable,
  args: cableSeats,
  render: () => judgedFlow({ kind: 'else' }),
});

const A_HAIRS_BREADTH = 1.5;

async function elsePillAgainstItsCable(canvasElement: HTMLElement): Promise<number> {
  await cablesDrawn(canvasElement);

  const cable = oneCableOn(canvasElement);
  const pill = canvasElement.querySelector('.react-flow__edgelabel-renderer span');

  return sagOffTheCable(paintedCentre(pill), cable);
}

/** The pill sits on the line it names, centered across the stroke rather than hanging off it. */
export const TheLabelCentresOnItsCable = meta.story({
  play: async ({ canvasElement }) => {
    await expect(await elsePillAgainstItsCable(canvasElement)).toBeLessThan(A_HAIRS_BREADTH);
  },
});

/**
 * The same pill while the card at the cable's far end stands selected, which must move nothing.
 *
 * @summary Picking a neighbor is the commonest thing a person does on this canvas, and a label
 * that sagged off its line every time would read as the cable having moved rather than the card
 * having been chosen.
 */
export const TheLabelHoldsItsLineWhileANeighborIsChosen = meta.story({
  render: () => judgedFlowBesideAChosenCard({ kind: 'else' }),
  play: async ({ canvasElement }) => {
    await expect(await elsePillAgainstItsCable(canvasElement)).toBeLessThan(A_HAIRS_BREADTH);
  },
});

/**
 * The pill once the cable itself is selected, which widens the stroke and lays a halo under it.
 *
 * @summary Selection adds two more paths and two grab handles to the same group, so the pill's own
 * anchoring has to read the line it names rather than whatever the group happens to draw first.
 */
export const TheLabelHoldsItsLineWhileTheCableIsChosen = meta.story({
  play: async ({ canvasElement, userEvent }) => {
    await cablesDrawn(canvasElement);
    await userEvent.click(oneCableOn(canvasElement));

    await expect(await elsePillAgainstItsCable(canvasElement)).toBeLessThan(A_HAIRS_BREADTH);
  },
});

/** The furniture in the dark scheme, where the pill has to keep its edge against the line. */
export const DarkScheme = meta.story({
  render: () => judgedFlowBesideAChosenCard({ kind: 'else' }),
  globals: { theme: 'dark' },
});
