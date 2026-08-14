import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { draggedCable, sourcePortOf, targetPortOf } from '../../testing/canvas-gestures.testkit';
import { canvasPageOn, freshCanvasRun } from '../../testing/canvas-page.testkit';
import {
  cardAcross,
  cardSeat,
  droppedOnOpenCanvas,
  ladderUnder,
  routingOf,
} from '../../testing/routed-canvas.testkit';
import { emptyRouterWorld, pooledWorld } from '../../testing/routed-gateways.testkit';

vi.setConfig({ testTimeout: 40_000 });

beforeEach(freshCanvasRun);

test('a cable dropped on empty canvas asks router or target before anything else', async () => {
  const screen = await canvasPageOn();

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  await screen.getByRole('textbox', { name: 'Name' }).fill('Steady');

  await droppedOnOpenCanvas(screen.container, 'draft');

  const asked = screen.getByRole('dialog');

  await expect.element(screen.getByText('Bind a router or a target')).toBeVisible();
  await expect.element(asked.getByRole('button', { name: /Router/ })).toBeVisible();
  await expect.element(asked.getByRole('button', { name: /Target/ })).toBeVisible();
  await expect.element(asked.getByRole('button', { name: 'work' })).not.toBeInTheDocument();
});

test('picking the target continues into the account pick that ships today', async () => {
  const screen = await canvasPageOn();

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  await screen.getByRole('textbox', { name: 'Name' }).fill('Steady');

  await droppedOnOpenCanvas(screen.container, 'draft');
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: /Target/ }));

  await expect.element(screen.getByText('Pick an account', { exact: true })).toBeVisible();
});

test('picking the router stands a wired router holding no child', async () => {
  const screen = await canvasPageOn();

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  await screen.getByRole('textbox', { name: 'Name' }).fill('Steady');

  await droppedOnOpenCanvas(screen.container, 'draft');
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: /Router/ }));

  await expect
    .element(screen.getByRole('button', { name: /Failover/ }))
    .toHaveTextContent('no child');
  await expect
    .poll(async () => {
      const routing = await routingOf('steady');

      return routing === undefined ? undefined : routing.nodes[routing.entry];
    })
    .toMatchObject({ kind: 'router', policy: { mode: 'failover' }, children: [] });
});

test('the same ask from a router port nests a second router under the first', async () => {
  const screen = await canvasPageOn(pooledWorld);

  await droppedOnOpenCanvas(screen.container, 'route:pooled');
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: /Router/ }));

  await expect
    .poll(async () => {
      const routing = await routingOf('pooled');

      return Object.values(routing?.nodes ?? {}).filter((node) => node.kind === 'router').length;
    })
    .toBe(2);
});

test('a cable from a router lands on a stored target, which joins the ladder as one more child', async () => {
  const screen = await canvasPageOn(pooledWorld);

  await draggedCable(
    await sourcePortOf(screen.container, 'route:pooled'),
    await targetPortOf(screen.container, 'target:fast'),
  );

  await expect.element(screen.getByText('Pick a provider model', { exact: true })).toBeVisible();
  await userEvent.click(
    screen.getByRole('dialog').getByRole('button', { name: 'claude-sonnet-5' }),
  );

  await expect.poll(async () => (await ladderUnder('pooled'))?.length).toBe(3);
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

  await expect.poll(() => cardSeat(screen.container, '[data-id^="route:pooled:"]')).toBe(letGoAt);
});

test("a child bound through the router's plus stands beyond the router rather than in its column", async () => {
  const screen = await canvasPageOn(emptyRouterWorld);

  await expect.element(screen.getByRole('button', { name: /Failover/ })).toBeVisible();

  const routerAcross = cardAcross(screen.container, '[data-id="route:pooled"]');

  await userEvent.click(screen.getByLabelText('Add a child'));
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: /Target/ }));
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'work' }));
  await userEvent.click(
    screen.getByRole('dialog').getByRole('button', { name: 'claude-sonnet-5' }),
  );

  await expect.poll(async () => (await ladderUnder('pooled'))?.length).toBe(1);
  expect(cardAcross(screen.container, '[data-id^="target:pooled:"]')).toBeGreaterThan(
    routerAcross ?? 0,
  );
});

test('the inspector writes the mode a person switched the router to', async () => {
  const screen = await canvasPageOn(pooledWorld);

  await userEvent.click(screen.getByRole('button', { name: /Failover/ }).first());
  await userEvent.click(screen.getByRole('radio', { name: 'Round-robin' }));

  await expect
    .poll(async () => {
      const routing = await routingOf('pooled');
      const entry = routing === undefined ? undefined : routing.nodes[routing.entry];

      return entry?.kind === 'router' ? entry.policy.mode : undefined;
    })
    .toBe('round-robin');
});

test('the keyboard reorders the failover ladder, and the write lands in the stored router', async () => {
  const screen = await canvasPageOn(pooledWorld);

  await userEvent.click(screen.getByRole('button', { name: /Failover/ }).first());
  await userEvent.click(screen.getByRole('button', { name: 'Move openrouter up' }));

  await expect.poll(async () => ladderUnder('pooled')).toEqual(['t2', 't1']);
});
