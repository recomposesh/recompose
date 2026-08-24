import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';

import type { MenuAction } from '../../../../shared/ui';

import { CanvasContextMenu } from './canvas-context-menu';

const FLOW_CARD = 'react-flow__node';

const FLOW_CABLE = 'react-flow__edge';

const actsBySubject: Record<string, string[]> = {
  pane: ['Add a virtual model', 'Tidy the canvas'],
  'model:fast': ['Pick a target', 'Delete virtual model…'],
  'cable:fast': ['Release binding…'],
};

function actsFor(subject: string | undefined): readonly MenuAction[] {
  return (actsBySubject[subject ?? 'pane'] ?? []).map((label) => ({ label, onSelect: () => {} }));
}

async function canvasStanding() {
  return render(
    <CanvasContextMenu actsFor={actsFor} noticeCardFocus={() => {}}>
      <div className={FLOW_CARD} data-id="model:fast">
        Fast
      </div>
      <div className={FLOW_CABLE} data-id="cable:fast">
        cable
      </div>
      <p>bare canvas</p>
    </CanvasContextMenu>,
  );
}

function rightClick(element: Element): void {
  element.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
}

function listedActs(): (string | null)[] {
  return page
    .getByRole('menuitem')
    .elements()
    .map((act) => act.textContent);
}

test('a right-click on a card raises the acts that card offers', async () => {
  const screen = await canvasStanding();

  rightClick(screen.getByText('Fast').element());

  await expect.element(page.getByRole('menu')).toBeVisible();

  expect(listedActs()).toEqual(['Pick a target', 'Delete virtual model…']);
});

test('a right-click on a cable raises the acts that cable offers', async () => {
  const screen = await canvasStanding();

  rightClick(screen.getByText('cable').element());

  await expect.element(page.getByRole('menu')).toBeVisible();

  expect(listedActs()).toEqual(['Release binding…']);
});

test('a right-click on the canvas behind the cards raises the canvas acts', async () => {
  const screen = await canvasStanding();

  rightClick(screen.getByText('bare canvas').element());

  await expect.element(page.getByRole('menu')).toBeVisible();

  expect(listedActs()).toEqual(['Add a virtual model', 'Tidy the canvas']);
});

test('the acts follow the press, so a second right-click reads the card it landed on', async () => {
  const screen = await canvasStanding();

  rightClick(screen.getByText('bare canvas').element());
  await expect.element(page.getByRole('menu')).toBeVisible();

  rightClick(screen.getByText('Fast').element());

  await expect.element(page.getByRole('menuitem', { name: 'Pick a target' })).toBeVisible();

  expect(listedActs()).toEqual(['Pick a target', 'Delete virtual model…']);
});
