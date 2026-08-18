import type { GatewayTraffic } from '@recompose/contracts';

import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { emitEngineTraffic } from '../../../../shared/testing';
import { canvasPageOn, freshCanvasRun } from '../../testing/canvas-page.testkit';
import { pooledGateway } from '../../testing/routed-gateways.testkit';

vi.setConfig({ testTimeout: 40_000 });

beforeEach(freshCanvasRun);

const REFUSED = 'The gateway could not reach the target.';

const served: GatewayTraffic = {
  'my-gateway': { fast: { 'node-fast': { outcome: 'served', at: Date.now() } } },
};

const failed: GatewayTraffic = {
  'my-gateway': {
    fast: { 'node-fast': { outcome: 'failed', at: 2, status: 502, detail: REFUSED } },
  },
};

function standingOf(container: HTMLElement, edgeId: string): string {
  const drawn = container.querySelector(`[data-id="${edgeId}"] .react-flow__edge-path`);

  return drawn?.getAttribute('class') ?? '';
}

function standingsOn(container: HTMLElement, modelId: string): readonly string[] {
  return [`wire:model:${modelId}`, `cable:${modelId}`].map((id) => standingOf(container, id));
}

test('a gateway nothing has flowed through leaves every cable resting, because green is earned', async () => {
  const screen = await canvasPageOn();

  await expect
    .poll(() =>
      standingsOn(screen.container, 'fast').every((held) => held.includes('stroke-cable-resting')),
    )
    .toBe(true);
});

test('a request the gateway served paints both cables of the model it flowed through', async () => {
  const screen = await canvasPageOn();

  emitEngineTraffic(served);

  await expect
    .poll(() => standingsOn(screen.container, 'fast').every((held) => held.includes('served')))
    .toBe(true);
});

test('a request that failed stands its error on the cable, saying the status and the sentence', async () => {
  const screen = await canvasPageOn();

  emitEngineTraffic(failed);

  await userEvent.click(screen.getByRole('button', { name: /last error/i }));

  await expect.element(screen.getByText(REFUSED)).toBeVisible();
  await expect.element(screen.getByText(/Status 502/)).toBeVisible();
});

test('one failed virtual model stands one error, so the gateway wire never repeats it', async () => {
  const screen = await canvasPageOn();

  emitEngineTraffic(failed);

  await expect.element(screen.getByRole('button', { name: /last error/i })).toBeVisible();
  expect(screen.getByRole('button', { name: /last error/i }).elements()).toHaveLength(1);
});

test('traffic through one virtual model leaves the cables of the others at rest', async () => {
  const screen = await canvasPageOn();

  emitEngineTraffic(failed);

  await expect
    .poll(() => standingsOn(screen.container, 'fast').every((held) => held.includes('failed')))
    .toBe(true);

  for (const standing of standingsOn(screen.container, 'creative')) {
    expect(standing).toContain('stroke-cable-resting');
  }
});

const throughThePool: GatewayTraffic = {
  'my-gateway': { pooled: { t2: { outcome: 'served', at: Date.now() } } },
};

const pooledMovedOn: GatewayTraffic = {
  'my-gateway': {
    pooled: {
      t1: { outcome: 'failed', at: 1, status: 429, detail: REFUSED },
      t2: { outcome: 'served', at: Date.now() },
    },
  },
};

test('a request through a routed model lights every cable down to the child that answered', async () => {
  const screen = await canvasPageOn({ gateways: [pooledGateway] });

  emitEngineTraffic(throughThePool);

  await expect
    .poll(() =>
      ['wire:model:pooled', 'cable:pooled', 'cable:pooled:t2'].every((id) =>
        standingOf(screen.container, id).includes('served'),
      ),
    )
    .toBe(true);
  expect(standingOf(screen.container, 'cable:pooled:t1')).toContain('stroke-cable-resting');
});

test('a routed walk that moved on stands its one error on the child that failed', async () => {
  const screen = await canvasPageOn({ gateways: [pooledGateway] });

  emitEngineTraffic(pooledMovedOn);

  await expect.element(screen.getByRole('button', { name: /last error/i })).toBeVisible();
  expect(screen.getByRole('button', { name: /last error/i }).elements()).toHaveLength(1);
});

test('a request served after a failure gives the cables back their green and takes the error away', async () => {
  const screen = await canvasPageOn();

  emitEngineTraffic(failed);
  await expect.element(screen.getByRole('button', { name: /last error/i })).toBeVisible();

  emitEngineTraffic(served);

  await expect
    .poll(() => standingsOn(screen.container, 'fast').every((held) => held.includes('served')))
    .toBe(true);
  await expect.element(screen.getByRole('button', { name: /last error/i })).not.toBeInTheDocument();
});
