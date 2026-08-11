import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { inspectorOpen } from '../../../../shared/lib';
import { emitEngineLogs } from '../../../../shared/testing';
import { draggedCard } from '../../testing/canvas-gestures.testkit';
import {
  canvasCommandLine,
  freshCanvasRun,
  renderCanvasPage,
  standCanvasBridge,
} from '../../testing/canvas-page.testkit';
import { servedRequest } from '../../testing/gateway-canvas.testkit';

vi.setConfig({ testTimeout: 40_000 });

beforeEach(freshCanvasRun);

const DRAWER_TITLE = 'Logs for My Gateway';

async function pageWithTheMenu(overrides: Parameters<typeof standCanvasBridge>[0] = {}) {
  standCanvasBridge(overrides);

  const command = canvasCommandLine();
  const screen = await renderCanvasPage();

  return { screen, command };
}

async function openedDrawer(overrides: Parameters<typeof standCanvasBridge>[0] = {}) {
  const page = await pageWithTheMenu(overrides);

  page.command('toggle-logs');
  await expect.element(page.screen.getByText(DRAWER_TITLE)).toBeVisible();

  return page;
}

function paneClickedOn(container: HTMLElement): void {
  container
    .querySelector('.react-flow__pane')
    ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function boxOf(container: HTMLElement, selector: string): DOMRect {
  return container.querySelector(selector)?.getBoundingClientRect() ?? new DOMRect();
}

/**
 * How far down a stack of painted things one thing sits, or nothing where it is not in the stack.
 *
 * @operation The reading comes from the browser's own hit testing rather than from a class or a
 * z-index, because what a pointer reaches is the only thing a person can feel.
 */
function paintedSeat(stack: readonly Element[], selector: string): number {
  return stack.findIndex((painted) => painted.closest(selector) !== null);
}

test('the gateway detail opens with no drawer, since the stage is what a person came for', async () => {
  const { screen } = await pageWithTheMenu();

  await expect.element(screen.getByText(DRAWER_TITLE)).not.toBeInTheDocument();
});

test('the Show Logs command stands the drawer under the stage, and the stage keeps standing', async () => {
  const { screen } = await openedDrawer();

  await expect.element(screen.getByRole('button', { name: /My Gateway/ })).toBeVisible();
  await expect.element(screen.getByRole('radio', { name: 'All' })).toBeVisible();
  await expect.element(screen.getByRole('radio', { name: 'Success' })).toBeVisible();
  await expect.element(screen.getByRole('radio', { name: 'Errors' })).toBeVisible();
});

test('the same command asked twice puts the drawer away again', async () => {
  const { screen, command } = await openedDrawer();

  command('toggle-logs');

  await expect.element(screen.getByText(DRAWER_TITLE)).not.toBeInTheDocument();
});

test('the close control inside the drawer leaves the canvas exactly as it was', async () => {
  const { screen } = await openedDrawer();

  await userEvent.click(screen.getByRole('button', { name: 'Close logs' }));

  await expect.element(screen.getByText(DRAWER_TITLE)).not.toBeInTheDocument();
  await expect.element(screen.getByRole('button', { name: /My Gateway/ })).toBeVisible();
});

test('the menu item hears what the drawer did, so its checkbox reads what stands', async () => {
  const told: boolean[] = [];
  const { command } = await pageWithTheMenu({
    overrides: {
      'system:logs-drawer': async ({ open }) => {
        told.push(open);

        return Promise.resolve({ ok: true, value: undefined });
      },
    },
  });

  await expect.poll(() => told).toEqual([false]);

  command('toggle-logs');

  await expect.poll(() => told).toEqual([false, true]);
});

test('a request the gateway served while the drawer stood open lands as a row', async () => {
  const { screen } = await openedDrawer();

  emitEngineLogs({ kind: 'append', rows: [servedRequest()] });

  await expect.element(screen.getByText('14:22:09')).toBeVisible();
  await expect.element(screen.getByText('claude-haiku-4-5', { exact: true })).toBeVisible();
});

test('requests served before the drawer opened are already standing when it does', async () => {
  const { screen, command } = await pageWithTheMenu();

  emitEngineLogs({ kind: 'append', rows: [servedRequest()] });
  command('toggle-logs');

  await expect.element(screen.getByText('14:22:09')).toBeVisible();
});

test('the drawer keeps canvas subjects out of its All, Success, and Errors filter', async () => {
  const { screen } = await openedDrawer();

  await expect.element(screen.getByRole('radio', { name: 'Fast' })).not.toBeInTheDocument();
  await expect.element(screen.getByRole('radio', { name: 'Creative' })).not.toBeInTheDocument();
  await expect.element(screen.getByRole('radio', { name: 'work' })).not.toBeInTheDocument();
});

test('selecting a virtual model on the canvas scopes the dynamic drawer heading', async () => {
  const { screen } = await openedDrawer();

  await userEvent.click(screen.getByRole('button', { name: /Creative/ }));

  await expect.element(screen.getByRole('heading', { name: 'Logs for Creative' })).toBeVisible();
  await expect
    .element(screen.getByRole('radio', { name: 'All' }))
    .toHaveAttribute('aria-checked', 'true');
});

test('selecting a target on the canvas scopes the dynamic drawer heading', async () => {
  const { screen } = await openedDrawer();

  await userEvent.click(screen.getByRole('button', { name: /work/ }));

  await expect.element(screen.getByRole('heading', { name: 'Logs for work' })).toBeVisible();
});

test('a pane click returns the heading to the whole gateway and leaves the drawer standing', async () => {
  const { screen } = await openedDrawer();

  await userEvent.click(screen.getByRole('button', { name: /Fast/ }));
  await expect.element(screen.getByRole('heading', { name: 'Logs for Fast' })).toBeVisible();

  paneClickedOn(screen.container);

  await expect.element(screen.getByText(DRAWER_TITLE)).toBeVisible();
});

test('the Errors filter never opens an inspector a person put away', async () => {
  const { screen } = await openedDrawer();

  paneClickedOn(screen.container);
  await expect.element(screen.getByRole('complementary')).not.toBeInTheDocument();
  await expect.poll(inspectorOpen).toBe(false);

  await userEvent.click(screen.getByRole('radio', { name: 'Errors' }));

  await expect.element(screen.getByText(DRAWER_TITLE)).toBeVisible();
  await expect.element(screen.getByRole('complementary')).not.toBeInTheDocument();
});

const GRAB_BAND = "[data-panel-control][aria-orientation='horizontal']";
const A_CARD = '.react-flow__node';

test('the open drawer and full-height inspector keep separate visible regions', async () => {
  const { screen } = await openedDrawer();

  await userEvent.click(screen.getByRole('button', { name: /My Gateway/ }));
  await expect.element(screen.getByRole('complementary')).toBeVisible();

  const stage = boxOf(screen.container, '[data-canvas-column] > section');
  const strip = boxOf(screen.container, '[data-canvas-column] > footer');
  const inspector = boxOf(screen.container, '[data-canvas-workspace] > aside');
  const drawer = boxOf(screen.container, '[data-logs-drawer]');

  expect(stage.height).toBeGreaterThan(0);
  expect(inspector.width).toBeGreaterThan(0);
  expect(inspector.height).toBeGreaterThan(0);
  expect(drawer.width).toBeGreaterThan(0);
  expect(drawer.height).toBeGreaterThan(0);
  expect(stage.bottom).toBeLessThanOrEqual(strip.top);
  expect(stage.bottom).toBeLessThanOrEqual(drawer.top);
  expect(drawer.bottom).toBeLessThanOrEqual(strip.top);
  expect(drawer.right).toBeLessThanOrEqual(inspector.left);
  expect(inspector.top).toBeLessThanOrEqual(stage.top);
  expect(inspector.bottom).toBeGreaterThanOrEqual(strip.bottom);
});

/**
 * The grab band on the drawer's top edge overhangs the canvas by half its width, and the library
 * lifts a selected card to z-index 1000, so this holds the one ordering a person can feel.
 */
test("the drawer's top edge answers a grab even where a selected card rests against it", async () => {
  const { screen } = await openedDrawer();

  await userEvent.click(screen.getByRole('button', { name: /Fast/ }));

  const card = screen.container.querySelector(`${A_CARD}[data-id="model:fast"]`);

  await expect
    .poll(
      () =>
        boxOf(screen.container, GRAB_BAND).height > 0 &&
        (card?.getBoundingClientRect().height ?? 0) > 0,
    )
    .toBe(true);

  const reachedFor = boxOf(screen.container, GRAB_BAND);
  const restingAt = card?.getBoundingClientRect() ?? new DOMRect();

  draggedCard(card, { x: 0, y: Math.round(reachedFor.top - restingAt.bottom) + 6 });

  const band = boxOf(screen.container, GRAB_BAND);

  await expect
    .poll(() => {
      const at = card?.getBoundingClientRect() ?? new DOMRect();

      return at.top < band.bottom && at.bottom > band.top;
    })
    .toBe(true);

  const moved = card?.getBoundingClientRect() ?? new DOMRect();
  const bothStand = Math.max(band.top, moved.top) + 1;

  expect(bothStand).toBeLessThan(Math.min(band.bottom, moved.bottom));

  const stack = document.elementsFromPoint(moved.left + 20, bothStand);

  expect(paintedSeat(stack, '[data-panel-control]')).toBe(0);
  expect(paintedSeat(stack, A_CARD)).toBeGreaterThan(0);
});
