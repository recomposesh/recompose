import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { paintedCentre } from '../../../../shared/testing';
import {
  cableSeats,
  cablesDrawn,
  judgedFlow,
  judgedFlowBesideAChosenCard,
  judgedFlowUnderALiftedCable,
  REFUSED,
} from '../../testing/binding-cable.testkit';
import {
  branchPillOn,
  oneCableOn,
  readsAboveTheCable,
  sagOffTheCable,
} from '../../testing/cable-geometry.testkit';
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

const CODE_BRANCH = { kind: 'rule' as const, label: 'code', rule: 'It writes code.' };

async function labelPillOn(canvasElement: HTMLElement): Promise<Element> {
  await cablesDrawn(canvasElement);

  return branchPillOn(canvasElement, CODE_BRANCH.label);
}

/**
 * The label reads above its cable while the card at the cable's far end stands selected.
 *
 * @summary Choosing a card lifts the cables it holds, and a pill the lifted stroke paints across
 * is a word with a line struck through it: the label still measures, still reads to a screen
 * reader, and is illegible on the screen. The furniture rides above every cable for that reason,
 * because a person reads the word the judge answers with off the canvas rather than off a panel.
 */
export const TheLabelReadsAboveTheCableWhileANeighborIsChosen = meta.story({
  render: () => judgedFlowUnderALiftedCable(CODE_BRANCH),
  play: async ({ canvasElement }) => {
    await expect(readsAboveTheCable(await labelPillOn(canvasElement))).toBe(true);
  },
});

/** With nothing chosen at all the label reads above its cable just the same, never under it. */
export const TheLabelReadsAboveTheCableAtRest = meta.story({
  render: () => judgedFlow(CODE_BRANCH),
  play: async ({ canvasElement }) => {
    await expect(readsAboveTheCable(await labelPillOn(canvasElement))).toBe(true);
  },
});

/** The failure chip rides the same layer, so a selected cable never strikes through its reason. */
export const TheFailureChipReadsAboveTheCable = meta.story({
  render: () => judgedFlowUnderALiftedCable(CODE_BRANCH, 'failed', REFUSED),
  play: async ({ canvas, canvasElement }) => {
    await cablesDrawn(canvasElement);

    await expect(
      readsAboveTheCable(await canvas.findByRole('button', { name: 'Last error' })),
    ).toBe(true);
  },
});

/** The furniture in the dark scheme, where the pill has to keep its edge against the line. */
export const DarkScheme = meta.story({
  render: () => judgedFlowBesideAChosenCard({ kind: 'else' }),
  globals: { theme: 'dark' },
});
