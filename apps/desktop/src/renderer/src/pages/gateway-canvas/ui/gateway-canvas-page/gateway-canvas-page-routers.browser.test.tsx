import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import {
  draggedCable,
  reconnectAnchorOf,
  sourcePortOf,
  targetPortOf,
} from '../../testing/canvas-gestures.testkit';
import { canvasPageOn, freshCanvasRun } from '../../testing/canvas-page.testkit';
import {
  cardAcross,
  cardSeat,
  droppedOnOpenCanvas,
  ladderUnder,
  routeNodeOf,
  routingOf,
} from '../../testing/routed-canvas.testkit';
import { emptyRouterWorld, judgedWorld, pooledWorld } from '../../testing/routed-gateways.testkit';

vi.setConfig({ testTimeout: 40_000 });

beforeEach(freshCanvasRun);

test('a cable dropped on empty canvas asks router or target before anything else', async () => {
  const screen = await canvasPageOn();

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  await screen.getByRole('textbox', { name: 'Name' }).fill('Steady');

  await droppedOnOpenCanvas(screen.container, 'draft');

  const asked = screen.getByRole('dialog');

  await expect.element(screen.getByText('Bind this model to')).toBeVisible();
  await expect.element(asked.getByRole('button', { name: /Router/ })).toBeVisible();
  await expect.element(asked.getByRole('button', { name: /Provider/ })).toBeVisible();
  await expect.element(asked.getByRole('button', { name: 'work' })).not.toBeInTheDocument();
});

test('picking the target continues into the account pick that ships today', async () => {
  const screen = await canvasPageOn();

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  await screen.getByRole('textbox', { name: 'Name' }).fill('Steady');

  await droppedOnOpenCanvas(screen.container, 'draft');
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: /Provider/ }));

  await expect.element(screen.getByText('Connected providers', { exact: true })).toBeVisible();
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

  await expect.element(screen.getByText(/^Models .+ serves$/)).toBeVisible();
  await userEvent.click(
    screen.getByRole('dialog').getByRole('button', { name: 'claude-sonnet-5' }),
  );

  await expect.poll(async () => (await ladderUnder('pooled'))?.length).toBe(3);
});

test("dragging a child's cable onto another stored target moves that binding, ladder unchanged", async () => {
  const screen = await canvasPageOn(pooledWorld);

  await draggedCable(
    await reconnectAnchorOf(screen.container, 'cable:pooled:t2'),
    await targetPortOf(screen.container, 'target:fast'),
  );
  await userEvent.click(
    screen.getByRole('dialog').getByRole('button', { name: 'claude-sonnet-5' }),
  );

  await expect
    .poll(async () => routeNodeOf('pooled', 't2'))
    .toEqual({ kind: 'target', accountId: 'k1', providerModel: 'claude-sonnet-5' });
  expect(await ladderUnder('pooled')).toEqual(['t1', 't2']);
});

test('stepping back mid-child-rebind reopens the accounts, and the fresh pick still moves it', async () => {
  const screen = await canvasPageOn(pooledWorld);

  await draggedCable(
    await reconnectAnchorOf(screen.container, 'cable:pooled:t2'),
    await targetPortOf(screen.container, 'target:fast'),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Select a different provider' }));
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'work' }));
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'claude-opus-5' }));

  await expect
    .poll(async () => routeNodeOf('pooled', 't2'))
    .toEqual({ kind: 'target', accountId: 'k1', providerModel: 'claude-opus-5' });
  expect(await ladderUnder('pooled')).toEqual(['t1', 't2']);
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
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: /Provider/ }));
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

async function nameOfTheEntryRouter(modelId: string): Promise<string | undefined> {
  const routing = await routingOf(modelId);
  const entry = routing === undefined ? undefined : routing.nodes[routing.entry];

  return entry?.kind === 'router' ? entry.displayName : undefined;
}

test('the inspector names a router, and its card reads that name instead of its mode', async () => {
  const screen = await canvasPageOn(pooledWorld);

  await userEvent.click(screen.getByRole('button', { name: /Failover/ }).first());
  await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
  await screen.getByRole('textbox', { name: 'Router name' }).fill('Ladder');
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));

  await expect.poll(async () => nameOfTheEntryRouter('pooled')).toBe('Ladder');
  await expect.element(screen.getByRole('button', { name: /Ladder/ }).first()).toBeVisible();
});

test('clearing the name stands the router back under the mode it spreads requests by', async () => {
  const screen = await canvasPageOn(pooledWorld);

  await userEvent.click(screen.getByRole('button', { name: /Failover/ }).first());
  await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
  await screen.getByRole('textbox', { name: 'Router name' }).fill('Ladder');
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));

  await expect.poll(async () => nameOfTheEntryRouter('pooled')).toBe('Ladder');

  await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
  await screen.getByRole('textbox', { name: 'Router name' }).fill('');
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));

  await expect.poll(async () => nameOfTheEntryRouter('pooled')).toBeUndefined();
  await expect.element(screen.getByRole('button', { name: /Failover/ }).first()).toBeVisible();
});

test('the keyboard reorders the failover ladder, and the write lands in the stored router', async () => {
  const screen = await canvasPageOn(pooledWorld);

  await userEvent.click(screen.getByRole('button', { name: /Failover/ }).first());
  await userEvent.click(screen.getByRole('button', { name: 'Move openrouter up' }));

  await expect.poll(async () => ladderUnder('pooled')).toEqual(['t2', 't1']);
});

async function spreadingModeOf(modelId: string): Promise<string | undefined> {
  const routing = await routingOf(modelId);
  const entry = routing === undefined ? undefined : routing.nodes[routing.entry];

  return entry?.kind === 'router' ? entry.policy.mode : undefined;
}

async function leavingConditionalFor(mode: string) {
  const screen = await canvasPageOn(judgedWorld);

  await userEvent.click(screen.getByRole('button', { name: /Conditional/ }).first());
  await userEvent.click(screen.getByRole('radio', { name: mode }));

  return screen;
}

test('leaving conditional asks first, naming the wording and the judge it costs', async () => {
  const screen = await leavingConditionalFor('Failover');
  const asked = screen.getByRole('dialog');

  await expect.element(asked).toBeVisible();
  await expect
    .element(asked)
    .toHaveTextContent(/labels and rules go, and the judge goes with them/);
  expect(await spreadingModeOf('pooled')).toBe('conditional');
});

test('keeping the router as it stands leaves the mode and the judge exactly where they were', async () => {
  const screen = await leavingConditionalFor('Failover');

  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument();
  expect(await spreadingModeOf('pooled')).toBe('conditional');
  expect((await routingOf('pooled'))?.nodes['j1']).toBeDefined();
});

test('confirming the switch to failover keeps every child and drops the judge with the wording', async () => {
  const screen = await leavingConditionalFor('Failover');

  await userEvent.click(screen.getByRole('button', { name: 'Switch anyway' }));

  await expect.poll(async () => spreadingModeOf('pooled')).toBe('failover');
  expect(await ladderUnder('pooled')).toEqual(['t1', 't2']);
  expect((await routingOf('pooled'))?.nodes['j1']).toBeUndefined();
});

test('confirming the switch to round-robin takes the same children the same way', async () => {
  const screen = await leavingConditionalFor('Round-robin');

  await userEvent.click(screen.getByRole('button', { name: 'Switch anyway' }));

  await expect.poll(async () => spreadingModeOf('pooled')).toBe('round-robin');
  expect(await ladderUnder('pooled')).toEqual(['t1', 't2']);
  expect((await routingOf('pooled'))?.nodes['j1']).toBeUndefined();
});
