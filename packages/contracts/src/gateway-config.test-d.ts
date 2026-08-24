import { describe, expectTypeOf, test } from 'vitest';

import type {
  GatewayApiKey,
  GatewayConfig,
  RouteNode,
  RouterPolicy,
  RouteTarget,
  Routing,
  VirtualModel,
} from './index';

import { modelAliasSchema } from './gateway-config';
import { targetTheEntryNames } from './gateway-routing';

type TargetNode = Extract<RouteNode, { kind: 'target' }>;
type RouterNode = Extract<RouteNode, { kind: 'router' }>;

describe('the stored shape of a virtual model', () => {
  test('the config pins itself to schema version 5', () => {
    expectTypeOf<GatewayConfig['schemaVersion']>().toEqualTypeOf<5>();
  });

  test('a gateway holds a list of virtual models', () => {
    expectTypeOf<GatewayConfig['virtualModels']>().toEqualTypeOf<VirtualModel[]>();
  });

  test('a virtual model carries a name, a display name, and one routing', () => {
    expectTypeOf<keyof VirtualModel>().toEqualTypeOf<'id' | 'displayName' | 'routing'>();
    expectTypeOf<VirtualModel['id']>().toEqualTypeOf<string>();
    expectTypeOf<VirtualModel['displayName']>().toEqualTypeOf<string>();
  });

  test('the id a client sends parses to a plain string', () => {
    expectTypeOf(modelAliasSchema.parse('claude-5.6-sol')).toEqualTypeOf<string>();
  });

  test('the routing is one graph, never a list and never optional', () => {
    expectTypeOf<VirtualModel['routing']>().toEqualTypeOf<Routing>();
    expectTypeOf<VirtualModel['routing']>().not.toEqualTypeOf<Routing | undefined>();
  });

  test('a virtual model structurally cannot hold a target of its own', () => {
    expectTypeOf<VirtualModel>().not.toHaveProperty('target');
    expectTypeOf<VirtualModel>().not.toHaveProperty('slug');
  });
});

describe('the stored shape of a routing', () => {
  test('a routing names one entry and the table every id resolves through', () => {
    expectTypeOf<keyof Routing>().toEqualTypeOf<'entry' | 'nodes'>();
    expectTypeOf<Routing['entry']>().toEqualTypeOf<string>();
    expectTypeOf<Routing['nodes']>().toEqualTypeOf<Record<string, RouteNode>>();
  });

  test('a route node is a target or a router, and nothing else', () => {
    expectTypeOf<RouteNode['kind']>().toEqualTypeOf<'target' | 'router'>();
  });

  test('a routing structurally cannot nest one node inside another', () => {
    expectTypeOf<Routing>().not.toHaveProperty('children');
    expectTypeOf<Routing>().not.toHaveProperty('policy');
  });
});

describe('the stored shape of a target', () => {
  test('a target names the account it spends and the real model it asks for', () => {
    expectTypeOf<keyof TargetNode>().toEqualTypeOf<'kind' | 'accountId' | 'providerModel'>();
    expectTypeOf<TargetNode['accountId']>().toEqualTypeOf<string>();
    expectTypeOf<TargetNode['providerModel']>().toEqualTypeOf<string>();
  });

  test('the published target type is the target arm itself, never the whole node', () => {
    expectTypeOf<RouteTarget>().toEqualTypeOf<TargetNode>();
  });

  test('the one target a routing binds may be absent, because a router binds none', () => {
    expectTypeOf(targetTheEntryNames).returns.toEqualTypeOf<RouteTarget | undefined>();
  });

  test('a target carries no weight, because no shipped mode reads a share', () => {
    expectTypeOf<TargetNode>().not.toHaveProperty('weight');
  });

  test('a target structurally cannot hold a secret', () => {
    expectTypeOf<TargetNode>().not.toHaveProperty('credentialRef');
    expectTypeOf<TargetNode>().not.toHaveProperty('key');
  });
});

describe('the stored shape of a router', () => {
  test('a router carries a mode, its children, and a name it may not have', () => {
    expectTypeOf<keyof RouterNode>().toEqualTypeOf<
      'kind' | 'displayName' | 'policy' | 'children'
    >();
    expectTypeOf<RouterNode['policy']>().toEqualTypeOf<RouterPolicy>();
    expectTypeOf<RouterNode['displayName']>().toEqualTypeOf<string | undefined>();
  });

  test('the three shipped modes are the only ones a router can wear', () => {
    expectTypeOf<RouterPolicy['mode']>().toEqualTypeOf<
      'failover' | 'round-robin' | 'conditional'
    >();
  });

  test('a router names its children by id, never by value', () => {
    expectTypeOf<RouterNode['children']>().toEqualTypeOf<string[]>();
    expectTypeOf<RouterNode['children'][number]>().toEqualTypeOf<string>();
    expectTypeOf<RouterNode>().not.toHaveProperty('nodes');
  });
});

describe('the stored shape of the key a gateway hands its callers', () => {
  test('a gateway may carry no key at all', () => {
    expectTypeOf<GatewayConfig['apiKey']>().toEqualTypeOf<GatewayApiKey | undefined>();
  });

  test('the key travels with the answer to whether the gateway requires it', () => {
    expectTypeOf<keyof GatewayApiKey>().toEqualTypeOf<'value' | 'required'>();
    expectTypeOf<GatewayApiKey['value']>().toEqualTypeOf<string>();
    expectTypeOf<GatewayApiKey['required']>().toEqualTypeOf<boolean>();
  });

  test('a requirement structurally cannot stand without the key it requires', () => {
    expectTypeOf<Required<GatewayApiKey>>().toEqualTypeOf<GatewayApiKey>();
  });

  test('the key structurally cannot carry a scope or a lifetime', () => {
    expectTypeOf<GatewayApiKey>().not.toHaveProperty('scope');
    expectTypeOf<GatewayApiKey>().not.toHaveProperty('expiresAt');
  });
});
