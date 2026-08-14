import { expect, screen, waitFor } from 'storybook/test';

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

/** The reading, found the way anything reading the screen finds it rather than through the markup. */
function theError(): HTMLElement {
  return screen.getByRole('dialog', { name: 'Last error' });
}

function theChip(): HTMLElement {
  return screen.getByRole('button', { name: 'Last error' });
}

async function pressedOpen(press: (on: Element) => Promise<void>): Promise<void> {
  await press(theChip());
  await waitFor(() => {
    void expect(theError()).toBeVisible();
  });
}

async function theErrorIsPutAway(): Promise<void> {
  await waitFor(() => {
    void expect(screen.queryByRole('dialog', { name: 'Last error' })).toBeNull();
  });
}

/** The chip as a failed cable carries it: an error is waiting, and nothing else is said yet. */
export const Basic = meta.story({});

/** Pressing it hands over what the last request came to, the status and the sentence. */
export const PressingItShowsTheLastError = meta.story({
  play: async ({ userEvent }) => {
    await pressedOpen(userEvent.click);

    await expect(theError()).toHaveTextContent(/Status 502/u);
    await expect(theError()).toHaveTextContent(REFUSED);
  },
});

/** Pressing it a second time puts the error away and gives the canvas back uncovered. */
export const PressingItAgainPutsTheErrorAway = meta.story({
  play: async ({ userEvent }) => {
    await pressedOpen(userEvent.click);
    await userEvent.click(theChip());

    await theErrorIsPutAway();
  },
});

/** Esc leaves the error the same way, which is the way out that changes nothing. */
export const EscapePutsTheErrorAway = meta.story({
  play: async ({ userEvent }) => {
    await pressedOpen(userEvent.click);
    await userEvent.keyboard('{Escape}');

    await theErrorIsPutAway();
  },
});

/**
 * A chip at the very bottom of the canvas, where an error anchored below it would be cut off.
 *
 * @summary The reveal used to sit under the chip and nowhere else, so a cable near the foot of the
 * viewport hid its own reason. The reading has to stand inside the view wherever the cable is.
 */
export const AtTheFootOfTheView = meta.story({
  render: (args) => (
    <div className="flex h-screen w-72 items-end bg-surface-content p-4 dot-grid">
      <CableFailureChip {...args} />
    </div>
  ),
  play: async ({ userEvent }) => {
    await pressedOpen(userEvent.click);

    const reading = theError().getBoundingClientRect();

    await expect(reading.bottom).toBeLessThanOrEqual(window.innerHeight);
    await expect(reading.top).toBeGreaterThanOrEqual(0);
  },
});

/** A refusal the gateway itself wrote, where the status is the whole of what went wrong. */
export const ARefusedRequest = meta.story({
  args: { status: 401, detail: 'The account the gateway answers through refused the request.' },
});

/** The chip in the dark scheme, where the error ink has to read against the canvas behind it. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
