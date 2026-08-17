import { beforeEach, expect, test, vi } from 'vitest';

import {
  canvasCommandLine,
  freshCanvasRun,
  renderCanvasPage,
  standCanvasBridge,
} from '../../testing/canvas-page.testkit';

vi.setConfig({ testTimeout: 40_000 });

beforeEach(freshCanvasRun);

async function pageWithTheMenu() {
  standCanvasBridge();

  const command = canvasCommandLine();
  const screen = await renderCanvasPage();

  return { screen, command };
}

function clipboardTaking(written: string[]): void {
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: async (value: string) => {
        written.push(value);

        return Promise.resolve();
      },
    },
  });
}

function clipboardRefusing(): void {
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: async () => Promise.reject(new Error('the clipboard refused the write')),
    },
  });
}

test('the Copy Base URL command lands the printed address on the clipboard and says so', async () => {
  const written: string[] = [];

  clipboardTaking(written);

  const { screen, command } = await pageWithTheMenu();

  command('copy-base-url');

  await expect.element(screen.getByText('Address copied.')).toBeInTheDocument();
  expect(written).toEqual(['http://127.0.0.1:8397']);
});

test('a refused clipboard write answers out loud instead of landing silently', async () => {
  clipboardRefusing();

  const { screen, command } = await pageWithTheMenu();

  command('copy-base-url');

  await expect.element(screen.getByText("Couldn't copy. Try again.")).toBeInTheDocument();
});

test('the Delete Gateway command raises the standing removal question', async () => {
  const { screen, command } = await pageWithTheMenu();

  command('remove-gateway');

  await expect
    .element(
      screen.getByText('The gateway stops serving, and its whole composition leaves this app.'),
    )
    .toBeVisible();
});
