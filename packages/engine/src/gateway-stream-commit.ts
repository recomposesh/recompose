import { isJsonObject, parsedJson } from './gateway-wire';
import { codexEventError, codexEventErrorStatus } from './provider/codex-event-error';
import { sseDataOf, withoutTrailingReturn } from './stream-wire';

export type UpstreamCommit =
  | { kind: 'committed'; upstream: Response }
  | { kind: 'error-before-commit'; equivalentStatus: number; upstream: Response };

const EVENT_BREAK = /\r?\n\r?\n/u;

type Held = { text: string; bytes: Uint8Array[]; reader: ReadableStreamDefaultReader<Uint8Array> };

function firstEventIn(text: string): string | undefined {
  const broke = EVENT_BREAK.exec(text);

  return broke === null ? undefined : text.slice(0, broke.index);
}

async function heldUntilFirstEvent(body: ReadableStream<Uint8Array>): Promise<Held> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const bytes: Uint8Array[] = [];
  let text = '';

  for (;;) {
    const step = await reader.read();

    if (step.done) return { text, bytes, reader };

    bytes.push(step.value);
    text += decoder.decode(step.value, { stream: true });

    if (EVENT_BREAK.test(text)) return { text, bytes, reader };
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

function replaying(held: Held, relayRest: boolean): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of held.bytes) controller.enqueue(chunk);

      if (!relayRest) controller.close();
    },
    async pull(controller) {
      const step = await held.reader.read();

      if (step.done) {
        controller.close();

        return;
      }

      controller.enqueue(step.value);
    },
    cancel: async (reason) => held.reader.cancel(reason),
  });
}

function rebuilt(upstream: Response, body: ReadableStream<Uint8Array>): Response {
  return new Response(body, { status: upstream.status, headers: upstream.headers });
}

function carriesEventStream(upstream: Response): boolean {
  return upstream.headers.get('content-type')?.includes('text/event-stream') === true;
}

async function latchedStream(
  upstream: Response,
  body: ReadableStream<Uint8Array>,
): Promise<UpstreamCommit> {
  const held = await heldUntilFirstEvent(body);
  const equivalentStatus = statusTheFirstEventEquals(held);

  if (equivalentStatus === undefined) {
    return { kind: 'committed', upstream: rebuilt(upstream, replaying(held, true)) };
  }

  await held.reader.cancel().catch(() => undefined);

  return {
    kind: 'error-before-commit',
    equivalentStatus,
    upstream: rebuilt(upstream, replaying(held, false)),
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
 * travels to the caller as the provider wrote it.
 */
export async function upstreamAtTheCommitLatch(upstream: Response): Promise<UpstreamCommit> {
  const body = upstream.body;

  return body === null || !carriesEventStream(upstream)
    ? { kind: 'committed', upstream }
    : latchedStream(upstream, body);
}
