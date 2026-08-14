import type { ComponentProps } from 'react';

import { expect, waitFor } from 'storybook/test';

import preview from '#.storybook/preview';

import { CableFailureChip } from './cable-failure-chip';

const REFUSED = 'The gateway could not reach the target.';

type ChipInProps = ComponentProps<typeof CableFailureChip> & { shell: string };

function ChipIn({ shell, ...args }: ChipInProps) {
  return (
    <div className={shell}>
      <CableFailureChip {...args} />
    </div>
  );
}

const meta = preview.meta({
  component: CableFailureChip,
  args: { status: 502, detail: REFUSED },
  render: (args) => <ChipIn shell="h-40 w-72 bg-surface-content p-4 dot-grid" {...args} />,
});

function chipIn(canvasElement: HTMLElement): HTMLElement {
  const chip = canvasElement.querySelector<HTMLElement>('button[aria-controls]');

  if (chip === null) {
    throw new Error('no last-error chip stands on the canvas');
  }

  return chip;
}

function errorUnder(chip: HTMLElement): HTMLElement {
  const reading = document.getElementById(chip.getAttribute('aria-controls') ?? '');

  if (reading === null) {
    throw new Error('the chip points at no reading of its own');
  }

  return reading;
}

/**
 * How far the reading stands from the chip, counted positive below it and negative above.
 *
 * @summary One reading carries both facts the anchoring has to get right: which side of the chip
 * the reveal took, and that the gap is the same either way, since flipping swaps the block margins
 * rather than dropping one.
 */
function readingOffset(chip: HTMLElement): number {
  const stood = chip.getBoundingClientRect();
  const reading = errorUnder(chip).getBoundingClientRect();

  return reading.top >= stood.bottom ? reading.top - stood.bottom : reading.bottom - stood.top;
}

function theSentenceMeetsThePointer(chip: HTMLElement): boolean {
  const sentence = errorUnder(chip).querySelector<HTMLElement>('[data-failure-detail]');

  if (sentence === null) {
    return false;
  }

  const box = sentence.getBoundingClientRect();

  return sentence.contains(
    document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2),
  );
}

async function pressedOpen(
  canvasElement: HTMLElement,
  press: (on: Element) => Promise<void>,
): Promise<HTMLElement> {
  const chip = chipIn(canvasElement);

  await press(chip);
  await waitFor(async () => expect(errorUnder(chip)).toBeVisible());

  return chip;
}

/** The chip as a failed cable carries it: an error is waiting, and nothing else is said yet. */
export const Basic = meta.story({});

/** Pressing it hands over what the last request came to, the status and the sentence. */
export const PressingItShowsTheLastError = meta.story({
  play: async ({ canvasElement, userEvent }) => {
    const chip = await pressedOpen(canvasElement, userEvent.click);

    await expect(errorUnder(chip)).toHaveTextContent(/Status 502/);
    await expect(errorUnder(chip)).toHaveTextContent(REFUSED);
  },
});

/** Pressing it a second time puts the error away and gives the canvas back uncovered. */
export const PressingItAgainPutsTheErrorAway = meta.story({
  play: async ({ canvasElement, userEvent }) => {
    const chip = await pressedOpen(canvasElement, userEvent.click);

    await userEvent.click(chip);

    await waitFor(async () => expect(errorUnder(chip)).not.toBeVisible());
  },
});

/** With room under the chip, the reading opens downward, which is where a person looks first. */
export const TheReadingOpensUnderTheChip = meta.story({
  play: async ({ canvasElement, userEvent }) => {
    const chip = await pressedOpen(canvasElement, userEvent.click);

    await expect(readingOffset(chip)).toBeCloseTo(4, 0);
  },
});

/** A cable near the bottom edge flips its reading above rather than letting it clip away. */
export const AChipAtTheBottomEdgeFlipsItsReading = meta.story({
  render: (args) => (
    <ChipIn shell="fixed inset-s-0 bottom-0 w-72 bg-surface-content p-4 dot-grid" {...args} />
  ),
  play: async ({ canvasElement, userEvent }) => {
    const chip = await pressedOpen(canvasElement, userEvent.click);

    await expect(readingOffset(chip)).toBeCloseTo(-4, 0);
  },
});

/** The pane a cable is drawn in clips its own box, and the reading has to paint clear of it. */
export const TheReadingPaintsClearOfAPaneThatClips = meta.story({
  render: (args) => (
    <ChipIn shell="h-8 w-24 overflow-hidden bg-surface-content dot-grid" {...args} />
  ),
  play: async ({ canvasElement, userEvent }) => {
    const chip = await pressedOpen(canvasElement, userEvent.click);

    await expect(theSentenceMeetsThePointer(chip)).toBe(true);
  },
});

/** A refusal the gateway itself wrote, where the status is the whole of what went wrong. */
export const ARefusedRequest = meta.story({
  args: { status: 401, detail: 'The account the gateway answers through refused the request.' },
});

/** The chip in the dark scheme, where the error ink has to read against the canvas behind it. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
