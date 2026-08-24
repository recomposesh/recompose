import { afterEach, expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import {
  closeConnectSheet,
  closeLogsDrawer,
  connectSheetOpen,
  openConnectSheet,
  subscribeToCanvasAsks,
  toggleLogsDrawer,
} from '../../../../../shared/lib';
import { ToolbarStrip } from './toolbar-strip';

afterEach(() => {
  closeLogsDrawer();
  closeConnectSheet();
});

async function renderStrip() {
  return render(
    <ToolbarStrip
      address="http://127.0.0.1:51234"
      name="Codex"
      onRun={() => undefined}
      port={51234}
      running={false}
      status="stopped"
      windowControls="leading"
    />,
  );
}

test('the tidy control asks the canvas to arrange itself afresh', async () => {
  const asked: string[] = [];
  const letGo = subscribeToCanvasAsks((ask) => {
    asked.push(ask);
  });
  const screen = await renderStrip();

  await screen.getByRole('button', { name: 'Tidy the canvas' }).click();
  letGo();

  expect(asked).toEqual(['tidy']);
});

test('a strip nobody pressed asks the canvas for nothing', async () => {
  const asked: string[] = [];
  const letGo = subscribeToCanvasAsks((ask) => {
    asked.push(ask);
  });

  await renderStrip();
  letGo();

  expect(asked).toEqual([]);
});

test('the request log control says out loud whether the drawer stands open', async () => {
  const screen = await renderStrip();
  const control = screen.getByRole('button', { name: 'Request log' });

  await expect.element(control).toHaveAttribute('aria-expanded', 'false');

  await userEvent.click(control);

  await expect.element(control).toHaveAttribute('aria-expanded', 'true');
});

test('the keyboard alone opens the drawer', async () => {
  const screen = await renderStrip();
  const control = screen.getByRole('button', { name: 'Request log' });

  control.element().focus();
  await userEvent.keyboard('{Enter}');

  await expect.element(control).toHaveAttribute('aria-expanded', 'true');
});

test('the guide control brings the connect sheet out, which is the whole of what it does', async () => {
  const screen = await renderStrip();

  await userEvent.click(screen.getByRole('button', { name: 'Connect a client' }));

  expect(connectSheetOpen()).toBe(true);
});

test('the guide control says out loud whether the sheet it opens stands over the canvas', async () => {
  const screen = await renderStrip();
  const control = screen.getByRole('button', { name: 'Connect a client' });

  await expect.element(control).toHaveAttribute('aria-expanded', 'false');

  openConnectSheet();

  await expect.element(control).toHaveAttribute('aria-expanded', 'true');
});

test('the control reads the shared drawer state rather than holding one of its own', async () => {
  const screen = await renderStrip();

  toggleLogsDrawer();

  await expect
    .element(screen.getByRole('button', { name: 'Request log' }))
    .toHaveAttribute('aria-expanded', 'true');
});
