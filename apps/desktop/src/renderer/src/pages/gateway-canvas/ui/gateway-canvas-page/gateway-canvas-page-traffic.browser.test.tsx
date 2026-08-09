import type { GatewayTraffic } from '@recompose/contracts';

import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { emitEngineTraffic } from '../../../../shared/testing';
import { canvasPageOn, freshCanvasRun } from '../../testing/canvas-page.testkit';

vi.setConfig({ testTimeout: 40_000 });

beforeEach(freshCanvasRun);

const REFUSED = 'The gateway could not reach the target.';

const served: GatewayTraffic = { 'my-gateway': { fast: { outcome: 'served', at: 1 } } };

const failed: GatewayTraffic = {
  'my-gateway': { fast: { outcome: 'failed', at: 2, status: 502, detail: REFUSED } },
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

  for (const standing of standingsOn(screen.container, 'fast')) {
    expect(standing).toContain('stroke-cable-resting');
  }
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
  expect(screen.container.querySelectorAll('[aria-expanded]')).toHaveLength(1);
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
