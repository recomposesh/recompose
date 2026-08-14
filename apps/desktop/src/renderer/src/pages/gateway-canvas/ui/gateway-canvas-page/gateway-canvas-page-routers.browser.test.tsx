import type { GatewayConfig } from '@recompose/contracts';

import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import type { XY } from '../../lib/canvas-positions';

import { gatewaySeed } from '../../../../shared/testing';
import {
  pulledCable,
  releasedAt,
  sourcePortOf,
  storedModels,
} from '../../testing/canvas-gestures.testkit';
import { canvasPageOn, freshCanvasRun } from '../../testing/canvas-page.testkit';
import { listedModels, storedAccounts } from '../../testing/gateway-canvas.testkit';

vi.setConfig({ testTimeout: 40_000 });

beforeEach(freshCanvasRun);

const pooledGateway: GatewayConfig = gatewaySeed({
  slug: 'my-gateway',
  displayName: 'My Gateway',
  port: 8397,
  virtualModels: [
    {
      id: 'pooled',
      displayName: 'Pooled',
      routing: {
        entry: 'r1',
        nodes: {
          r1: { kind: 'router', policy: { mode: 'failover' }, children: ['t1', 't2'] },
          t1: { kind: 'target', accountId: 'k1', providerModel: 'claude-haiku-4-5' },
          t2: { kind: 'target', accountId: 'g1', providerModel: 'openai/gpt-5' },
        },
      },
    },
  ],
});

const pooledWorld = {
  accounts: storedAccounts,
  gateways: [pooledGateway],
  providerModels: listedModels,
};

function paneSpot(container: HTMLElement, from: XY): XY {
  const pane = container.querySelector('.react-flow')?.getBoundingClientRect() ?? new DOMRect();

  return { x: pane.left + from.x, y: pane.top + from.y };
}

async function droppedOnOpenCanvas(container: HTMLElement, nodeId: string): Promise<void> {
  const letGo = paneSpot(container, { x: 560, y: 440 });

  await pulledCable(await sourcePortOf(container, nodeId), letGo);
  releasedAt(letGo);
}

async function routingOf(modelId: string) {
  const held = await storedModels();

  return held.find((model) => model.id === modelId)?.routing;
}

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
  await userEvent.click(screen.getByRole('button', { name: 'Move OpenRouter up' }));

  await expect
    .poll(async () => {
      const routing = await routingOf('pooled');
      const entry = routing === undefined ? undefined : routing.nodes[routing.entry];

      return entry?.kind === 'router' ? entry.children : undefined;
    })
    .toEqual(['t2', 't1']);
});
