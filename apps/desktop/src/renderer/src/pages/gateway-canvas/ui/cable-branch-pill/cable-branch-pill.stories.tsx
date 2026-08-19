import { expect, screen, waitFor } from 'storybook/test';

import preview from '#.storybook/preview';

import type { BranchSeat } from '../../lib/route-graph';

import { paintedStyle } from '../../../../shared/testing';
import { RULE_PILL_CHARACTERS } from '../../lib/cable-standing';
import { CableBranchPill } from './cable-branch-pill';

const SHORT_RULE = 'It writes code.';

const LONG_RULE = 'The request asks for a review of the code the caller pasted in.';

const shortBranch: BranchSeat = { kind: 'rule', label: 'code', rule: SHORT_RULE };

const longBranch: BranchSeat = { kind: 'rule', label: 'code', rule: LONG_RULE };

const meta = preview.meta({
  component: CableBranchPill,
  args: { seat: shortBranch },
  render: (args) => (
    <div className="h-40 w-72 bg-surface-content p-4 dot-grid">
      <CableBranchPill {...args} />
    </div>
  ),
});

function theRule(): HTMLElement {
  return screen.getByRole('dialog', { name: 'code rule' });
}

/** The secondary ink as the standing scheme actually paints it, read off the page. */
function quietInk(): string {
  const quiet = document.createElement('span');

  quiet.className = 'text-ink-secondary';
  document.body.append(quiet);

  const painted = paintedStyle(quiet).color;

  quiet.remove();

  return painted;
}

async function pressedOpen(pill: HTMLElement, press: (on: Element) => Promise<void>) {
  await press(pill);
  await waitFor(() => {
    void expect(theRule()).toBeVisible();
  });
}

/** A labeled branch as its cable carries it, printing the rule that sends requests down it. */
export const Basic = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: SHORT_RULE })).toBeVisible();
  },
});

/** A rule longer than the span between two columns cuts, so the pill never covers a card. */
export const ALongRuleCutsToTheClearSpan = meta.story({
  args: { seat: longBranch },
  play: async ({ canvas }) => {
    const pill = await canvas.findByRole('button');
    const shown = pill.textContent;

    await expect(shown.length).toBeLessThanOrEqual(RULE_PILL_CHARACTERS);
    await expect(LONG_RULE.startsWith(shown.slice(0, -1))).toBe(true);
    await expect(pill).toHaveAttribute('title', LONG_RULE);
  },
});

/** Pressing the pill hands over the whole rule and the label the judge answers with. */
export const PressingItShowsTheWholeRule = meta.story({
  args: { seat: longBranch },
  play: async ({ canvas, userEvent }) => {
    await pressedOpen(await canvas.findByRole('button'), userEvent.click);

    await expect(theRule()).toHaveTextContent(LONG_RULE);
    await expect(theRule()).toHaveTextContent('code');
  },
});

/** Esc puts the rule away and leaves the composition exactly where the person left it. */
export const EscapePutsTheRuleAway = meta.story({
  args: { seat: longBranch },
  play: async ({ canvas, userEvent }) => {
    await pressedOpen(await canvas.findByRole('button'), userEvent.click);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => {
      void expect(screen.queryByRole('dialog', { name: 'code rule' })).toBeNull();
    });
  },
});

/**
 * The fallback says its role quietly and offers nothing to press, since nobody wrote it a rule.
 *
 * @summary Else catches whatever the other branches did not, so the pill states that and stops:
 * a pill loud enough to compete with the rules would claim a decision it never makes.
 */
export const TheFallbackSaysItsRoleQuietly = meta.story({
  args: { seat: { kind: 'else' } },
  play: async ({ canvas }) => {
    const pill = await canvas.findByText('Else');
    const quiet = quietInk();

    await expect(pill).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
    await expect(paintedStyle(pill).color).toBe(quiet);
  },
});

/** The pill in the dark scheme, where its ink has to read against the canvas behind it. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
