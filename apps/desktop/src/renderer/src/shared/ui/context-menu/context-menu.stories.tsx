import { expect, screen, waitFor } from 'storybook/test';

import preview from '#.storybook/preview';

import type { MenuAction } from '../menu-action';

import { ContextMenu } from '../index';

const gatewayActs: MenuAction[] = [
  { label: 'Start', icon: 'play', onSelect: () => {} },
  { label: 'Copy address', icon: 'network', onSelect: () => {} },
  { label: 'Delete gateway…', icon: 'trash', tone: 'danger', onSelect: () => {} },
];

const runningActs: MenuAction[] = [
  { label: 'Start', icon: 'play', disabled: true, onSelect: () => {} },
  { label: 'Stop', icon: 'stop', onSelect: () => {} },
];

const meta = preview.meta({
  component: ContextMenu,
  args: { children: 'Local gateway', items: gatewayActs },
});

function rightClickOn(surface: Element): void {
  surface.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
}

/** The resting surface, which shows no sign of the acts it holds until a person asks. */
export const Closed = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Local gateway')).toBeVisible();
    await expect(screen.queryByRole('menuitem')).toBeNull();
  },
});

/** Every act the surface holds, raised where the press landed. */
export const Opened = meta.story({
  play: async ({ canvas }) => {
    rightClickOn(await canvas.findByText('Local gateway'));

    const listed = await screen.findAllByRole('menuitem');

    await expect(listed.map((act) => act.textContent)).toEqual([
      'Start',
      'Copy address',
      'Delete gateway…',
    ]);
  },
});

/** An act the surface cannot answer yet stays readable and out of reach. */
export const ActOutOfReach = meta.story({
  args: { items: runningActs },
  play: async ({ canvas }) => {
    rightClickOn(await canvas.findByText('Local gateway'));

    await waitFor(async () => {
      await expect(await screen.findByRole('menuitem', { name: 'Start' })).toHaveAttribute(
        'data-disabled',
      );
    });
  },
});
