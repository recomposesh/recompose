import type {
  EngineRouteNode,
  EngineVirtualModel,
  GatewayTraffic,
  SpendGrant,
} from '@recompose/contracts';

import { createGatewayApp } from './gateway-app';
import { aCredentialedGrant, aGatewayHolding } from './gateway-app.testkit';
import { ORIGIN, recordingTraffic, requestUrlOf } from './gateway-router.testkit';

const JUDGE_NODE = 'judge';

const ROUTER_NODE = 'ladder';

const JUDGE_ORIGIN = 'http://judge.test';

const CODE_ASK = {
  model: 'fast',
  messages: [{ role: 'user', content: 'rename this function' }],
};

const CHILD_ORIGINS: Readonly<Record<string, string>> = {
  coder: 'http://coder.test',
  talker: 'http://talker.test',
  catchall: 'http://catchall.test',
};

function aBoundTarget(providerModel: string): EngineRouteNode {
  return { kind: 'target', standing: { standing: 'bound', providerModel } };
}

export function aJudgedModel(
  rejudgeEveryRequest = false,
  judgeStanding: EngineRouteNode = aBoundTarget('gpt-5-nano'),
): EngineVirtualModel {
  return {
    id: 'fast',
    displayName: 'Fast',
    routing: {
      entry: ROUTER_NODE,
      nodes: {
        [ROUTER_NODE]: {
          kind: 'router',
          policy: {
            mode: 'conditional',
            judge: JUDGE_NODE,
            branches: [
              { label: 'code', rule: 'asks to write or change code', child: 'coder' },
              { label: 'chat', rule: 'small talk and questions', child: 'talker' },
            ],
            elseChild: 'catchall',
            judgeBoundMs: 2_000,
            rejudgeEveryRequest,
          },
          children: ['coder', 'talker', 'catchall'],
        },
        [JUDGE_NODE]: judgeStanding,
        coder: aBoundTarget('gpt-5-codex'),
        talker: aBoundTarget('gpt-5-mini'),
        catchall: aBoundTarget('gpt-5'),
      },
    },
  };
}

type Sent = { url: string; body: string };

export type JudgedServing = {
  ask: (body?: unknown) => Promise<Response>;
  sent: Sent[];
  askedJudge: () => readonly Sent[];
  reached: () => readonly string[];
  traffic: GatewayTraffic;
};

function grantsPerNode(): (
  slug: string,
  virtualModel: string,
  routeNode: string,
) => Promise<SpendGrant> {
  return async (_slug, _virtualModel, routeNode) =>
    Promise.resolve(
      aCredentialedGrant(
        routeNode === JUDGE_NODE
          ? JUDGE_ORIGIN
          : (CHILD_ORIGINS[routeNode] ?? 'http://nowhere.test'),
      ),
    );
}

function childReached(url: string): string | undefined {
  return Object.keys(CHILD_ORIGINS).find((child) => url.startsWith(CHILD_ORIGINS[child] ?? ''));
}

/**
 * A gateway whose one virtual model stands over a conditional router, with every wire doubled.
 *
 * @summary The judge and the three children each answer at their own origin, so a spec reads which
 * one carried the request from the address alone rather than from anything the engine reported about
 * itself. One app means one memory, which is what lets a second ask prove the pin.
 */
export function servingJudged(
  model: EngineVirtualModel,
  judgeAnswers: () => Response,
  childAnswers: () => Response,
): JudgedServing {
  const sent: Sent[] = [];
  const watched = recordingTraffic();
  const app = createGatewayApp(
    aGatewayHolding(model),
    grantsPerNode(),
    async (input, init) => {
      const url = requestUrlOf(input);

      sent.push({ url, body: typeof init?.body === 'string' ? init.body : '' });

      return Promise.resolve(url.startsWith(JUDGE_ORIGIN) ? judgeAnswers() : childAnswers());
    },
    undefined,
    undefined,
    undefined,
    undefined,
    watched.note,
  );

  return {
    sent,
    traffic: watched.traffic,
    askedJudge: () => sent.filter((one) => one.url.startsWith(JUDGE_ORIGIN)),
    reached: () => sent.flatMap((one) => childReached(one.url) ?? []),
    ask: async (body: unknown = CODE_ASK) =>
      app.request(`${ORIGIN}/v1/messages`, { method: 'POST', body: JSON.stringify(body) }),
  };
}

export function judgeNaming(label: string): () => Response {
  return () => Response.json({ choices: [{ message: { content: label } }] });
}

export function judgeRefusing(): () => Response {
  return () => new Response(JSON.stringify({ error: { message: 'slow down' } }), { status: 429 });
}

export function childServing(): () => Response {
  return () => Response.json({ id: 'msg_1', content: [{ type: 'text', text: 'the answer' }] });
}
