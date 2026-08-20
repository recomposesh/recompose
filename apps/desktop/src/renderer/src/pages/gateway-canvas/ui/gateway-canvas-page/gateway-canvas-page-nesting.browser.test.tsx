import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { canvasPageOn, freshCanvasRun } from '../../testing/canvas-page.testkit';
import { cardSeat, droppedOnOpenCanvas, routingOf } from '../../testing/routed-canvas.testkit';
import { pooledWorld } from '../../testing/routed-gateways.testkit';

vi.setConfig({ testTimeout: 40_000 });

beforeEach(freshCanvasRun);

/** Answers the binding ask with a router, from the port of a router that already stands. */
async function askedAtTheRoutersPort(): Promise<Awaited<ReturnType<typeof canvasPageOn>>> {
  const screen = await canvasPageOn(pooledWorld);

  await droppedOnOpenCanvas(screen.container, 'route:pooled');
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: /Router/ }));

  return screen;
}

/** Answers the mode step a nested router opens on, which stands between the ask and the write. */
async function pickTheNestedMode(
  screen: Awaited<ReturnType<typeof canvasPageOn>>,
  mode: RegExp,
): Promise<void> {
  const asked = screen.getByRole('dialog');

  await expect.element(asked.getByText('Pick the routing mode')).toBeVisible();
  await userEvent.click(asked.getByRole('radio', { name: mode }));
}

async function routersUnder(modelId: string): Promise<number> {
  const routing = await routingOf(modelId);

  return Object.values(routing?.nodes ?? {}).filter((node) => node.kind === 'router').length;
}

test('the same ask from a router port nests a second router under the first', async () => {
  const screen = await askedAtTheRoutersPort();

  await pickTheNestedMode(screen, /^Failover$/);

  await expect.poll(async () => routersUnder('pooled')).toBe(2);
});

test('a nested conditional router stores nothing until its judge and its else branch stand', async () => {
  const screen = await askedAtTheRoutersPort();

  await pickTheNestedMode(screen, /^Conditional$/);

  await expect.element(screen.getByRole('dialog').getByText('Pick the judge')).toBeVisible();
  expect(await routersUnder('pooled')).toBe(1);
});

test('a card born under a router stands where the cable was let go rather than at a tidy seat', async () => {
  const screen = await canvasPageOn(pooledWorld);

  await droppedOnOpenCanvas(screen.container, 'route:pooled');

  const letGoAt = await vi.waitFor(() => {
    const pending = cardSeat(screen.container, '[data-id="pending"]');

    if (pending === undefined) {
      throw new Error('no pending card stands where the cable was let go yet');
    }

    return pending;
  });

  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: /Router/ }));
  await pickTheNestedMode(screen, /^Failover$/);

  await expect.poll(() => cardSeat(screen.container, '[data-id^="route:pooled:"]')).toBe(letGoAt);
});
