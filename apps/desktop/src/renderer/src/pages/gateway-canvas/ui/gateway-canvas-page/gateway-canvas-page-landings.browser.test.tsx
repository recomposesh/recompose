import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { pulledCable, releasedAt, sourcePortOf } from '../../testing/canvas-gestures.testkit';
import { canvasPageOn, freshCanvasRun } from '../../testing/canvas-page.testkit';

vi.setConfig({ testTimeout: 40_000 });

beforeEach(freshCanvasRun);

const OPEN_CANVAS = { x: 420, y: 300 };

function litCards(container: HTMLElement): readonly string[] {
  return [...container.querySelectorAll('.react-flow__node')]
    .filter((card) => card.querySelector('[data-landing]') !== null)
    .map((card) => card.getAttribute('data-id') ?? '');
}

async function cablePulledOffAFreshDraft(container: HTMLElement): Promise<void> {
  await pulledCable(await sourcePortOf(container, 'draft'), OPEN_CANVAS);
}

async function aDraftStanding(screen: Awaited<ReturnType<typeof canvasPageOn>>): Promise<void> {
  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
}

test('a cable in flight lights every card it could land on, and nothing else', async () => {
  const screen = await canvasPageOn();

  await aDraftStanding(screen);

  expect(litCards(screen.container)).toEqual([]);

  await cablePulledOffAFreshDraft(screen.container);

  await vi.waitFor(() => {
    expect(litCards(screen.container).length).toBeGreaterThan(0);
  });

  const lit = litCards(screen.container);

  expect(lit.every((card) => card.startsWith('target:') || card.startsWith('ghost:'))).toBe(true);

  releasedAt(OPEN_CANVAS);
});

test('the lights go out the moment the cable is let go', async () => {
  const screen = await canvasPageOn();

  await aDraftStanding(screen);
  await cablePulledOffAFreshDraft(screen.container);

  await vi.waitFor(() => {
    expect(litCards(screen.container).length).toBeGreaterThan(0);
  });

  releasedAt(OPEN_CANVAS);

  await vi.waitFor(() => {
    expect(litCards(screen.container)).toEqual([]);
  });
});
