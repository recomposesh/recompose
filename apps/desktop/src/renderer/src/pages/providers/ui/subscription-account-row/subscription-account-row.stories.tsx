import { expect, screen, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { connectedSubscription } from '../../../../shared/testing';
import { SubscriptionAccountRow } from './subscription-account-row';

/** @summary Names every control the row stands, so a reading counts what a person can press. */
async function controlNames(canvas: { findAllByRole: (role: string) => Promise<HTMLElement[]> }) {
  return (await canvas.findAllByRole('button')).map((control) =>
    (control.getAttribute('aria-label') ?? control.textContent).trim(),
  );
}

const setupLine = 'export CLAUDE_CONFIG_DIR="/Users/ada/.recompose/subscriptions/anthropic/active"';

const meta = preview.meta({
  component: SubscriptionAccountRow,
  args: { view: connectedSubscription, shellSetupLine: setupLine },
  parameters: { bridge: { subscriptions: [connectedSubscription] } },
  decorators: [
    (Story) => (
      <ul className="mx-auto w-full max-w-column p-4">
        <Story />
      </ul>
    ),
  ],
});

/**
 * A connected account, reading leading to trailing as who it is and how it stands.
 *
 * @summary The identity holds two lines, the plan product with its plan and the address it signed
 * in as, because the connect step already taught what the account serves. The reading asks for the
 * product name, the plan, the address, and the standing word, and nothing more.
 */
export const Connected = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Claude')).toBeVisible();
    await expect(await canvas.findByText('Max')).toBeVisible();
    await expect(await canvas.findByText('dev@example.com')).toBeVisible();
    await expect(await canvas.findByText('Connected')).toBeVisible();
  },
});

/**
 * A lapsed account, whose remedy stands on the row instead of hiding behind the overflow.
 *
 * @summary A lapse is the one standing a person has to act on, so the act sits where the standing
 * is read. The reading counts the names in the row, because the same act living in two places at
 * once would leave a person choosing between two controls that sound identical.
 */
export const Lapsed = meta.story({
  args: { view: { ...connectedSubscription, standing: 'lapsed' } },
  play: async ({ canvas }) => {
    const names = await controlNames(canvas);

    await expect(names).toEqual([
      'Sign in again',
      'Actions for Anthropic',
      'Copy the Claude setup line',
    ]);
    await expect(await canvas.findByText('Signed out')).toBeVisible();
  },
});

const adopted = { ...connectedSubscription, provenance: 'machine' as const };

/**
 * An account adopted from the machine, which says so where the address is read.
 *
 * @summary Where an account came from decides both what its row offers and whether the app ever
 * touches its credential, so a person who cannot see it cannot predict what the row does.
 */
export const Adopted = meta.story({
  args: { view: adopted },
  parameters: { bridge: { subscriptions: [adopted] } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/from this machine/)).toBeVisible();
  },
});

/**
 * An adopted account that lapsed, which names the tool rather than offering a sign-in.
 *
 * @summary Signing in reaches whichever account the person picks in the tool, not the one this row
 * stands for, so the row never offers it. Only the tool that wrote the credential can renew it.
 */
export const AdoptedAndLapsed = meta.story({
  args: { view: { ...adopted, standing: 'lapsed' as const } },
  parameters: { bridge: { subscriptions: [{ ...adopted, standing: 'lapsed' as const }] } },
  play: async ({ canvas }) => {
    const names = await controlNames(canvas);

    await expect(names).toEqual(['Actions for Anthropic', 'Copy the Claude setup line']);
    await expect(await canvas.findByText('Open Claude to sign in again')).toBeVisible();
  },
});

/**
 * The overflow open on a connected account that is not the one the terminal reaches.
 *
 * @summary The menu holds the quieter acts and nothing else, because every setup detail the row
 * once copied now travels with the sign-in itself. The same two acts stand whichever account a
 * plan's tool currently runs as, since no act on this row moves that pointer.
 */
export const QuieterActions = meta.story({
  args: { view: { ...connectedSubscription, active: false } },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Actions for Anthropic' }));

    const actions = await screen.findAllByRole('menuitem');

    await expect(actions.map((action) => action.textContent)).toEqual(['Sign in again', 'Remove']);
  },
});

/**
 * The plan's chosen account, saying what choosing it did rather than leaving it to be guessed.
 *
 * @summary Choosing moves no gateway traffic, because a canvas names the account it spends. What
 * it moves is the config home the plan's own tool runs against, and the line is the only place a
 * person can see that happened. Only the chosen row carries it, so which one it is reads at a
 * glance rather than from a badge that says nothing about what it means.
 */
export const ThePlansChosenAccount = meta.story({
  args: { view: { ...connectedSubscription, active: true } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Your terminal reaches this account.')).toBeVisible();
    await expect(await canvas.findByText(setupLine)).toBeVisible();
  },
});

/** A plan whose tool this app never points carries no line, because nothing would be pointed. */
export const APlanWithNoToolToPoint = meta.story({
  args: {
    view: { ...connectedSubscription, provider: 'copilot' as const, plan: undefined, active: true },
    shellSetupLine: undefined,
  },
  parameters: {
    bridge: {
      subscriptions: [
        { ...connectedSubscription, provider: 'copilot' as const, plan: undefined, active: true },
      ],
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText('Your terminal reaches this account.')).toBeNull();
  },
});

/**
 * A second account for the same plan, whose row keeps the line off it.
 *
 * @summary Only the account a plan's tool runs as carries the line, so a person reading two rows
 * for one plan can tell which terminal reach is the live one without opening anything.
 */
export const AnAccountNobodyChose = meta.story({
  args: { view: { ...connectedSubscription, active: false } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText('Your terminal reaches this account.')).toBeNull();
    await expect(await canvas.findByText('Connected')).toBeVisible();
  },
});

/** The same row in the dark scheme, where the card lifts off the screen behind it. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
