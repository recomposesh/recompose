import { firstEventBoundMs } from '@recompose/contracts';

import type { Crossing } from './gateway-wire';

import { isJsonObject, parsedJson } from './gateway-wire';
import { codexEventError, codexEventErrorStatus } from './provider/codex-event-error';
import { sseDataOf, withoutTrailingReturn } from './stream-wire';

export type UpstreamCommit =
  | { kind: 'committed'; upstream: Response }
  | { kind: 'error-before-commit'; equivalentStatus: number; upstream: Response };

const EVENT_BREAK = /\r?\n\r?\n/u;

type Held = { text: string; bytes: Uint8Array[]; reader: ReadableStreamDefaultReader<Uint8Array> };

type Deadline = { silence: Promise<never>; release: () => void };

type ReadStep = Awaited<ReturnType<ReadableStreamDefaultReader<Uint8Array>['read']>>;

function whichTargetItWas(crossing: Crossing): string {
  return `the target "${crossing.providerModel}" for the virtual model "${crossing.virtualModel}"`;
}

function neverOpenedMessage(crossing: Crossing): string {
  return `The gateway "${crossing.gatewayName}" waited out its bound on ${whichTargetItWas(crossing)}, and the answer never opened.`;
}

function lostMidAnswerMessage(crossing: Crossing): string {
  return `The gateway "${crossing.gatewayName}" lost ${whichTargetItWas(crossing)} partway through the answer it had already begun.`;
}

/**
 * The patience one child is given to open its answer, spent from the moment the body is opened.
 *
 * @summary It is released rather than left to run, because the wait it bounds ends at the first
 * event and not at the end of the answer. A bound that kept counting would cut a model still writing
 * a reply it had already started, which is the one failure this deadline exists to avoid causing.
 */
function silenceAfter(boundMs: number, whatItMeans: string): Deadline {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const silence = new Promise<never>((_kept, giveUp) => {
    timer = setTimeout(() => {
      giveUp(new Error(whatItMeans));
    }, boundMs);
  });

  return {
    silence,
    release: () => {
      clearTimeout(timer);
    },
  };
}

function firstEventIn(text: string): string | undefined {
  const broke = EVENT_BREAK.exec(text);

  return broke === null ? undefined : text.slice(0, broke.index);
}

async function readUntilTheBreak(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  deadline: Deadline,
): Promise<Held> {
  const decoder = new TextDecoder();
  const bytes: Uint8Array[] = [];
  let text = '';

  for (;;) {
    const step = await Promise.race([reader.read(), deadline.silence]);

    if (step.done) return { text, bytes, reader };

    bytes.push(step.value);
    text += decoder.decode(step.value, { stream: true });

    if (EVENT_BREAK.test(text)) return { text, bytes, reader };
  }
}

async function heldUntilFirstEvent(
  body: ReadableStream<Uint8Array>,
  deadline: Deadline,
): Promise<Held> {
  const reader = body.getReader();

  try {
    return await readUntilTheBreak(reader, deadline);
  } catch (nothingArrived) {
    await letGoOf(reader);

    throw nothingArrived;
  } finally {
    deadline.release();
  }
}

function errorStatusOf(payload: unknown): number | undefined {
  const direct = codexEventError(payload);

  if (direct !== null) return codexEventErrorStatus(direct);

  if (!isJsonObject(payload) || !isJsonObject(payload['error'])) return undefined;

  const wrapped = codexEventError({ type: 'error', error: payload['error'] });

  return wrapped === null ? undefined : codexEventErrorStatus(wrapped);
}

function statusTheFirstEventEquals(held: Held): number | undefined {
  const event = firstEventIn(held.text);

  if (event === undefined) return undefined;

  for (const line of event.split('\n')) {
    const payload = sseDataOf(withoutTrailingReturn(line));

    if (payload !== null) return errorStatusOf(parsedJson(payload));
  }

  return undefined;
}

function enqueueHeld(controller: ReadableStreamDefaultController<Uint8Array>, held: Held): void {
  for (const chunk of held.bytes) controller.enqueue(chunk);
}

/**
 * One more chunk of an answer the caller is already reading, or the reason it stopped arriving.
 *
 * @summary A connection that dies here has already committed, so the failure travels downstream as a
 * truncated stream rather than a refusal, and the log is the only place a person will ever learn
 * which child it was. Naming the gateway, the target and the virtual model costs one catch per chunk
 * and copies nothing, so a streaming path pays no more for the context than for the bare failure.
 */
async function readingOn(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  crossing: Crossing,
): Promise<ReadStep> {
  try {
    return await reader.read();
  } catch (died) {
    console.error(lostMidAnswerMessage(crossing), died);

    throw died;
  }
}

function replayingAllOfIt(held: Held, crossing: Crossing): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      enqueueHeld(controller, held);
    },
    async pull(controller) {
      const step = await readingOn(held.reader, crossing);

      if (step.done) {
        controller.close();

        return;
      }

      controller.enqueue(step.value);
    },
    cancel: async (reason) => held.reader.cancel(reason),
  });
}

function replayingOnlyWhatWasHeld(held: Held): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      enqueueHeld(controller, held);
      controller.close();
    },
  });
}

function rebuilt(upstream: Response, body: ReadableStream<Uint8Array>): Response {
  return new Response(body, { status: upstream.status, headers: upstream.headers });
}

function carriesEventStream(upstream: Response): boolean {
  return upstream.headers.get('content-type')?.includes('text/event-stream') === true;
}

/**
 * Lets go of an upstream body the walk has already decided against.
 *
 * @summary The answer this child gives is already fixed, either by the error its first event carried
 * or by the bound it ran past, and nothing downstream reads another byte of it. Cancelling only frees
 * the socket, and a body abandoned before commit is the one body whose cancel is expected to reject,
 * carrying back the very failure already classified. Raising it here would replace an outcome the
 * walk can act on, which is moving to the next child, with a throw about a body nobody reads.
 */
async function letGoOf(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
  await reader.cancel().catch(() => undefined);
}

async function latchedStream(
  upstream: Response,
  body: ReadableStream<Uint8Array>,
  crossing: Crossing,
  boundMs: number,
): Promise<UpstreamCommit> {
  const deadline = silenceAfter(boundMs, neverOpenedMessage(crossing));
  const held = await heldUntilFirstEvent(body, deadline);
  const equivalentStatus = statusTheFirstEventEquals(held);

  if (equivalentStatus === undefined) {
    return { kind: 'committed', upstream: rebuilt(upstream, replayingAllOfIt(held, crossing)) };
  }

  await letGoOf(held.reader);

  return {
    kind: 'error-before-commit',
    equivalentStatus,
    upstream: rebuilt(upstream, replayingOnlyWhatWasHeld(held)),
  };
}

/**
 * The upstream answer read as far as the commit boundary, which is the first byte owed downstream.
 *
 * @summary An upstream 200 proves nothing, because a stream can open with an error event, so the
 * latch reads one event before the caller is owed anything and reports what that event was. Holding
 * relay until the first upstream event classifies is not buffering: the held event is enqueued the
 * moment the reading settles, and every later chunk is relayed as it arrives rather than collected.
 * Only the first event is read, so a failure after it belongs to the child that already committed and
 * travels to the caller as the provider wrote it. The reading is bounded, because a target that
 * accepts a request and then says nothing owes the caller the same nothing a refused connection does,
 * and the bound belongs to the gateway rather than to whichever client happens to carry the request.
 */
export async function upstreamAtTheCommitLatch(
  upstream: Response,
  crossing: Crossing,
  boundMs: number = firstEventBoundMs,
): Promise<UpstreamCommit> {
  const body = upstream.body;

  return body === null || !carriesEventStream(upstream)
    ? { kind: 'committed', upstream }
    : latchedStream(upstream, body, crossing, boundMs);
}
