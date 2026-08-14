import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import type { RouterNodeData } from './router-node';

import { cardOnCanvas } from '../../testing/canvas-flow.testkit';
import { RouterNode } from './router-node';

function routerData(over: Partial<RouterNodeData> = {}): RouterNodeData {
  return {
    id: 'route:fast:r1',
    kind: 'router',
    modelId: 'fast',
    routeNodeId: 'r1',
    depth: 0,
    mode: 'failover',
    displayName: undefined,
    childCount: 2,
    onAddChild: () => {},
    ...over,
  };
}

async function renderRouter(data: RouterNodeData, selected = false) {
  return render(cardOnCanvas('router', RouterNode, data, selected));
}

test('a router wearing its derived name reads the mode as its name and never prints it twice', async () => {
  const screen = await renderRouter(routerData());
  const card = screen.getByRole('button', { name: /Failover/ });

  await expect.element(card).toHaveTextContent('Router');
  await expect.element(card).toHaveTextContent('Failover');
  await expect.element(card).toHaveTextContent('2 children');
  await expect.element(card).not.toHaveTextContent('failover');
});

test('a router a person named reads its name over the mode', async () => {
  const screen = await renderRouter(routerData({ displayName: 'Ladder' }));
  const card = screen.getByRole('button', { name: /Ladder/ });

  await expect.element(card).toHaveTextContent('Ladder');
  await expect.element(card).toHaveTextContent('failover');
});

test('a round-robin router derives its own name from the mode it spreads by', async () => {
  const screen = await renderRouter(routerData({ mode: 'round-robin', childCount: 1 }));
  const card = screen.getByRole('button', { name: /Round-robin/ });

  await expect.element(card).toHaveTextContent('1 child');
});

test('a router holding no child says so rather than counting to zero', async () => {
  const screen = await renderRouter(routerData({ childCount: 0 }));

  await expect
    .element(screen.getByRole('button', { name: /Failover/ }))
    .toHaveTextContent('no child');
});

test('a selected router says so, which is what the inspector opens against', async () => {
  const screen = await renderRouter(routerData(), true);

  await expect.element(screen.getByRole('button', { pressed: true })).toBeVisible();
});

test('the port carries the ask that binds the router its next child', async () => {
  const heard: string[] = [];
  const screen = await renderRouter(
    routerData({
      onAddChild: () => {
        heard.push('asked');
      },
    }),
  );

  await screen.getByRole('button', { name: 'Add a child' }).click();

  expect(heard).toEqual(['asked']);
});
