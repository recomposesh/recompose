import { Menu } from '@base-ui/react/menu';
import { expect, screen } from 'storybook/test';

import preview from '#.storybook/preview';

import type { MenuAction } from './menu-action';

import { MenuActions } from './menu-action';

const everyTone: MenuAction[] = [
  { label: 'Verify', icon: 'shield', tone: 'positive', onSelect: () => {} },
  { label: 'Sign in again', icon: 'renew', tone: 'accent', onSelect: () => {} },
  { label: 'Check again', icon: 'search', onSelect: () => {} },
  { label: 'Remove', icon: 'trash', tone: 'danger', onSelect: () => {} },
];

const lifecycleActs: MenuAction[] = [
  { label: 'Start', icon: 'play', onSelect: () => {} },
  { label: 'Stop', icon: 'stop', disabled: true, onSelect: () => {} },
];

const plainActs: MenuAction[] = [
  { label: 'Move up', onSelect: () => {} },
  { label: 'Move down', onSelect: () => {} },
];

const meta = preview.meta({
  component: MenuActions,
  args: { items: everyTone },
  decorators: [
    (Story) => (
      <Menu.Root open>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup className="menu-surface">
              <Story />
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    ),
  ],
});

/** Every tone an act can carry, which says what choosing it does before the label is read. */
export const EveryTone = meta.story({
  play: async () => {
    const listed = await screen.findAllByRole('menuitem');

    await expect(listed.map((act) => act.textContent)).toEqual([
      'Verify',
      'Sign in again',
      'Check again',
      'Remove',
    ]);
  },
});

/** An act the surface cannot answer yet stays readable and out of reach. */
export const OutOfReach = meta.story({
  args: { items: lifecycleActs },
  play: async () => {
    await expect(await screen.findByRole('menuitem', { name: 'Stop' })).toHaveAttribute(
      'data-disabled',
    );
  },
});

/** An act with no glyph, which still lines up with the ones that carry one. */
export const WithoutGlyphs = meta.story({
  args: { items: plainActs },
  play: async () => {
    const listed = await screen.findAllByRole('menuitem');

    await expect(listed.map((act) => act.textContent)).toEqual(['Move up', 'Move down']);
  },
});
