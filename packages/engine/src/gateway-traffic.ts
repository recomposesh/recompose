import type { RequestOutcome } from '@recompose/contracts';

import type { SpendGrantFor } from './gateway-proxy';

export type NoteTraffic = (slug: string, virtualModel: string, request: RequestOutcome) => void;

export type ServeWatched = (
  serve: (spendGrantFor: SpendGrantFor) => Promise<Response>,
) => Promise<Response>;

const FIRST_FAILING_STATUS = 400;

/**
 * The sentence a red cable offers, written from the status and nothing else.
 *
 * @summary Reading the answer would consume the stream and could carry a prompt or a credential
 * back to the screen, so the sentence is chosen rather than quoted.
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

function outcomeOf(status: number, at: number): RequestOutcome {
  return status < FIRST_FAILING_STATUS
    ? { outcome: 'served', at }
    : { outcome: 'failed', at, status, detail: detailFor(status) };
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
      note(spent.slug, spent.virtualModel, outcomeOf(answer.status, now()));
    }

    return answer;
  };
}
