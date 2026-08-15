import type {
  EngineTargetStanding,
  EngineVirtualModel,
  GatewayTraffic,
  RequestOutcome,
  SpendGrant,
} from '@recompose/contracts';

import type { AskedGrant, AskedGrants } from './gateway-app.testkit';

import { createGatewayApp } from './gateway-app';
import { aCredentialedGrant, aGatewayHolding } from './gateway-app.testkit';

export const ROUTER_ROUTE_NODE = 'ladder';

export const ORIGIN = 'http://127.0.0.1:8397';

export const ASK = { model: 'fast', messages: [{ role: 'user', content: 'hello' }] };

export function childRouteNode(rank: number): string {
  return `child-${String(rank)}`;
}

export function aRoutedModel(
  mode: 'failover' | 'round-robin',
  children: readonly EngineTargetStanding[],
  overrides: Partial<Omit<EngineVirtualModel, 'routing'>> = {},
): EngineVirtualModel {
  const bound = children.map((standing, at) => [childRouteNode(at + 1), standing] as const);

  return {
    id: 'fast',
    displayName: 'Fast',
    ...overrides,
    routing: {
      entry: ROUTER_ROUTE_NODE,
      nodes: {
        [ROUTER_ROUTE_NODE]: {
          kind: 'router',
          policy: { mode },
          children: bound.map(([routeNode]) => routeNode),
        },
        ...Object.fromEntries(
          bound.map(([routeNode, standing]) => [routeNode, { kind: 'target', standing }]),
        ),
      },
    },
  };
}

export function aLadderOver(...providerModels: readonly string[]): EngineVirtualModel {
  return aRoutedModel(
    'failover',
    providerModels.map((providerModel) => ({ standing: 'bound' as const, providerModel })),
  );
}

function grantingPerNode(grants: Readonly<Record<string, SpendGrant>>): AskedGrants {
  const asked: AskedGrant[] = [];

  return {
    asked,
    grantFor: async (slug, virtualModel, routeNode) => {
      asked.push({ slug, virtualModel, routeNode });

      return Promise.resolve(grants[routeNode] ?? { verdict: 'missing-target' });
    },
  };
}

export type Answering = { sentTo: string[]; fetchLike: typeof fetch };

export function requestUrlOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') return input;

  return input instanceof URL ? input.href : input.url;
}

export function answeringInTurn(...answers: readonly (() => Response)[]): Answering {
  const sentTo: string[] = [];
  let at = 0;

  return {
    sentTo,
    fetchLike: async (input) => {
      sentTo.push(requestUrlOf(input));

      const answer = answers[at] ?? answers.at(-1);

      at += 1;

      if (answer === undefined) throw new Error('the spec scripted no answer');

      return Promise.resolve(answer());
    },
  };
}

export function served(text = 'the answer'): Response {
  return Response.json({ id: 'msg_1', content: [{ type: 'text', text }] });
}

export function refusedWith(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

export function streamOf(text: string): Response {
  return new Response(text, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

export type Serving = {
  ask: (body?: unknown) => Promise<Response>;
  sentTo: string[];
  asked: AskedGrant[];
  traffic: GatewayTraffic;
};

export function serving(
  model: EngineVirtualModel,
  answering: Answering,
  grants: Readonly<Record<string, SpendGrant>> = {},
): Serving {
  const perNode = grantingPerNode({
    [childRouteNode(1)]: aCredentialedGrant('http://first.test'),
    [childRouteNode(2)]: aCredentialedGrant('http://second.test'),
    ...grants,
  });
  const traffic: GatewayTraffic = {};
  const app = createGatewayApp(
    aGatewayHolding(model),
    perNode.grantFor,
    answering.fetchLike,
    undefined,
    undefined,
    undefined,
    undefined,
    (slug, virtualModel, routeNode, request: RequestOutcome) => {
      const gateway = (traffic[slug] ??= {});
      const held = (gateway[virtualModel] ??= {});

      held[routeNode] = request;
    },
  );

  return {
    sentTo: answering.sentTo,
    asked: perNode.asked,
    traffic,
    ask: async (body: unknown = ASK) =>
      app.request(`${ORIGIN}/v1/messages`, { method: 'POST', body: JSON.stringify(body) }),
  };
}
