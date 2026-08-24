import type { GatewayJudging, GatewayTraffic } from '@recompose/contracts';

import { beforeEach, expect, test, vi } from 'vitest';

import { emitEngineJudging, emitEngineTraffic } from '../../../../shared/testing';
import { canvasPageOn, freshCanvasRun } from '../../testing/canvas-page.testkit';
import { judgedWorld } from '../../testing/routed-gateways.testkit';

vi.setConfig({ testTimeout: 40_000 });

beforeEach(freshCanvasRun);

const waiting: GatewayJudging = { 'my-gateway': { pooled: { r1: 1 } } };

const settled: GatewayJudging = { 'my-gateway': { pooled: { r1: 0 } } };

const refused: GatewayTraffic = {
  'my-gateway': {
    pooled: { t1: { outcome: 'failed', at: 1, status: 429, detail: 'Turned away.' } },
  },
};

const DOWN_TO_THE_DECISION = ['wire:model:pooled', 'cable:pooled'];

function standingOf(container: HTMLElement, edgeId: string): string {
  const drawn = container.querySelector(`[data-id="${edgeId}"] .react-flow__edge-path`);

  return drawn?.getAttribute('class') ?? '';
}

function litDownToTheDecision(container: HTMLElement): boolean {
  return DOWN_TO_THE_DECISION.every((id) =>
    standingOf(container, id).includes('stroke-cable-live'),
  );
}

test('a router waiting on its judge lights every cable between the gateway and the decision', async () => {
  const screen = await canvasPageOn(judgedWorld);

  emitEngineJudging(waiting);

  await expect.poll(() => litDownToTheDecision(screen.container)).toBe(true);
});

test('the children of the waiting router stay at rest, because no request has reached one', async () => {
  const screen = await canvasPageOn(judgedWorld);

  emitEngineJudging(waiting);

  await expect.poll(() => litDownToTheDecision(screen.container)).toBe(true);

  for (const id of ['cable:pooled:t1', 'cable:pooled:t2']) {
    expect(standingOf(screen.container, id)).toContain('stroke-cable-resting');
  }
});

test('the lit path sends a pulse down itself, so the wait reads as movement rather than color', async () => {
  const screen = await canvasPageOn(judgedWorld);

  emitEngineJudging(waiting);

  await expect
    .poll(() => screen.container.querySelectorAll('.cable-pulse.stroke-cable-live').length)
    .toBeGreaterThan(0);
});

test('a decision under way outranks the failure the request before it left on the wire', async () => {
  const screen = await canvasPageOn(judgedWorld);

  emitEngineTraffic(refused);
  await expect.poll(() => standingOf(screen.container, 'wire:model:pooled')).toContain('failed');

  emitEngineJudging(waiting);

  await expect.poll(() => litDownToTheDecision(screen.container)).toBe(true);
  expect(standingOf(screen.container, 'cable:pooled:t1')).toContain('stroke-cable-failed');
});

test('the path falls back to the frame it draws at rest once the classification settles', async () => {
  const screen = await canvasPageOn(judgedWorld);

  emitEngineJudging(waiting);
  await expect.poll(() => litDownToTheDecision(screen.container)).toBe(true);

  emitEngineJudging(settled);

  await expect
    .poll(() =>
      DOWN_TO_THE_DECISION.every((id) =>
        standingOf(screen.container, id).includes('stroke-cable-resting'),
      ),
    )
    .toBe(true);
});
