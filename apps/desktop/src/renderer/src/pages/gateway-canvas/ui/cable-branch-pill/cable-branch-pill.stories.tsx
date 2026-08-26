import { expect, fn, screen } from 'storybook/test';

import preview from '#.storybook/preview';

import type { BranchSeat } from '../../lib/route-graph';

import { paintedStyle } from '../../../../shared/testing';
import { CableBranchPill } from './cable-branch-pill';

const RULE = 'The request asks for a review of the code the caller pasted in.';

const wordedBranch: BranchSeat = { kind: 'rule', label: 'code', rule: RULE };

const meta = preview.meta({
  component: CableBranchPill,
  args: { seat: wordedBranch, onWord: fn() },
  render: (args) => (
    <div className="h-40 w-72 bg-surface-content p-4 dot-grid">
      <CableBranchPill {...args} />
    </div>
  ),
});

/** The secondary ink as the standing scheme actually paints it, read off the page. */
function quietInk(): string {
  const quiet = document.createElement('span');

  quiet.className = 'text-ink-secondary';
  document.body.append(quiet);

  const painted = paintedStyle(quiet).color;

  quiet.remove();

  return painted;
}

/**
 * A worded branch carries its label and nothing else.
 *
 * @summary The rule reads in the inspector row and edits in the sheet, so the cable is spared a
 * second reading of it: a pill per rule turned every ladder into a wall of text at the zoom a whole
 * composition fits in.
 */
export const Basic = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByRole('button', { name: 'code' })).toBeVisible();
    await expect(canvasElement.querySelectorAll('button')).toHaveLength(1);
    await expect(canvas.queryByText(RULE, { exact: false })).toBeNull();
  },
});

/** No press on the cable opens a rule, because the cable no longer carries one. */
export const TheCableOffersNoRuleReading = meta.story({
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'code' }));

    await expect(screen.queryByRole('dialog')).toBeNull();
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
 * The pill says what pressing it does, so an edit route stops reading as a decorative caption.
 *
 * @summary A button carrying a bare word announces a bare word, which is why a person who set a
 * rule once concluded there was no way back to it. The act rides as the pill's description rather
 * than as its name, so the word the judge answers with is still the word a reader hears first.
 */
export const TheLabelSaysWhatPressingItDoes = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'code' })).toHaveAccessibleDescription(
      "Press to edit this branch's prompt.",
    );
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
 * a pill loud enough to compete with the labels would claim a decision it never makes.
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
