import type { EngineVirtualModel } from '@recompose/contracts';

import { firstEventBoundMs } from '@recompose/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  answeringInTurn,
  aRoutedModel,
  childRouteNode,
  served,
  serving,
} from './gateway-router.testkit';

const HALF_AN_EVENT = 'data: {"type":"message_start"';

function twoChildren(): EngineVirtualModel {
  return aRoutedModel('failover', [
    { standing: 'bound', providerModel: 'gpt-5-mini' },
    { standing: 'bound', providerModel: 'claude-sonnet-4-5' },
  ]);
}

function aBodyDyingInsideTheFirstEvent(): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(HALF_AN_EVENT));
      controller.error(new Error('socket reset before the event break'));
    },
  });

  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

describe('a stream that dies while the latch still holds the first event', () => {
  it('hands the turn to the sibling, because no byte the caller could keep ever left', async () => {
    const scene = serving(twoChildren(), answeringInTurn(aBodyDyingInsideTheFirstEvent, served));
    const answer = await scene.ask();

    expect(scene.sentTo).toHaveLength(2);
    expect(answer.status).toBe(200);
  });

  it('paints the dead child as a child nothing could be reached at', async () => {
    const scene = serving(twoChildren(), answeringInTurn(aBodyDyingInsideTheFirstEvent, served));

    await (await scene.ask()).text();

    expect(scene.traffic['codex']?.['fast']?.[childRouteNode(1)]).toMatchObject({
      outcome: 'failed',
      status: 502,
      detail: 'The child could not be reached.',
    });
  });
});

function aStreamThatNeverSpeaks(): Response {
  return new Response(new ReadableStream<Uint8Array>(), {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  });
}

describe('a child that accepts the request and then never opens its answer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('hands the turn to the sibling once the gateway bound runs out', async () => {
    vi.useFakeTimers();

    const scene = serving(twoChildren(), answeringInTurn(aStreamThatNeverSpeaks, served));
    const asking = scene.ask();

    await vi.advanceTimersByTimeAsync(firstEventBoundMs);

    const answer = await asking;

    expect(scene.sentTo).toHaveLength(2);
    expect(answer.status).toBe(200);
  });

  it('paints the silent child as a child nothing could be reached at', async () => {
    vi.useFakeTimers();

    const scene = serving(twoChildren(), answeringInTurn(aStreamThatNeverSpeaks, served));
    const asking = scene.ask();

    await vi.advanceTimersByTimeAsync(firstEventBoundMs);
    await (await asking).text();

    expect(scene.traffic['codex']?.['fast']?.[childRouteNode(1)]).toMatchObject({
      outcome: 'failed',
      status: 502,
      detail: 'The child could not be reached.',
    });
  });
});
