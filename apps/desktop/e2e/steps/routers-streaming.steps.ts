import type { Page } from '@playwright/test';

import { expect } from '@playwright/test';

import { Given, Then, When } from '../fixtures';
import { sendTurn, turnUnder } from '../gateway-client';
import { recordExchange } from '../gateway-exchanges';
import { gatewayAddress } from '../gateway-screen';
import { answerTheProviderGives } from '../key-probe-stub';
import { FIRST_TARGET, theRoutedModelName } from '../routed-gateway';
import { focusedGateway } from '../scenario-memory';

const MESSAGES_PATH = '/v1/messages';

const ANSWERED = 200;

const EVENT_STREAM = 'text/event-stream';

const EVENT_MARK = 'event: ';

const DATA_MARK = 'data: ';

const EVENT_BREAK = /\r?\n\r?\n/u;

/** The event an Anthropic stream ends a whole answer with, which a broken one never reaches. */
const THE_ANSWER_COMPLETED = 'message_stop';

/**
 * Where the provider cuts its own stream, counted in the events it began rather than the ones it
 * delivered.
 *
 * @summary A stand-in that destroys its socket throws away whatever it wrote in the same tick, so
 * the event that has to reach the caller is never the one the cut lands on. Cutting on the second
 * leaves the first standing, which is one event past the commit latch and the whole of what this
 * scenario needs on the wire.
 */
const CUT_AFTER_THE_OPENING_EVENT = 2;

/**
 * The pause the provider takes between events, which is what puts the first one on the wire.
 *
 * @summary Without a pause the whole answer is composed inside one tick and the destroy discards
 * all of it, so the caller reads a connection that carried nothing rather than a stream that began.
 * The pause is the provider pacing its own answer, which is what every real one does.
 */
const AN_EVENT_AT_A_TIME_MS = 25;

/**
 * A drop on every roll, which is the only rate that drops a connection rather than gambling on it.
 *
 * @summary Any rate between nothing and certainty leaves the scenario to a coin toss, and a
 * scenario that passes on some runs proves nothing on any of them.
 */
const THE_CONNECTION_ALWAYS_DROPS = 1;

/** How far the caller's own read of a streamed answer got. */
type Ending = 'broke' | 'finished' | 'open';

/** A streamed answer the caller is still holding, read as far as some step needed it. */
type CallerStream = {
  status: number;
  contentType: string;
  reader: ReadableStreamDefaultReader<Uint8Array>;
  decoder: TextDecoder;
  text: string;
  ending: Ending;
};

const streamsTheCallerHolds = new WeakMap<Page, CallerStream>();

function streamingTurnUnder(model: string): unknown {
  return {
    model,
    max_tokens: 64,
    stream: true,
    messages: [{ role: 'user', content: 'Say hello.' }],
  };
}

function eventsIn(text: string): string[] {
  return text
    .split('\n')
    .filter((line) => line.startsWith(EVENT_MARK))
    .map((line) => line.slice(EVENT_MARK.length).trim());
}

function isFieldBag(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function modelNamedIn(payload: unknown): string | undefined {
  if (!isFieldBag(payload)) return undefined;

  const message = payload['message'];

  if (!isFieldBag(message)) return undefined;

  const model = message['model'];

  return typeof model === 'string' ? model : undefined;
}

/**
 * The real model the answer the caller is reading was written by.
 *
 * @summary Both children reach one origin under one dialect, so the model the opening event names
 * is the only thing in the stream that says which child is serving it. Without it a scenario can
 * prove a byte arrived while the byte came from the sibling that took over.
 */
function theModelTheStreamNames(text: string): string {
  for (const line of text.split('\n')) {
    if (!line.startsWith(DATA_MARK)) continue;

    const named = modelNamedIn(JSON.parse(line.slice(DATA_MARK.length)));

    if (named !== undefined) return named;
  }

  throw new Error(`no event the caller read names the model that answered: ${text}`);
}

/**
 * The next chunk the caller receives, with a break in the transport read as an ending of its own.
 *
 * @summary A provider that dies mid-stream leaves the caller's read to reject, and that rejection
 * is the observation the scenario is about rather than a failure to report. Letting it throw would
 * end the step before any assertion read what had already arrived.
 */
async function oneChunkMore(held: CallerStream): Promise<CallerStream> {
  try {
    const step = await held.reader.read();

    return step.done
      ? { ...held, ending: 'finished' }
      : { ...held, text: held.text + held.decoder.decode(step.value, { stream: true }) };
  } catch {
    return { ...held, ending: 'broke' };
  }
}

async function untilTheFirstEvent(opened: CallerStream): Promise<CallerStream> {
  let held = opened;

  while (held.ending === 'open' && !EVENT_BREAK.test(held.text)) {
    held = await oneChunkMore(held);
  }

  return held;
}

async function untilTheStreamEnds(opened: CallerStream): Promise<CallerStream> {
  let held = opened;

  while (held.ending === 'open') {
    held = await oneChunkMore(held);
  }

  return held;
}

async function streamOpenedUnder(address: string, model: string): Promise<CallerStream> {
  const answer = await fetch(new URL(MESSAGES_PATH, address), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(streamingTurnUnder(model)),
  });
  const body = answer.body;

  if (body === null) {
    throw new Error(`the gateway answered ${String(answer.status)} carrying no stream at all`);
  }

  return {
    status: answer.status,
    contentType: answer.headers.get('content-type') ?? '',
    reader: body.getReader(),
    decoder: new TextDecoder(),
    text: '',
    ending: 'open',
  };
}

function theStreamTheCallerHolds(page: Page): CallerStream {
  const held = streamsTheCallerHolds.get(page);

  if (held === undefined) {
    throw new Error('no step opened a stream this scenario could read');
  }

  return held;
}

/**
 * A stream the first child opened, cut on the far side of the commit latch.
 *
 * @summary The cut is scripted before the request goes, because a provider decides where its own
 * answer stops and nothing outside it can reach in and break a connection it already owns. What
 * the step proves is the ordering the requirement turns on: a byte reached the caller, so whatever
 * the child does next it does as the child that already committed.
 */
Given(
  'the first target has begun streaming its answer to the caller',
  async ({ page, scriptedProvider }) => {
    scriptedProvider.answers(
      FIRST_TARGET.providerModel,
      { content: answerTheProviderGives },
      { latency: AN_EVENT_AT_A_TIME_MS, truncateAfterChunks: CUT_AFTER_THE_OPENING_EVENT },
    );

    const opened = await streamOpenedUnder(
      await gatewayAddress(page, focusedGateway(page)),
      await theRoutedModelName(page),
    );

    expect(opened.status).toBe(ANSWERED);
    expect(opened.contentType).toContain(EVENT_STREAM);

    const begun = await untilTheFirstEvent(opened);

    expect(eventsIn(begun.text).length).toBeGreaterThan(0);
    expect(theModelTheStreamNames(begun.text)).toBe(FIRST_TARGET.providerModel);

    streamsTheCallerHolds.set(page, begun);
  },
);

When("that target's stream fails partway", async ({ page }) => {
  streamsTheCallerHolds.set(page, await untilTheStreamEnds(theStreamTheCallerHolds(page)));
});

Then('the stream closes', ({ page }) => {
  const closed = theStreamTheCallerHolds(page);

  expect(closed.ending).toBe('broke');
  expect(eventsIn(closed.text)).not.toContain(THE_ANSWER_COMPLETED);
});

Then('no other target receives the request', ({ scriptedProvider }) => {
  expect(scriptedProvider.modelsAsked()).toEqual([FIRST_TARGET.providerModel]);
});

/**
 * A connection the first child never answers on, dropped before it writes any status at all.
 *
 * @summary A drop is scripted on the fixture the first child matches, so the request reaches the
 * stand-in and enters its journal before the socket dies. That is what separates this from a child
 * nothing ever asked: the attempt happened, and it came back carrying nothing to classify.
 */
When(
  'the connection to the first target drops carrying no status',
  async ({ page, scriptedProvider }) => {
    scriptedProvider.answers(
      FIRST_TARGET.providerModel,
      { content: answerTheProviderGives },
      { chaos: { disconnectRate: THE_CONNECTION_ALWAYS_DROPS } },
    );

    const gateway = focusedGateway(page);
    const answer = await sendTurn(
      await gatewayAddress(page, gateway),
      MESSAGES_PATH,
      turnUnder(await theRoutedModelName(page)),
    );

    recordExchange(page, gateway, answer);
  },
);
