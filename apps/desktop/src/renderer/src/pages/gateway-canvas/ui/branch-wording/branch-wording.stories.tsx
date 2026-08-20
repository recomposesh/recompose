import { expect, screen, waitFor } from 'storybook/test';

import preview from '#.storybook/preview';

import { leaveWording, wordBranch } from '../../lib/use-branch-wording';
import { servingBridgeWorld, servingGateway } from '../../testing/gateway-canvas.testkit';
import { BranchWording } from './branch-wording';

const worded = {
  modelId: 'fast',
  routerId: 'r1',
  child: 'c2',
  label: '',
  rule: '',
  routesTo: 'claude-opus-5',
};

const meta = preview.meta({
  component: BranchWording,
  args: { gateway: servingGateway },
  parameters: { bridge: servingBridgeWorld },
});

/** Nothing stands while no branch is being worded, so the canvas is clear. */
export const NothingBeingWorded = meta.story({
  beforeEach: () => {
    leaveWording();
  },
  play: async () => {
    await expect(screen.queryByRole('dialog')).toBeNull();
  },
});

/** A branch born under a judged router opens here, with both fields empty and waiting. */
export const ABranchStillToBeWorded = meta.story({
  beforeEach: () => {
    wordBranch(worded);

    return leaveWording;
  },
  play: async () => {
    await waitFor(() => {
      void expect(screen.getByRole('textbox', { name: 'Label' })).toHaveValue('');
    });

    await expect(screen.getByRole('textbox', { name: 'Rule' })).toHaveValue('');
    await expect(screen.getByText('claude-opus-5')).toBeVisible();
  },
});

/** A branch already worded opens on what it says, so a rename starts from the standing words. */
export const ABranchAlreadyWorded = meta.story({
  beforeEach: () => {
    wordBranch({ ...worded, label: 'code', rule: 'It writes code.' });

    return leaveWording;
  },
  play: async () => {
    await waitFor(() => {
      void expect(screen.getByRole('textbox', { name: 'Label' })).toHaveValue('code');
    });

    await expect(screen.getByRole('textbox', { name: 'Rule' })).toHaveValue('It writes code.');
  },
});

/** The editor in the dark scheme, where the sheet has to read against the canvas behind it. */
export const DarkScheme = meta.story({
  beforeEach: () => {
    wordBranch(worded);

    return leaveWording;
  },
  globals: { theme: 'dark' },
});
