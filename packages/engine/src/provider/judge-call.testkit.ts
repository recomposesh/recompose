import type { SpendGrant } from '@recompose/contracts';

import type { BranchRule } from '../routing/policies';
import type { JudgeAsk, JudgeCooling } from './judge-call';

import { requestUrlOf } from '../gateway-router.testkit';

const BRANCHES: readonly BranchRule[] = [
  { label: 'code', rule: 'asks to write or change code', child: 'coder' },
  { label: 'chat', rule: 'small talk and questions', child: 'talker' },
];

/** The instant every classification scenario reads its clock at. */
export const NOW = 1_700_000_000_000;

const A_KEYED_JUDGE: SpendGrant = {
  verdict: 'resolved',
  providerOrigin: 'http://judge.test',
  spend: { custody: 'credentialed', provider: 'openai', credential: 'sk-live-40d1' },
};

/** One ask, with everything it sent and everything it stood down, watched from outside. */
export type Watched = {
  ask: JudgeAsk;
  sentTo: string[];
  bodies: string[];
  cooled: JudgeCooling[];
  aborted: () => boolean;
};

/**
 * A judge whose answer a scenario writes, standing at the one process boundary a walk crosses.
 *
 * @summary The answer is handed the bound signal because a real fetch ties the body stream to it,
 * so a scenario about a body severed mid-flight can only be told here.
 */
export function answering(
  answer: (bound?: AbortSignal) => Response | Promise<Response>,
  grant = A_KEYED_JUDGE,
): Watched {
  const sentTo: string[] = [];
  const bodies: string[] = [];
  const cooled: JudgeCooling[] = [];
  let cut = false;

  const fetchLike: typeof fetch = async (input, init) => {
    sentTo.push(requestUrlOf(input));
    bodies.push(typeof init?.body === 'string' ? init.body : '');

    const signal = init?.signal;

    return new Promise<Response>((settle, fail) => {
      signal?.addEventListener('abort', () => {
        cut = true;
        fail(new Error('the judge call was cut off'));
      });

      Promise.resolve(answer(signal ?? undefined)).then(settle, fail);
    });
  };

  return {
    sentTo,
    bodies,
    cooled,
    aborted: () => cut,
    ask: {
      grant,
      providerModel: 'gpt-5-mini',
      sourceDialect: 'chat-completions',
      gatewayName: 'Codex',
      virtualModel: 'fast',
      branches: BRANCHES,
      raw: { model: 'fast', messages: [{ role: 'user', content: 'rename this function' }] },
      boundMs: 2_000,
      fetchLike,
      now: () => NOW,
      cool: (cooling) => {
        cooled.push(cooling);
      },
    },
  };
}

/** A judge whose status line arrives and whose body then stops, the way a cut connection reads. */
export function answeringWithASeveredBody(): Watched {
  return answering(
    (bound) =>
      new Response(
        new ReadableStream({
          start: (controller) => {
            bound?.addEventListener('abort', () => {
              controller.error(new Error('the body stopped arriving'));
            });
          },
        }),
      ),
  );
}

/** A judge that never answers at all, so only the budget ends the wait. */
export function neverAnswering(): Watched {
  return answering(
    async () =>
      new Promise<Response>(() => {
        return;
      }),
  );
}
