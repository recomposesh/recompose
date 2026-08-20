import type { SpendGrant } from '@recompose/contracts';

import type { JsonObject } from '../gateway-wire';
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

/** A judge bound to a person's own plan, which spends no key and posts on the plan's own channel. */
export const A_PLAN_JUDGE: SpendGrant = {
  verdict: 'resolved',
  providerOrigin: 'https://api.anthropic.com',
  spend: {
    custody: 'subscription',
    provider: 'anthropic',
    accountId: 'plan-1',
    credential: '{}',
    renewal: 'app',
  },
};

function planChannelOf(spending: SpendGrant): string {
  return spending.verdict === 'resolved' && spending.spend.custody === 'subscription'
    ? `${spending.spend.provider}:${spending.spend.accountId}`
    : 'no plan at all';
}

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

  const reachSubscription = async (spending: SpendGrant, body: JsonObject): Promise<Response> => {
    sentTo.push(planChannelOf(spending));
    bodies.push(JSON.stringify(body));

    return answer(undefined);
  };

  return {
    sentTo,
    bodies,
    cooled,
    aborted: () => cut,
    ask: {
      grant,
      reachSubscription,
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
