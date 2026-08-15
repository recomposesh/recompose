import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { clickedCable, draftCardOn } from '../../testing/canvas-gestures.testkit';
import { canvasPageOn, freshCanvasRun } from '../../testing/canvas-page.testkit';
import { ladderUnder, routingOf, selectedCard } from '../../testing/routed-canvas.testkit';
import { nestedWorld, pooledWorld } from '../../testing/routed-gateways.testkit';

vi.setConfig({ testTimeout: 40_000 });

beforeEach(freshCanvasRun);

test('Delete on a selected router asks first, naming the router rather than a definition', async () => {
  const screen = await canvasPageOn(pooledWorld);

  await userEvent.click(screen.getByRole('button', { name: /Failover/ }));
  await userEvent.keyboard('{Delete}');

  await expect.element(screen.getByText('Delete the router "Failover"?')).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  await expect.element(screen.getByText(/Delete the router/)).not.toBeInTheDocument();
  expect(await routingOf('pooled')).toBeDefined();
});

test('confirming an entry router removal stands its virtual model back as a draft', async () => {
  const screen = await canvasPageOn(pooledWorld);

  await userEvent.click(screen.getByRole('button', { name: /Failover/ }));
  await userEvent.keyboard('{Delete}');
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'Delete' }));

  await expect.poll(async () => routingOf('pooled')).toBeUndefined();
  await expect.poll(() => draftCardOn(screen.container)?.textContent).toContain('Pooled');
});

test('Delete on one child of a pool drops that child alone and leaves the pool serving', async () => {
  const screen = await canvasPageOn(pooledWorld);

  await selectedCard(screen.container, 'target:pooled:t1');
  await userEvent.keyboard('{Delete}');

  await expect.element(screen.getByText('Delete the target "work"?')).toBeVisible();
  await expect
    .element(screen.getByText(/everything else that router holds keeps serving/))
    .toBeVisible();

  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'Delete' }));

  await expect.poll(async () => ladderUnder('pooled')).toEqual(['t2']);
  await expect.poll(async () => (await routingOf('pooled'))?.nodes['t1']).toBeUndefined();
  expect(draftCardOn(screen.container)).toBeNull();
});

test('Delete on a plainly bound target still releases its whole definition into a draft', async () => {
  const screen = await canvasPageOn(pooledWorld);

  await selectedCard(screen.container, 'target:fast');
  await userEvent.keyboard('{Delete}');

  await expect
    .element(screen.getByText(/the virtual model returns to the canvas as a draft/))
    .toBeVisible();

  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'Delete' }));

  await expect.poll(async () => routingOf('fast')).toBeUndefined();
  await expect.poll(() => draftCardOn(screen.container)?.textContent).toContain('Fast');
});

test("Delete on a child's cable drops that child alone and leaves the pool serving", async () => {
  const screen = await canvasPageOn(pooledWorld);

  await clickedCable(screen.container, 'cable:pooled:t1');
  await userEvent.keyboard('{Delete}');

  await expect.element(screen.getByText('Delete the target "work"?')).toBeVisible();

  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'Delete' }));

  await expect.poll(async () => ladderUnder('pooled')).toEqual(['t2']);
  expect(draftCardOn(screen.container)).toBeNull();
});

test("Delete on a routed model's own cable asks before it takes the whole ladder", async () => {
  const screen = await canvasPageOn(pooledWorld);

  await clickedCable(screen.container, 'cable:pooled');
  await userEvent.keyboard('{Delete}');

  await expect.element(screen.getByText('Delete the router "Failover"?')).toBeVisible();
  expect(await routingOf('pooled')).toBeDefined();

  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  await expect.poll(async () => ladderUnder('pooled')).toEqual(['t1', 't2']);
});

test('the drawer link removes a router too, asking the same question the Delete key does', async () => {
  const screen = await canvasPageOn(nestedWorld);

  await selectedCard(screen.container, 'route:pooled:r2');
  await userEvent.click(screen.getByRole('button', { name: 'Delete Router' }));

  await expect.element(screen.getByText('Delete the router "Round-robin"?')).toBeVisible();

  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'Delete' }));

  await expect.poll(async () => ladderUnder('pooled')).toEqual(['t1']);
});

test('confirming a nested router removal drops it and its children and leaves the ladder serving', async () => {
  const screen = await canvasPageOn(nestedWorld);

  await userEvent.click(screen.getByRole('button', { name: /Round-robin/ }));
  await userEvent.keyboard('{Delete}');

  await expect.element(screen.getByText(/every child standing under it goes too/)).toBeVisible();

  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'Delete' }));

  await expect.poll(async () => ladderUnder('pooled')).toEqual(['t1']);
  await expect.poll(async () => (await routingOf('pooled'))?.nodes['t2']).toBeUndefined();
});
