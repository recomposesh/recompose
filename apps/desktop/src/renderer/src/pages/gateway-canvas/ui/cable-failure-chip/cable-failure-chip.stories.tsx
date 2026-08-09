import { expect, waitFor } from 'storybook/test';

import preview from '#.storybook/preview';

import { CableFailureChip } from './cable-failure-chip';

const REFUSED = 'The gateway could not reach the target.';

const meta = preview.meta({
  component: CableFailureChip,
  args: { status: 502, detail: REFUSED },
  render: (args) => (
    <div className="h-40 w-72 bg-surface-content p-4 dot-grid">
      <CableFailureChip {...args} />
    </div>
  ),
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

/** Esc leaves the error the same way, which is the way out that changes nothing. */
export const EscapePutsTheErrorAway = meta.story({
  play: async ({ canvasElement, userEvent }) => {
    const chip = await pressedOpen(canvasElement, userEvent.click);

    await userEvent.keyboard('{Escape}');

    await waitFor(async () => expect(errorUnder(chip)).not.toBeVisible());
  },
});

/** A refusal the gateway itself wrote, where the status is the whole of what went wrong. */
export const ARefusedRequest = meta.story({
  args: { status: 401, detail: 'The account the gateway answers through refused the request.' },
});

/** The chip in the dark scheme, where the error ink has to read against the canvas behind it. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
