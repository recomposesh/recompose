import type { RequestOutcome } from '@recompose/contracts';

export const FIRST_FAILING_STATUS = 400;

const DETAIL_SPAN = 280;

const QUOTE_WAIT_MS = 1500;

/**
 * The sentence a red cable falls back to when the target answered without a word.
 *
 * @summary A failed answer that explains itself is quoted, because the person debugging a red
 * cable wants the target's own reason. A success is never read, since consuming a good stream
 * to take a note would cost the caller its answer.
 */
const detailByStatus = new Map<number, string>([
  [400, 'The gateway could not read the request.'],
  [401, 'The target refused the credential.'],
  [403, 'The target refused the credential.'],
  [404, 'The target serves no such model.'],
  [408, 'The target did not answer in time.'],
  [429, 'The target is turning requests away for now.'],
  [502, 'The gateway could not reach the target.'],
  [504, 'The target did not answer in time.'],
]);

/** The fallback sentence for a failing status the target left unexplained. */
export function detailFor(status: number): string {
  return detailByStatus.get(status) ?? `The target answered ${String(status)}.`;
}

/** Whether a status reads as a failure, which is where every red surface agrees. */
export function failed(status: number): boolean {
  return status >= FIRST_FAILING_STATUS;
}

function wordOf(body: unknown): string | undefined {
  if (typeof body !== 'string') {
    return undefined;
  }

  const spoken = body.trim().slice(0, DETAIL_SPAN).trim();

  return spoken === '' ? undefined : spoken;
}

function spokenInside(body: object): string | undefined {
  const underError = 'error' in body ? spokenBy(body.error) : undefined;

  return underError ?? ('message' in body ? spokenBy(body.message) : undefined);
}

function spokenBy(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) {
    return wordOf(body);
  }

  return spokenInside(body);
}

async function quotedByTheTarget(answer: Response): Promise<string | undefined> {
  if (!(answer.headers.get('content-type') ?? '').includes('json')) {
    return undefined;
  }

  try {
    return spokenBy(await answer.clone().json());
  } catch {
    return undefined;
  }
}

async function beforeTheAnswerGrowsStale<Read>(read: Promise<Read>, whenLate: Read): Promise<Read> {
  return Promise.race([
    read,
    new Promise<Read>((rest) => {
      setTimeout(() => {
        rest(whenLate);
      }, QUOTE_WAIT_MS);
    }),
  ]);
}

/**
 * What a finished answer came to: served under the failing line, quoted or explained above it.
 *
 * @summary The quote is read from a clone under a short deadline, so a slow body never holds the
 * note back and the caller always keeps its own stream.
 */
export async function outcomeOf(answer: Response, at: number): Promise<RequestOutcome> {
  if (answer.status < FIRST_FAILING_STATUS) {
    return { outcome: 'served', at };
  }

  const quoted = await beforeTheAnswerGrowsStale(quotedByTheTarget(answer), undefined);

  return {
    outcome: 'failed',
    at,
    status: answer.status,
    detail: quoted ?? detailFor(answer.status),
  };
}

/**
 * Hands the answer on while watching for the moment its body finishes or breaks.
 *
 * @summary The body is observed rather than consumed, so the caller drains its own stream and the
 * note lands exactly once whether the stream ends, errors, or is cancelled.
 */
export function afterResponseBody(answer: Response, onFinished: () => void): Response {
  if (answer.body === null) {
    onFinished();

    return answer;
  }

  const reader: ReadableStreamDefaultReader<Uint8Array> = answer.body.getReader();
  let finished = false;
  const finishOnce = () => {
    if (!finished) {
      finished = true;
      onFinished();
    }
  };
  const observed = new ReadableStream<Uint8Array>({
    pull: async (controller) => {
      try {
        const next = await reader.read();

        if (next.done) {
          finishOnce();
          controller.close();

          return;
        }

        controller.enqueue(next.value);
      } catch (error) {
        finishOnce();
        controller.error(error);
      }
    },
    cancel: async (reason) => {
      try {
        await reader.cancel(reason);
      } finally {
        finishOnce();
      }
    },
  });

  return new Response(observed, answer);
}
