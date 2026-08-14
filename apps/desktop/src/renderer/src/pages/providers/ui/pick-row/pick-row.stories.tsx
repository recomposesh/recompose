import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { Icon } from '../../../../shared/ui';
import { PickRow } from './pick-row';

const meta = preview.meta({
  component: PickRow,
  args: {
    lead: <Icon className="size-4 text-ink-secondary" name="person" />,
    title: 'dev@example.com',
    under: 'Already signed in through Claude Code',
    label: 'Connect dev@example.com',
    disabled: false,
    onPick: () => undefined,
  },
  decorators: [
    (Story) => (
      <div className="m-4 w-sheet field-box">
        <Story />
      </div>
    ),
  ],
});

/**
 * One way in, named by its own line and reachable as a whole row.
 *
 * @summary The reading asks for the row's given name rather than its two lines, because the name
 * is what a screen reader announces and the two lines never spell it between them.
 */
export const Basic = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Connect dev@example.com' })).toBeEnabled();
    await expect(canvas.getByText('Already signed in through Claude Code')).toBeVisible();
  },
});

/**
 * A row whose thing holds a plan, which stands beside the name rather than under it.
 */
export const WithAPlan = meta.story({
  args: { badge: 'Max' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Max')).toBeVisible();
  },
});

/**
 * The row while another act on the step runs, which stays in place rather than disappearing.
 */
export const Disabled = meta.story({
  args: { disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Connect dev@example.com' })).toBeDisabled();
  },
});

/** The same row in the dark scheme, where the chevron has to stay readable against the box. */
export const DarkScheme = meta.story({ args: { badge: 'Max' }, globals: { theme: 'dark' } });
