import type { LogRow } from '@recompose/contracts';

import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, test } from 'vitest';

import {
  engineLogsQueryOptions,
  engineStatesQueryOptions,
  engineTrafficQueryOptions,
} from '../../../../shared/api';
import { lookedAtGateway, rememberedGateway } from '../../../../shared/lib';
import { canvasPositions, setNodePosition } from '../../lib/canvas-position-store';
import { canvasViewport, keepCanvasViewport } from '../../lib/canvas-viewport-store';
import { heldDraft } from '../../lib/use-held-draft';
import { canvasEnvironment, canvasLeftClean, draftHeld } from './canvas-world.testkit';
import { forgottenEverywhere } from './removal-flow';

const LEAVING = 'my-gateway';

const STAYING = 'other-gateway';

function aLineItOnceServed(): LogRow {
  return {
    id: 'row-1',
    at: 1_754_600_000_000,
    gateway: LEAVING,
    virtualModel: 'fast',
    origin: 'provider',
    method: 'POST',
    provider: 'anthropic',
    providerModel: 'claude-sonnet-4',
    status: 200,
    durationMs: 412,
    tokens: 1_200,
    clientKey: `sha256:${'a'.repeat(64)}`,
  };
}

beforeEach(() => {
  canvasEnvironment();
  canvasLeftClean(LEAVING);
  canvasLeftClean(STAYING);
});

describe('what this side forgets when a gateway is deleted', () => {
  test('the arrangement a person dragged goes with the gateway', () => {
    setNodePosition(LEAVING, 'model:fast', { x: 40, y: 90 });

    forgottenEverywhere(new QueryClient(), LEAVING);

    expect(canvasPositions(LEAVING)).toEqual({});
  });

  test('a draft left standing mid-thought goes with it', () => {
    draftHeld(LEAVING, { displayName: 'Steady', id: 'steady', accountId: '', providerModel: '' });

    forgottenEverywhere(new QueryClient(), LEAVING);

    expect(heldDraft(LEAVING)).toBeUndefined();
  });

  test('the memory of having looked at it goes, so the next launch opens elsewhere', () => {
    lookedAtGateway(LEAVING);

    forgottenEverywhere(new QueryClient(), LEAVING);

    expect(rememberedGateway([LEAVING, STAYING])).toBeUndefined();
  });

  test('a memory of a different gateway survives this one leaving', () => {
    lookedAtGateway(STAYING);

    forgottenEverywhere(new QueryClient(), LEAVING);

    expect(rememberedGateway([LEAVING, STAYING])).toBe(STAYING);
  });

  test('the logs cached under its slug go with it', () => {
    const queryClient = new QueryClient();

    queryClient.setQueryData(engineLogsQueryOptions(LEAVING).queryKey, [aLineItOnceServed()]);

    forgottenEverywhere(queryClient, LEAVING);

    expect(queryClient.getQueryData(engineLogsQueryOptions(LEAVING).queryKey)).toBeUndefined();
  });
});

describe('the canvas view a person set on the gateway that left', () => {
  test('the viewport they zoomed and panned to goes with it', () => {
    keepCanvasViewport(LEAVING, { x: 120, y: 240, zoom: 1.5 });

    forgottenEverywhere(new QueryClient(), LEAVING);

    expect(canvasViewport(LEAVING)).toBeUndefined();
  });

  test('the viewport another gateway holds is left standing', () => {
    keepCanvasViewport(LEAVING, { x: 120, y: 240, zoom: 1.5 });
    keepCanvasViewport(STAYING, { x: 8, y: 16, zoom: 0.75 });

    forgottenEverywhere(new QueryClient(), LEAVING);

    expect(canvasViewport(STAYING)).toEqual({ x: 8, y: 16, zoom: 0.75 });
  });
});

describe('what a deleted gateway leaves of the readings every gateway shares', () => {
  test('its row leaves the traffic reading and every other row stays', () => {
    const queryClient = new QueryClient();

    queryClient.setQueryData(engineTrafficQueryOptions.queryKey, {
      [LEAVING]: { fast: { 'node-fast': { outcome: 'served', at: 3 } } },
      [STAYING]: { steady: { 'node-steady': { outcome: 'served', at: 7 } } },
    });

    forgottenEverywhere(queryClient, LEAVING);

    expect(queryClient.getQueryData(engineTrafficQueryOptions.queryKey)).toEqual({
      [STAYING]: { steady: { 'node-steady': { outcome: 'served', at: 7 } } },
    });
  });

  test('its row leaves the states reading and every other row stays', () => {
    const queryClient = new QueryClient();

    queryClient.setQueryData(engineStatesQueryOptions.queryKey, {
      [LEAVING]: { status: 'running' },
      [STAYING]: { status: 'stopped' },
    });

    forgottenEverywhere(queryClient, LEAVING);

    expect(queryClient.getQueryData(engineStatesQueryOptions.queryKey)).toEqual({
      [STAYING]: { status: 'stopped' },
    });
  });

  test('a reading nothing was ever cached under stays uncached rather than becoming empty', () => {
    const queryClient = new QueryClient();

    forgottenEverywhere(queryClient, LEAVING);

    expect(queryClient.getQueryData(engineTrafficQueryOptions.queryKey)).toBeUndefined();
  });
});
