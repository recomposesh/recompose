import type { LogRow } from '@recompose/contracts';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { engineLogsQueryOptions } from '../../../../shared/api';
import { closeLogsDrawer, logsDrawerOpen } from '../../../../shared/lib';
import { TrafficFooter } from './traffic-footer';

const SLUG = 'relay';

const NOW = 1_760_000_000_000;

const MINUTE = 60_000;

const CLIENT_APPS_MEANING = 'Distinct client apps seen in the last minute.';

function hashedKey(mark: string): string {
  return `sha256:${mark.repeat(64)}`;
}

type RowStanding = {
  at: number;
  status?: number;
  tokens?: number;
  durationMs?: number;
  clientKey?: string;
};

function row(id: string, standing: RowStanding): LogRow {
  const { at, status = 200, clientKey = hashedKey('a'), ...spent } = standing;

  return {
    id,
    at,
    gateway: SLUG,
    origin: 'provider',
    method: 'POST',
    status,
    clientKey,
    ...spent,
  };
}

async function footerHolding(rows: readonly LogRow[], tally = { nodes: 5, wires: 4 }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  queryClient.setQueryData(engineLogsQueryOptions(SLUG).queryKey, rows);

  return render(
    <QueryClientProvider client={queryClient}>
      <TrafficFooter nodes={tally.nodes} slug={SLUG} wires={tally.wires} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.useRealTimers();
  closeLogsDrawer();
});

function doubleClick(element: Element): void {
  element.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
}

function stripIn(container: Element): Element {
  const strip = container.querySelector('footer');

  if (strip === null) {
    throw new Error('the traffic strip never rendered');
  }

  return strip;
}

test('a gateway no client app has called reads zeros rather than hiding the strip', async () => {
  const screen = await footerHolding([]);

  await expect.element(screen.getByText('0 req/min')).toBeVisible();
  await expect.element(screen.getByText('0ms latency')).toBeVisible();
  await expect.element(screen.getByText('0 client apps')).toBeVisible();
  await expect.element(screen.getByText('0 tok/min')).toBeVisible();
});

test('the tally counts the cards and the cables standing on the canvas', async () => {
  const screen = await footerHolding([], { nodes: 5, wires: 4 });

  await expect.element(screen.getByText('5 nodes · 4 wires')).toBeVisible();
});

test('served traffic reads through every cell with nobody asking for a refresh', async () => {
  const screen = await footerHolding([
    row('answered', { at: Date.now() - 1_000, tokens: 18_234, durationMs: 1_100 }),
    row('answered-again', {
      at: Date.now() - 2_000,
      durationMs: 900,
      clientKey: hashedKey('b'),
    }),
  ]);

  await expect.element(screen.getByText('2 req/min')).toBeVisible();
  await expect.element(screen.getByText('1.1s latency')).toBeVisible();
  await expect.element(screen.getByText('2 client apps')).toBeVisible();
  await expect.element(screen.getByText('18.2k tok/min')).toBeVisible();
});

test('a single request reads one client app rather than one client apps', async () => {
  const screen = await footerHolding([row('answered', { at: Date.now() })]);

  await expect.element(screen.getByText('1 client app')).toBeVisible();
});

test('the client cell carries what it counts, so its number is never read alone', async () => {
  const screen = await footerHolding([]);

  await expect
    .element(screen.getByText('0 client apps'))
    .toHaveAccessibleDescription(CLIENT_APPS_MEANING);
});

test('no error count stands on the strip while the minute holds no failure', async () => {
  const screen = await footerHolding([row('answered', { at: Date.now() })]);

  await expect.element(screen.getByText('1 req/min')).toBeVisible();
  expect(screen.container.textContent).not.toContain('error');
});

test('a failure the minute holds surfaces the error count', async () => {
  const screen = await footerHolding([
    row('answered', { at: Date.now() - 500, durationMs: 300 }),
    row('refused', { at: Date.now(), status: 500, durationMs: 120 }),
  ]);

  await expect.element(screen.getByText('1 error')).toBeVisible();
});

test('the strip carries no cost figure, so nothing on it reads as money', async () => {
  const screen = await footerHolding([row('answered', { at: Date.now(), tokens: 2_400 })]);

  await expect.element(screen.getByText('1 req/min')).toBeVisible();
  expect(screen.container.textContent).not.toContain('$');
});

test('the strip decays to zeros on its own clock once the minute passes it by', async () => {
  vi.useFakeTimers({ now: NOW, toFake: ['setInterval', 'clearInterval', 'Date'] });

  const screen = await footerHolding([
    row('answered', { at: NOW - 1_000, tokens: 400, durationMs: 800 }),
  ]);

  await expect.element(screen.getByText('1 req/min')).toBeVisible();

  await vi.advanceTimersByTimeAsync(MINUTE + 1_000);

  await expect.element(screen.getByText('0 req/min')).toBeVisible();
  await expect.element(screen.getByText('0ms latency')).toBeVisible();
  await expect.element(screen.getByText('0 tok/min')).toBeVisible();
});

test('the tick slides the window, so an older request leaves while a newer one stays', async () => {
  vi.useFakeTimers({ now: NOW, toFake: ['setInterval', 'clearInterval', 'Date'] });

  const screen = await footerHolding([
    row('older', { at: NOW - MINUTE + 1_000 }),
    row('newer', { at: NOW }),
  ]);

  await expect.element(screen.getByText('2 req/min')).toBeVisible();

  await vi.advanceTimersByTimeAsync(2_000);

  await expect.element(screen.getByText('1 req/min')).toBeVisible();
});

test('the strip stands passive, with nothing on it to press', async () => {
  const screen = await footerHolding([]);

  await expect.element(screen.getByText('0 req/min')).toBeVisible();
  expect(screen.container.querySelectorAll('button, a, input, [tabindex]')).toHaveLength(0);
});

test('a double-click on the bare strip stands the request log up', async () => {
  const screen = await footerHolding([]);

  await expect.element(screen.getByText('0 req/min')).toBeVisible();

  expect(logsDrawerOpen()).toBe(false);

  doubleClick(stripIn(screen.container));

  expect(logsDrawerOpen()).toBe(true);
});

test('a second double-click on the strip puts the request log away again', async () => {
  const screen = await footerHolding([]);

  await expect.element(screen.getByText('0 req/min')).toBeVisible();

  const strip = stripIn(screen.container);

  doubleClick(strip);
  doubleClick(strip);

  expect(logsDrawerOpen()).toBe(false);
});

test('a double-click on a reading leaves the log where it was, so a word still selects', async () => {
  const screen = await footerHolding([]);

  const reading = screen.getByText('0 req/min');

  await expect.element(reading).toBeVisible();

  doubleClick(reading.element());

  expect(logsDrawerOpen()).toBe(false);
});

test('the strip takes its gesture with it, so a press after it leaves turns nothing over', async () => {
  const screen = await footerHolding([]);

  await expect.element(screen.getByText('0 req/min')).toBeVisible();

  const strip = stripIn(screen.container);

  await screen.unmount();

  doubleClick(strip);

  expect(logsDrawerOpen()).toBe(false);
});
