import { expect, fn, screen, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { BranchRuleSheet } from './branch-rule-sheet';

const meta = preview.meta({
  component: BranchRuleSheet,
  args: {
    open: true,
    onOpenChange: () => {},
    branch: { label: 'code', rule: 'questions about source code' },
    routesTo: 'Work key · claude-sonnet-5',
    onSave: () => {},
  },
});

/** The three things a branch is: the word the judge answers with, where it goes, and its rule. */
export const Basic = meta.story({
  play: async () => {
    await expect(await screen.findByLabelText('Label')).toHaveValue('code');
    await expect(await screen.findByLabelText('Rule as prompt')).toHaveValue(
      'questions about source code',
    );
    await expect(await screen.findByText('Work key · claude-sonnet-5')).toBeVisible();
  },
});

/**
 * The rule field names itself a prompt, so nobody writes a keyword at a model that reads sentences.
 *
 * @summary A field headed Rule alone reads as a matcher the gateway evaluates, and that is what
 * people wrote into it. The heading says what the text becomes and the sentence beside it says who
 * reads it, which is the whole difference between a switch statement and a classification.
 */
export const TheFieldSaysTheRuleIsAPrompt = meta.story({
  play: async () => {
    await expect(await screen.findByText('Rule as prompt')).toBeVisible();
    await expect(await screen.findByText(/reads this text as its prompt/)).toBeVisible();
  },
});

/**
 * An empty field stands an example in the register the judge actually reads.
 *
 * @summary The example describes the requests that belong on the branch and then says what does
 * not, because a classifier reads a boundary as readily as a category and nothing else on this
 * surface could teach that a rule may hold more than a noun phrase.
 */
export const TheEmptyFieldShowsAnExamplePrompt = meta.story({
  args: { branch: { label: '', rule: '' } },
  play: async () => {
    const field = await screen.findByLabelText('Rule as prompt');
    const example = field.getAttribute('placeholder') ?? '';

    await expect(example).toMatch(/^Requests about source code/);
    await expect(example).toMatch(/Not general chat/);
  },
});

/** The label says it is the judge's own vocabulary, so a rename reads as a semantic edit. */
export const TheLabelSaysItIsTheJudgesWord = meta.story({
  play: async () => {
    await expect(await screen.findByText(/a rename changes what it reads/)).toBeVisible();
  },
});

/** A branch with no rule routes nothing and has nothing to name itself from, so the save stays shut. */
export const AnEmptyRuleHoldsTheSaveShut = meta.story({
  args: { branch: { label: 'code', rule: '' } },
  play: async () => {
    await expect(await screen.findByRole('button', { name: 'Save branch' })).toBeDisabled();
  },
});

/**
 * A rule with no label of its own still saves, because the label fills itself from the rule.
 *
 * @summary The save is the one place that can write the word a person skipped, so holding it shut
 * would send them back to a field the sheet was about to fill anyway.
 */
export const ARuleWithNoLabelStillSaves = meta.story({
  args: { branch: { label: '', rule: 'questions about billing' } },
  play: async () => {
    await expect(await screen.findByRole('button', { name: 'Save branch' })).toBeEnabled();
  },
});

/** The label field says what a blank one becomes, so nobody wonders where the word came from. */
export const TheLabelFieldSaysABlankOneFillsItself = meta.story({
  play: async () => {
    await expect(await screen.findByText(/fills itself from the rule/)).toBeVisible();
  },
});

/** Saving hands back the label and the rule trimmed, because the judge answers with the word. */
export const SavingTrimsWhatItHandsBack = meta.story({
  args: { branch: { label: '  code  ', rule: 'questions about source code' }, onSave: fn() },
  play: async ({ args }) => {
    await userEvent.click(await screen.findByRole('button', { name: 'Save branch' }));

    await expect(args.onSave).toHaveBeenCalledWith({
      label: 'code',
      rule: 'questions about source code',
    });
  },
});

/** Where a branch routes is reported rather than offered, because a cable moves it on the canvas. */
export const RoutesToOffersNoControl = meta.story({
  play: async () => {
    await expect(await screen.findByText('Work key · claude-sonnet-5')).toBeVisible();
    await expect(screen.queryByRole('button', { name: /Routes to/ })).toBeNull();
  },
});

/** The destructive act lives on the branch row, so this sheet offers no way to delete. */
export const TheSheetHoldsNoDestructiveAct = meta.story({
  play: async () => {
    await expect(await screen.findByRole('button', { name: 'Save branch' })).toBeVisible();
    await expect(screen.queryByRole('button', { name: /Delete/ })).toBeNull();
  },
});

/** A refused save says why under the field it refused, while the draft holds every word. */
export const ARefusedSaveSaysWhy = meta.story({
  args: { refusal: 'Another branch already answers to that label.' },
  play: async () => {
    await expect(await screen.findByRole('alert')).toHaveTextContent(/already answers/);
  },
});

/** The sheet in the dark scheme, where the wide rule field sits on the sheet surface. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
