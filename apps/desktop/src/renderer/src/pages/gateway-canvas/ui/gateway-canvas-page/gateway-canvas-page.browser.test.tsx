import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { setPanelWidth, toggleInspector } from '../../../../shared/lib';
import {
  canvasPositions,
  keepCanvasPositions,
  setNodePosition,
} from '../../lib/canvas-position-store';
import { canvasViewport, keepCanvasViewport } from '../../lib/canvas-viewport-store';
import { heldDraft } from '../../lib/use-held-draft';
import { clickedCable, draftCardOn, storedBindingOf } from '../../testing/canvas-gestures.testkit';
import {
  canvasPageOn,
  freshCanvasRun,
  renderCanvasPage,
  standCanvasBridge,
} from '../../testing/canvas-page.testkit';

vi.setConfig({ testTimeout: 40_000 });

beforeEach(() => {
  freshCanvasRun();
  setPanelWidth('inspector', 304);
});

test('the canvas stands the gateway, its virtual models, and their targets as cards', async () => {
  const screen = await canvasPageOn();

  await expect.element(screen.getByRole('button', { name: /My Gateway/ })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: /Fast/ })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: /Creative/ })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: /work/ })).toBeVisible();
  expect(screen.container.querySelector('[data-id="cable:fast"]')).not.toBeNull();
  expect(screen.container.querySelector('[data-id="cable:creative"]')).not.toBeNull();
});

test('the gateway detail opens on its canvas, with the inspector away until asked for', async () => {
  const screen = await canvasPageOn();

  await expect.element(screen.getByRole('button', { name: /My Gateway/ })).toBeVisible();
  await expect.element(screen.getByRole('complementary')).not.toBeInTheDocument();

  toggleInspector();

  await expect.element(screen.getByText('Endpoint', { exact: true })).toBeVisible();
  await expect
    .element(screen.getByRole('button', { name: 'Add virtual model' }))
    .not.toBeInTheDocument();
});

test('selecting a target card turns the inspector onto that account', async () => {
  const screen = await canvasPageOn();

  await userEvent.click(screen.getByRole('button', { name: /work/ }));

  await expect.element(screen.getByRole('complementary')).toBeVisible();
  const drawer = screen.getByRole('complementary');

  await expect.element(drawer.getByText('Provider', { exact: true })).toBeVisible();
  await expect.element(drawer.getByText('Encrypted key', { exact: true })).toBeVisible();
});

test('selecting a cable shows the binding in the inspector', async () => {
  const screen = await canvasPageOn();

  await clickedCable(screen.container, 'cable:fast');

  const drawer = screen.getByRole('complementary');

  await expect.element(drawer.getByText('Binding', { exact: true })).toBeVisible();
  await expect.element(drawer.getByText('Goes to', { exact: true })).toBeVisible();
  await expect.element(drawer.getByText('claude-haiku-4-5', { exact: true })).toBeVisible();
});

test('a pane click clears the selection and puts the inspector away', async () => {
  const screen = await canvasPageOn();

  await userEvent.click(screen.getByRole('button', { name: /work/ }));
  await expect.element(screen.getByRole('complementary')).toBeVisible();

  const pane = screen.container.querySelector('.react-flow__pane');

  pane?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

  await expect.element(screen.getByRole('complementary')).not.toBeInTheDocument();
  await expect
    .element(screen.getByRole('button', { name: /work/ }))
    .toHaveAttribute('aria-pressed', 'false');
});

test('selecting a node opens a closed inspector back up on that subject', async () => {
  const screen = await canvasPageOn();
  const pane = screen.container.querySelector('.react-flow__pane');

  pane?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await expect.element(screen.getByRole('complementary')).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /Fast/ }));

  await expect.element(screen.getByRole('complementary')).toBeVisible();
  const drawer = screen.getByRole('complementary');

  await expect.element(drawer.getByText('claude-haiku-4-5', { exact: true })).toBeVisible();
});

test('a draft in flight survives leaving the screen and coming back', async () => {
  const first = await canvasPageOn();

  first.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  await first.getByRole('textbox', { name: 'Name' }).fill('Fa');
  await first.unmount();

  const second = await renderCanvasPage();

  await expect.poll(() => draftCardOn(second.container)?.textContent).toContain('Fa');
});

test('the removal dialog holds through a re-render, still answerable', async () => {
  const screen = await canvasPageOn();

  await userEvent.click(screen.getByRole('button', { name: /Fast/ }));
  await userEvent.keyboard('{Delete}');
  await expect.element(screen.getByText(/Delete the virtual model/)).toBeVisible();

  toggleInspector();

  await expect.element(screen.getByText(/Delete the virtual model/)).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  await expect.element(screen.getByText(/Delete the virtual model/)).not.toBeInTheDocument();
  expect(await storedBindingOf('fast')).toBeDefined();
});

test('Delete on the gateway node asks with the gateway wording, and Cancel changes nothing', async () => {
  const screen = await canvasPageOn();

  await userEvent.click(screen.getByRole('button', { name: /My Gateway/ }));
  await userEvent.keyboard('{Delete}');

  await expect.element(screen.getByText(/Delete the gateway "My Gateway"/)).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  await expect.element(screen.getByText(/Delete the gateway/)).not.toBeInTheDocument();
  await expect.element(screen.getByRole('button', { name: /My Gateway/ })).toBeVisible();
});

test('confirming the gateway deletion removes it from the store and hands the person away', async () => {
  standCanvasBridge();

  let handedAway = 0;
  const screen = await renderCanvasPage(false, () => {
    handedAway += 1;
  });

  await userEvent.click(screen.getByLabelText('Add a virtual model'));
  await screen.getByRole('textbox', { name: 'Name' }).fill('Forgotten');
  setNodePosition('my-gateway', 'gateway', { x: 12, y: 34 });
  keepCanvasPositions('my-gateway');
  keepCanvasViewport('my-gateway', { x: 20, y: 30, zoom: 1.2 });

  await userEvent.click(screen.getByRole('button', { name: /My Gateway/ }));
  await userEvent.keyboard('{Delete}');
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'Delete' }));

  await expect.poll(() => handedAway).toBe(1);

  const listed = await window.recompose['gateways:list']();

  expect(listed.ok && listed.value).toEqual([]);
  expect(heldDraft('my-gateway')).toBeUndefined();
  expect(canvasPositions('my-gateway')).toEqual({});
  expect(canvasViewport('my-gateway')).toBeUndefined();
});

function dragSeparator(handle: Element, from: number, to: number) {
  handle.dispatchEvent(
    new PointerEvent('pointerdown', { pointerId: 1, clientX: from, bubbles: true }),
  );
  window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: to }));
  window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: to }));
}

const theSeparator = { name: 'Inspector width' };

test('dragging the inspector border sizes the panel inside its bounds', async () => {
  const screen = await canvasPageOn();

  toggleInspector();

  const handle = screen.getByRole('separator', theSeparator);

  await expect.element(handle).toBeInTheDocument();
  dragSeparator(handle.element(), 900, 840);

  await expect.element(handle).toHaveAttribute('aria-valuenow', '364');
  expect(screen.getByRole('complementary').element().getBoundingClientRect().width).toBe(364);
});

test('dragging the border well past the narrowest width shuts the inspector', async () => {
  const screen = await canvasPageOn();

  toggleInspector();

  const handle = screen.getByRole('separator', theSeparator);

  await expect.element(handle).toBeInTheDocument();
  dragSeparator(handle.element(), 900, 1300);

  await expect.element(screen.getByRole('complementary')).not.toBeInTheDocument();
  await expect.element(screen.getByRole('button', { name: /My Gateway/ })).toBeVisible();
});
