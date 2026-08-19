import { expect, fn, screen, waitFor } from 'storybook/test';

import preview from '#.storybook/preview';

import type { BranchSeat } from '../../lib/route-graph';

import { paintedStyle } from '../../../../shared/testing';
import { RULE_PILL_CHARACTERS, ruleShown } from '../../lib/cable-standing';
import { CableBranchPill } from './cable-branch-pill';

const SHORT_RULE = 'It writes code.';

const LONG_RULE = 'The request asks for a review of the code the caller pasted in.';

const shortBranch: BranchSeat = { kind: 'rule', label: 'code', rule: SHORT_RULE };

const longBranch: BranchSeat = { kind: 'rule', label: 'code', rule: LONG_RULE };

const meta = preview.meta({
  component: CableBranchPill,
  args: { seat: shortBranch, onWord: fn() },
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

async function pressedTheRuleOpen(press: (on: Element) => Promise<void>) {
  await press(screen.getByRole('button', { name: ruleShown(LONG_RULE) }));
  await waitFor(() => {
    void expect(theRule()).toBeVisible();
  });
}

/** A worded branch carries the label its judge answers with beside the rule behind it. */
export const Basic = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'code' })).toBeVisible();
    await expect(await canvas.findByRole('button', { name: SHORT_RULE })).toBeVisible();
  },
});

/** A rule longer than the span between two columns cuts, so the pill never covers a card. */
export const ALongRuleCutsToTheClearSpan = meta.story({
  args: { seat: longBranch },
  play: async ({ canvas }) => {
    const pill = await canvas.findByRole('button', { name: ruleShown(LONG_RULE) });
    const shown = pill.textContent;

    await expect(shown.length).toBeLessThanOrEqual(RULE_PILL_CHARACTERS);
    await expect(LONG_RULE.startsWith(shown.slice(0, -1))).toBe(true);
    await expect(pill).toHaveAttribute('title', LONG_RULE);
  },
});

/** Pressing the rule hands over the whole of it and the label the judge answers with. */
export const PressingTheRuleShowsTheWholeOfIt = meta.story({
  args: { seat: longBranch },
  play: async ({ userEvent }) => {
    await pressedTheRuleOpen(userEvent.click);

    await expect(theRule()).toHaveTextContent(LONG_RULE);
    await expect(theRule()).toHaveTextContent('code');
  },
});

/** Esc puts the rule away and leaves the composition exactly where the person left it. */
export const EscapePutsTheRuleAway = meta.story({
  args: { seat: longBranch },
  play: async ({ userEvent }) => {
    await pressedTheRuleOpen(userEvent.click);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => {
      void expect(screen.queryByRole('dialog', { name: 'code rule' })).toBeNull();
    });
  },
});

/**
 * Pressing the label asks to reword the branch, since the label is the judge's own vocabulary.
 *
 * @summary Renaming reroutes traffic rather than tidying a caption, so the press that starts it
 * lives on the label itself where a person reads that word, not behind a panel two steps away.
 */
export const PressingTheLabelAsksToRewordIt = meta.story({
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'code' }));

    await expect(args.onWord).toHaveBeenCalled();
  },
});

/**
 * A branch nobody has worded yet wears the attention tint and asks for its name.
 *
 * @summary A child under a judged router that carries no label is a branch the judge can never
 * name, so the cable says the composition is unfinished rather than looking finished and quietly
 * sending every request to else.
 */
export const ABranchStillToBeNamed = meta.story({
  args: { seat: { kind: 'draft' } },
  play: async ({ args, canvas, userEvent }) => {
    const pill = await canvas.findByRole('button', { name: 'Name this branch' });

    await expect(pill).toBeVisible();

    await userEvent.click(pill);

    await expect(args.onWord).toHaveBeenCalled();
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

/** A branch still to be named in the dark scheme, where the attention tint has to carry. */
export const ADraftInDarkScheme = meta.story({
  args: { seat: { kind: 'draft' } },
  globals: { theme: 'dark' },
});
