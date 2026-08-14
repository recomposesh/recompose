import { describe, expect, test } from 'vitest';

import {
  childlessRouterTheTableHolds,
  firstDeclaredTarget,
  targetsInDeclaredOrder,
} from './route-table';
import {
  aBoundTarget,
  aFailoverOver,
  aRemovedTarget,
  aRoundRobinOver,
  aTableEnteredAt,
} from './routing.testkit';

describe('the one target a reader gets when it can only serve one', () => {
  test('a table bound straight to a target names that target', () => {
    const routing = aTableEnteredAt('solo', { solo: aBoundTarget('claude-opus-4') });

    expect(firstDeclaredTarget(routing)).toEqual({
      routeNode: 'solo',
      standing: { standing: 'bound', providerModel: 'claude-opus-4' },
    });
  });

  test('a table entered through a ladder names the first child the ladder declares', () => {
    const routing = aTableEnteredAt('ladder', {
      ladder: aFailoverOver('second', 'first'),
      first: aBoundTarget('first-model'),
      second: aBoundTarget('second-model'),
    });

    expect(firstDeclaredTarget(routing)?.routeNode).toBe('second');
  });

  test('a ladder standing over another ladder names the deepest target declared first', () => {
    const routing = aTableEnteredAt('top', {
      top: aFailoverOver('inner', 'late'),
      inner: aRoundRobinOver('deep'),
      deep: aBoundTarget('deep-model'),
      late: aBoundTarget('late-model'),
    });

    expect(firstDeclaredTarget(routing)?.routeNode).toBe('deep');
  });

  test('a target whose account was removed still stands as the first declared one', () => {
    const routing = aTableEnteredAt('gone', { gone: aRemovedTarget() });

    expect(firstDeclaredTarget(routing)).toEqual({
      routeNode: 'gone',
      standing: { standing: 'removed' },
    });
  });

  test('a table whose entry names no node names no target', () => {
    const routing = aTableEnteredAt('missing', { other: aBoundTarget() });

    expect(firstDeclaredTarget(routing)).toBeUndefined();
  });

  test('a ladder holding no child names no target', () => {
    const routing = aTableEnteredAt('empty', { empty: aFailoverOver() });

    expect(firstDeclaredTarget(routing)).toBeUndefined();
  });
});

describe('the targets a walk can reach, in the order their tables declare them', () => {
  test('a ladder reads its children in the order it declares them', () => {
    const routing = aTableEnteredAt('ladder', {
      ladder: aFailoverOver('third', 'first', 'second'),
      first: aBoundTarget(),
      second: aBoundTarget(),
      third: aBoundTarget(),
    });

    expect(targetsInDeclaredOrder(routing).map((target) => target.routeNode)).toEqual([
      'third',
      'first',
      'second',
    ]);
  });

  test('a nested ladder reads its own children before its parent moves on', () => {
    const routing = aTableEnteredAt('top', {
      top: aFailoverOver('inner', 'last'),
      inner: aFailoverOver('early', 'middle'),
      early: aBoundTarget(),
      middle: aBoundTarget(),
      last: aBoundTarget(),
    });

    expect(targetsInDeclaredOrder(routing).map((target) => target.routeNode)).toEqual([
      'early',
      'middle',
      'last',
    ]);
  });

  test('a child naming no node in the table is passed over rather than counted', () => {
    const routing = aTableEnteredAt('ladder', {
      ladder: aFailoverOver('ghost', 'real'),
      real: aBoundTarget(),
    });

    expect(targetsInDeclaredOrder(routing).map((target) => target.routeNode)).toEqual(['real']);
  });

  test('a table that leads back to a node it already passed stops rather than circling', () => {
    const routing = aTableEnteredAt('top', {
      top: aFailoverOver('loop'),
      loop: aFailoverOver('top', 'reachable'),
      reachable: aBoundTarget(),
    });

    expect(targetsInDeclaredOrder(routing).map((target) => target.routeNode)).toEqual([
      'reachable',
    ]);
  });

  test('a table holding no target at all reads as no targets', () => {
    const routing = aTableEnteredAt('empty', { empty: aRoundRobinOver() });

    expect(targetsInDeclaredOrder(routing)).toEqual([]);
  });
});

describe('the router that holds no child', () => {
  test('an entry router holding no child is the one the table names', () => {
    const routing = aTableEnteredAt('empty', { empty: aRoundRobinOver() });

    expect(childlessRouterTheTableHolds(routing)).toEqual({
      routeNode: 'empty',
      router: { kind: 'router', policy: { mode: 'round-robin' }, children: [] },
    });
  });

  test('a childless router nested under a ladder is the one the table names', () => {
    const routing = aTableEnteredAt('top', {
      top: aFailoverOver('inner'),
      inner: aFailoverOver(),
    });

    expect(childlessRouterTheTableHolds(routing)?.routeNode).toBe('inner');
  });

  test('a table whose routers all hold children names no childless router', () => {
    const routing = aTableEnteredAt('ladder', {
      ladder: aFailoverOver('only'),
      only: aBoundTarget(),
    });

    expect(childlessRouterTheTableHolds(routing)).toBeUndefined();
  });

  test('a table bound straight to a target names no childless router', () => {
    const routing = aTableEnteredAt('solo', { solo: aBoundTarget() });

    expect(childlessRouterTheTableHolds(routing)).toBeUndefined();
  });
});
