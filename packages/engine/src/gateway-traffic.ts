import type { RequestOutcome } from '@recompose/contracts';

import type { SpendGrantFor } from './gateway-proxy';

export type NoteTraffic = (slug: string, virtualModel: string, request: RequestOutcome) => void;

export type ServeWatched = (
  serve: (spendGrantFor: SpendGrantFor) => Promise<Response>,
) => Promise<Response>;

const FIRST_FAILING_STATUS = 400;

const DETAIL_SPAN = 280;

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

function detailFor(status: number): string {
  return detailByStatus.get(status) ?? `The target answered ${String(status)}.`;
}

function wordOf(body: unknown): string | undefined {
  return typeof body === 'string' && body !== '' ? body : undefined;
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
    return spokenBy(await answer.clone().json())?.slice(0, DETAIL_SPAN);
  } catch {
    return undefined;
  }
}

async function outcomeOf(answer: Response, at: number): Promise<RequestOutcome> {
  if (answer.status < FIRST_FAILING_STATUS) {
    return { outcome: 'served', at };
  }

  return {
    outcome: 'failed',
    at,
    status: answer.status,
    detail: (await quotedByTheTarget(answer)) ?? detailFor(answer.status),
  };
}

type Asked = { slug: string; virtualModel: string };

/**
 * Wraps one serving turn so the virtual model it spent on is noted against the answer it gave.
 *
 * @summary The grant is the one place every serving path names its gateway and its virtual model,
 * and it is handed out fresh per turn, so two requests in flight at once can never take each
 * other's note. A turn that never asked for a grant never reached a virtual model, so it is noted
 * nowhere: an unknown model is a caller's mistake rather than a cable that went red.
 */
export function watchingTraffic(
  spendGrantFor: SpendGrantFor,
  note: NoteTraffic,
  now: () => number = Date.now,
): ServeWatched {
  return async (serve) => {
    const asked: Asked[] = [];
    const answer = await serve(async (slug, virtualModel, context) => {
      asked.push({ slug, virtualModel });

      return spendGrantFor(slug, virtualModel, context);
    });
    const spent = asked.at(-1);

    if (spent !== undefined) {
      note(spent.slug, spent.virtualModel, await outcomeOf(answer, now()));
    }

    return answer;
  };
}
