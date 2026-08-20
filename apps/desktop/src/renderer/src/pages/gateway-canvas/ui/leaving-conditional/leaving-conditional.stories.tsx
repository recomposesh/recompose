import { expect, fn, screen } from 'storybook/test';

import preview from '#.storybook/preview';

import { LeavingConditional } from './leaving-conditional';

const meta = preview.meta({
  component: LeavingConditional,
  args: {
    leavingFor: 'failover' as const,
    routerName: 'Conditional',
    onCancel: fn(),
    onConfirm: fn(),
  },
});

function theQuestion(): HTMLElement {
  return screen.getByRole('dialog');
}

/**
 * The question names the router, the mode it would take, and what the switch takes with it.
 *
 * @summary The wording a person composed branch by branch has no second copy anywhere, so the
 * press writes nothing until they have read what it costs.
 */
export const Basic = meta.story({
  play: async () => {
    await expect(theQuestion()).toHaveTextContent('Switch the router "Conditional" to Failover?');
    await expect(theQuestion()).toHaveTextContent(/labels and rules go/);
    await expect(theQuestion()).toHaveTextContent(/judge goes with them/);
  },
});

/** The children survive the switch, which is the one thing a person most needs to hear. */
export const ItSaysTheChildrenStay = meta.story({
  play: async () => {
    await expect(theQuestion()).toHaveTextContent(/children stay/);
  },
});

/** The other spreading mode asks the same question, naming itself. */
export const LeavingForRoundRobin = meta.story({
  args: { leavingFor: 'round-robin' as const },
  play: async () => {
    await expect(theQuestion()).toHaveTextContent('to Round-robin?');
  },
});

/** Accepting the cost hands the switch back to whoever asked for it. */
export const ConfirmingAcceptsTheCost = meta.story({
  play: async ({ args, userEvent }) => {
    await userEvent.click(screen.getByRole('button', { name: 'Switch anyway' }));

    await expect(args.onConfirm).toHaveBeenCalled();
  },
});

/** Keeping the router as it stands asks for nothing at all. */
export const CancellingKeepsTheRouter = meta.story({
  play: async ({ args, userEvent }) => {
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await expect(args.onCancel).toHaveBeenCalled();
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
});

/** No switch waiting on an answer stands no question, so the panel is never covered. */
export const NoSwitchWaitingAsksNothing = meta.story({
  args: { leavingFor: undefined },
  play: async () => {
    await expect(screen.queryByRole('dialog')).toBeNull();
  },
});

/** The question in the dark scheme, where the surface has to separate from the panel behind it. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
