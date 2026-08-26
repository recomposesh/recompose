import { expect, fn, screen, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import {
  branchRow,
  chatRow,
  elseRow,
  pickedFromTheRowMenu,
  plainRows,
} from '../../testing/router-child.testkit';
import { BranchEditor } from './branch-editor';

const meta = preview.meta({
  component: BranchEditor,
  args: {
    mode: 'conditional' as const,
    rows: [branchRow, chatRow, elseRow],
    branching: true,
    onMove: () => {},
    onOpen: () => {},
    onRuleBranch: () => {},
    onDropBranch: () => {},
  },
  decorators: [
    (Story) => (
      <div className="mx-auto my-4 w-80 bg-surface-toolbar p-3.5">
        <Story />
      </div>
    ),
  ],
});

/** The branch ladder at rest, before a person asks anything of a row. */
export const Basic = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('code')).toBeVisible();
    await expect(await canvas.findByText('chat')).toBeVisible();
  },
});

/** Deleting a branch asks first, and the question names where its traffic goes next. */
export const DeletingAsksAndNamesTheCost = meta.story({
  play: async ({ canvas }) => {
    await pickedFromTheRowMenu(await canvas.findByText('code'), 'Delete branch');

    const asking = await screen.findByRole('heading', { name: 'Delete the code branch?' });

    await expect(asking).toBeVisible();
    await expect(await screen.findByText(/fall to else/)).toBeVisible();
  },
});

/** Nothing is written until the person accepts the cost the question named. */
export const CancellingWritesNothing = meta.story({
  args: { onDropBranch: fn() },
  play: async ({ args, canvas }) => {
    await pickedFromTheRowMenu(await canvas.findByText('code'), 'Delete branch');
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    await expect(args.onDropBranch).not.toHaveBeenCalled();
  },
});

/** Accepting the cost hands the branch out, and the child behind it leaves with it. */
export const ConfirmingDropsTheBranch = meta.story({
  args: { onDropBranch: fn() },
  play: async ({ args, canvas }) => {
    await pickedFromTheRowMenu(await canvas.findByText('code'), 'Delete branch');
    await userEvent.click(await screen.findByRole('button', { name: 'Delete branch' }));

    await expect(args.onDropBranch).toHaveBeenCalledWith(branchRow);
  },
});

/** Editing a rule opens the sheet on that branch, reporting where it routes. */
export const EditingARuleOpensTheSheet = meta.story({
  play: async ({ canvas }) => {
    await pickedFromTheRowMenu(await canvas.findByText('chat'), 'Edit prompt');

    await expect(await screen.findByLabelText('Rule as prompt')).toHaveValue(
      'everyday conversation',
    );
    await expect(await screen.findByText('Claude Max · claude-opus-5')).toBeVisible();
  },
});

/** A router that reads no requests offers neither act, because its rows carry no branch. */
export const APlainLadderOffersNeitherAct = meta.story({
  args: { mode: 'failover' as const, rows: plainRows, branching: false },
  play: async ({ canvas }) => {
    await userEvent.pointer({ keys: '[MouseRight]', target: await canvas.findByText('Work key') });

    await expect(await screen.findByRole('menuitem', { name: 'Move up' })).toBeVisible();
    await expect(screen.queryByRole('menuitem', { name: 'Delete branch' })).toBeNull();
  },
});

/** The ladder in the dark scheme, where the label column sits against the box. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
