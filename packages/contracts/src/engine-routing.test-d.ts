import { describe, expectTypeOf, test } from 'vitest';

import type { EngineRouteNode, EngineRouting, RouterPolicy } from './index';

import { standingTheEntryNames } from './engine-routing';

type EngineTargetNode = Extract<EngineRouteNode, { kind: 'target' }>;

type EngineRouterNode = Extract<EngineRouteNode, { kind: 'router' }>;

describe('the route table the child serves a request through', () => {
  test('the mirror names one entry and the table every id resolves through', () => {
    expectTypeOf<keyof EngineRouting>().toEqualTypeOf<'entry' | 'nodes'>();
    expectTypeOf<EngineRouting['entry']>().toEqualTypeOf<string>();
    expectTypeOf<EngineRouting['nodes']>().toEqualTypeOf<Record<string, EngineRouteNode>>();
  });

  test('a mirrored node is a target or a router, and nothing else', () => {
    expectTypeOf<EngineRouteNode['kind']>().toEqualTypeOf<'target' | 'router'>();
  });

  test('a mirrored target carries its standing alone, so no account crosses the lane', () => {
    expectTypeOf<keyof EngineTargetNode>().toEqualTypeOf<'kind' | 'standing'>();
    expectTypeOf<EngineTargetNode>().not.toHaveProperty('accountId');
    expectTypeOf<EngineTargetNode>().not.toHaveProperty('credential');
  });

  test('a mirrored router carries the mode, the children, and a name it may not have', () => {
    expectTypeOf<keyof EngineRouterNode>().toEqualTypeOf<
      'kind' | 'displayName' | 'policy' | 'children'
    >();
    expectTypeOf<EngineRouterNode['policy']>().toEqualTypeOf<RouterPolicy>();
    expectTypeOf<EngineRouterNode['children']>().toEqualTypeOf<string[]>();
    expectTypeOf<EngineRouterNode['displayName']>().toEqualTypeOf<string | undefined>();
  });

  test('no node in the mirror names the account paying for it', () => {
    expectTypeOf<EngineRouterNode>().not.toHaveProperty('accountId');
    expectTypeOf<Extract<keyof EngineRouteNode, 'accountId'>>().toEqualTypeOf<never>();
  });

  test('the standing an entry names is the standing a target node wears', () => {
    expectTypeOf(standingTheEntryNames).returns.toEqualTypeOf<EngineTargetNode['standing']>();
  });
});
