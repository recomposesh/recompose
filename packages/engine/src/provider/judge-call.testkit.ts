import type { SpendGrant } from '@recompose/contracts';

import type { JsonObject } from '../gateway-wire';
import type { BranchRule } from '../routing/policies';
import type { JudgeAsk, JudgeCooling, JudgeNote } from './judge-call';

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
  noted: JudgeNote[];
  aborted: () => boolean;
};

/** A clock that moves one step every time it is read, so a wait can be measured in a scenario. */
export function tickingBy(step: number): () => number {
  let reads = 0;

  return () => NOW + step * reads++;
}

type Answering = (bound?: AbortSignal) => Response | Promise<Response>;

type Wrote = {
  sentTo: string[];
  bodies: string[];
  cooled: JudgeCooling[];
  noted: JudgeNote[];
  cut: boolean;
};

function keyedFetching(wrote: Wrote, answer: Answering): typeof fetch {
  return async (input, init) => {
    wrote.sentTo.push(requestUrlOf(input));
    wrote.bodies.push(typeof init?.body === 'string' ? init.body : '');

    const signal = init?.signal;

    return new Promise<Response>((settle, fail) => {
      signal?.addEventListener('abort', () => {
        wrote.cut = true;
        fail(new Error('the judge call was cut off'));
      });

      Promise.resolve(answer(signal ?? undefined)).then(settle, fail);
    });
  };
}

/**
 * A plan channel that records the account it spent and hands back the scenario's answer.
 *
 * @summary It answers to the bound the same way the keyed transport does, because the real channel
 * now carries the signal down to the wire. A fake that ignored it could only tell a scenario that
 * the wait ended, which is the very half of the promise that once left a plan judge holding a socket
 * for ten minutes after the walk had moved on.
 */
function planReaching(wrote: Wrote, answer: Answering) {
  return async (spending: SpendGrant, body: JsonObject, bound: AbortSignal): Promise<Response> => {
    wrote.sentTo.push(planChannelOf(spending));
    wrote.bodies.push(JSON.stringify(body));

    return new Promise<Response>((settle, fail) => {
      bound.addEventListener('abort', () => {
        wrote.cut = true;
        fail(new Error('the judge call was cut off'));
      });

      Promise.resolve(answer(bound)).then(settle, fail);
    });
  };
}

/**
 * A judge whose answer a scenario writes, standing at the one process boundary a walk crosses.
 *
 * @summary The answer is handed the bound signal because a real fetch ties the body stream to it,
 * so a scenario about a body severed mid-flight can only be told here.
 */
export function answering(answer: Answering, grant = A_KEYED_JUDGE): Watched {
  const wrote: Wrote = { sentTo: [], bodies: [], cooled: [], noted: [], cut: false };

  return {
    sentTo: wrote.sentTo,
    bodies: wrote.bodies,
    cooled: wrote.cooled,
    noted: wrote.noted,
    aborted: () => wrote.cut,
    ask: {
      grant,
      reachSubscription: planReaching(wrote, answer),
      noteJudged: (judged) => {
        wrote.noted.push(judged);
      },
      providerModel: 'gpt-5-mini',
      sourceDialect: 'chat-completions',
      gatewayName: 'Codex',
      virtualModel: 'fast',
      branches: BRANCHES,
      raw: { model: 'fast', messages: [{ role: 'user', content: 'rename this function' }] },
      boundMs: 2_000,
      fetchLike: keyedFetching(wrote, answer),
      now: () => NOW,
      cool: (cooling) => {
        wrote.cooled.push(cooling);
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
