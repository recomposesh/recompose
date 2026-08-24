import { expect, screen } from 'storybook/test';

import preview from '#.storybook/preview';

import type { MenuAction } from '../../../../shared/ui';

import { AccountRow } from './account-row';

const acts: MenuAction[] = [
  { label: 'Verify', icon: 'shield', tone: 'positive', onSelect: () => {} },
  { label: 'Remove', icon: 'trash', tone: 'danger', onSelect: () => {} },
];

const meta = preview.meta({
  component: AccountRow,
  args: { items: acts, layout: 'flex min-h-row items-center gap-3' },
  decorators: [
    (Story) => (
      <ul className="w-100">
        <Story />
      </ul>
    ),
  ],
});

/** A row reading across one line, which is the shape a key and a local runtime take. */
export const AcrossOneLine = meta.story({
  args: {
    children: <span className="text-card-title text-ink">Anthropic</span>,
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('listitem')).toBeVisible();
  },
});

/** The acts the row carries, raised where a person pressed rather than at a control. */
export const ActsRaised = meta.story({
  args: {
    children: <span className="text-card-title text-ink">Anthropic</span>,
  },
  play: async ({ canvas }) => {
    const row = await canvas.findByRole('listitem');

    row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));

    const listed = await screen.findAllByRole('menuitem');

    await expect(listed.map((act) => act.textContent)).toEqual(['Verify', 'Remove']);
  },
});

/** A row stacking its lines, which is the shape a subscription takes. */
export const Stacked = meta.story({
  args: {
    layout: 'flex flex-col gap-2.5',
    children: (
      <>
        <span className="text-card-title text-ink">Claude Max</span>
        <span className="text-footnote text-ink-secondary">dev@example.com</span>
      </>
    ),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('dev@example.com')).toBeVisible();
  },
});
