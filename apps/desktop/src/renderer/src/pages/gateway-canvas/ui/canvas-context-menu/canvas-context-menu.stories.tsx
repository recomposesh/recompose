import { expect, screen } from 'storybook/test';

import preview from '#.storybook/preview';

import type { MenuAction } from '../../../../shared/ui';

import { CanvasContextMenu } from './canvas-context-menu';

const FLOW_CARD = 'react-flow__node';

const CARD_FACE =
  'rounded-card border border-line-subtle bg-surface-card px-4 py-2.5 text-card-title text-ink';

const cardActs: MenuAction[] = [
  { label: 'Pick a target', icon: 'plus', onSelect: () => {} },
  { label: 'Show in inspector', icon: 'panel-right', onSelect: () => {} },
  { label: 'Delete virtual model…', icon: 'trash', tone: 'danger', onSelect: () => {} },
];

const canvasActs: MenuAction[] = [
  { label: 'Add a virtual model', icon: 'plus', onSelect: () => {} },
  { label: 'Tidy the canvas', icon: 'tidy', onSelect: () => {} },
];

const meta = preview.meta({
  component: CanvasContextMenu,
  args: {
    noticeCardFocus: () => {},
    actsFor: (subject) => (subject === undefined ? canvasActs : cardActs),
    children: (
      <div className="flex h-60 w-full items-center justify-center">
        <div className={`${FLOW_CARD} ${CARD_FACE}`} data-id="model:fast">
          Fast
        </div>
      </div>
    ),
  },
});

function rightClickOn(element: Element): void {
  element.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
}

/** The canvas at rest, which shows no sign of the acts a press would raise. */
export const Resting = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Fast')).toBeVisible();
    await expect(screen.queryByRole('menuitem')).toBeNull();
  },
});

/** The acts one card offers, raised where the press landed on it. */
export const OnACard = meta.story({
  play: async ({ canvas }) => {
    rightClickOn(await canvas.findByText('Fast'));

    const listed = await screen.findAllByRole('menuitem');

    await expect(listed.map((act) => act.textContent)).toEqual([
      'Pick a target',
      'Show in inspector',
      'Delete virtual model…',
    ]);
  },
});
