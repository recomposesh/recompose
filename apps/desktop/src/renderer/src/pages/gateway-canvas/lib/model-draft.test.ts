import type { GatewayConfig, RouteTarget, Routing, VirtualModel } from '@recompose/contracts';

import { GATEWAY_CONFIG_VERSION } from '@recompose/contracts';
import { expect, test } from 'vitest';

import { IpcResultError } from '../../../shared/api';
import { idRefusal, nameRefusal, refusalFromMain } from './draft-refusals';
import {
  draftFilledIn,
  emptyDefinition,
  gatewayDefining,
  gatewayRebinding,
  gatewayReleasing,
  idFollowingName,
} from './model-draft';

function boundThrough(routeNodeId: string, target: RouteTarget): Routing {
  return { entry: routeNodeId, nodes: { [routeNodeId]: target } };
}

const fast: VirtualModel = {
  id: 'fast',
  displayName: 'fast',
  routing: boundThrough('node-fast', {
    kind: 'target',
    accountId: 'a1',
    providerModel: 'claude-sonnet-5',
  }),
};

const codex: GatewayConfig = {
  schemaVersion: GATEWAY_CONFIG_VERSION,
  slug: 'codex',
  displayName: 'Codex',
  port: 8397,
  virtualModels: [],
  layout: { nodes: {} },
};

const slow: VirtualModel = {
  id: 'slow',
  displayName: 'slow',
  routing: boundThrough('node-slow', {
    kind: 'target',
    accountId: 'a1',
    providerModel: 'claude-opus-5',
  }),
};

const onWork: RouteTarget = {
  kind: 'target',
  accountId: 'a2',
  providerModel: 'claude-haiku-4-5',
};

const noneHeld: readonly VirtualModel[] = [];

test('a name with nothing in it refuses, because no model can stand under it', () => {
  expect(nameRefusal('')).toBe('Give the virtual model a name.');
});

test('a name of nothing but spacing asks for one too, because it names nothing', () => {
  expect(nameRefusal('   ')).toBe('Give the virtual model a name.');
});

test('a name a person actually typed passes without a word', () => {
  expect(nameRefusal('Fast Sonnet')).toBeUndefined();
});

test('typing a name derives its id live, keeping the dots a client will send', () => {
  expect(idFollowingName('claude-5', 'claude-5.6', 'claude-5')).toBe('claude-5.6');
});

test("a name derives an id one client's picker keeps, so nobody has to know the rule", () => {
  expect(idFollowingName('', 'Fast Sonnet', '')).toBe('claude-fast-sonnet');
});

test('a name already carrying the word derives no second prefix', () => {
  expect(idFollowingName('', 'Claude Fast', '')).toBe('claude-fast');
  expect(idFollowingName('', 'Anthropic Fast', '')).toBe('anthropic-fast');
});

test('the id keeps following while it still reads as the one the name derives', () => {
  expect(idFollowingName('Fast', 'Faster', 'claude-fast')).toBe('claude-faster');
});

test('an id a person edited by hand detaches, so further name typing leaves it alone', () => {
  expect(idFollowingName('Fast', 'Faster', 'my-alias')).toBe('my-alias');
});

test('stripping the prefix is a hand edit too, so the name stops driving the id', () => {
  expect(idFollowingName('Fast', 'Faster', 'fast')).toBe('fast');
});

test('clearing a hand-edited id lets the name drive it again', () => {
  expect(idFollowingName('Fast', 'Faster', '')).toBe('claude-faster');
});

test('an id no client could send refuses before anything is stored', () => {
  expect(idRefusal('Fast Model', noneHeld)).toBe(
    "recompose can't serve a virtual model under this id. Pick another one.",
  );
});

test('an id this gateway already serves refuses rather than shadowing what stands', () => {
  expect(idRefusal('fast', [fast])).toBe(
    'This gateway already serves a virtual model named "fast".',
  );
});

test('an id carrying dots and no collision passes without a word', () => {
  expect(idRefusal('claude-5.6-sol', noneHeld)).toBeUndefined();
  expect(idRefusal('claude-5.6-sol', [fast])).toBeUndefined();
});

test('a fresh draft opens on nothing said yet, so no field arrives already filled', () => {
  expect(emptyDefinition()).toEqual({
    displayName: '',
    id: '',
    accountId: '',
    providerModel: '',
  });
});

test('a settled draft reaches storage as the gateway carrying the id a person saw', () => {
  const defining = gatewayDefining(codex, {
    displayName: 'Claude 5.6 Sol',
    id: 'claude-5.6-sol',
    accountId: 'a1',
    providerModel: 'claude-sonnet-5',
  });

  const entry = String(defining.virtualModels[0]?.routing.entry);

  expect(defining).toEqual({
    ...codex,
    virtualModels: [
      {
        id: 'claude-5.6-sol',
        displayName: 'Claude 5.6 Sol',
        routing: boundThrough(entry, {
          kind: 'target',
          accountId: 'a1',
          providerModel: 'claude-sonnet-5',
        }),
      },
    ],
  });
});

const named = { displayName: 'Fast', id: 'fast', accountId: '', providerModel: '' };

test('a draft standing on the mode step has no mode to store, so the save waits on one', () => {
  expect(draftFilledIn({ ...named, bindsThrough: 'router' })).toBe(false);
});

test('a draft that settled on how its router spreads has answered everything a router needs', () => {
  expect(draftFilledIn({ ...named, bindsThrough: 'router', routerMode: 'failover' })).toBe(true);
  expect(draftFilledIn({ ...named, bindsThrough: 'router', routerMode: 'round-robin' })).toBe(true);
});

test('a definition joins the ones the gateway already holds rather than replacing them', () => {
  const defining = gatewayDefining(
    { ...codex, virtualModels: [fast] },
    { displayName: 'slow', id: 'slow', accountId: 'a1', providerModel: 'claude-opus-5' },
  );

  expect(defining.virtualModels.map((model) => model.id)).toEqual(['fast', 'slow']);
});

test('a rebound virtual model reaches the new target and nothing of the old one is left', () => {
  const rebound = gatewayRebinding({ ...codex, virtualModels: [fast] }, 'fast', onWork);

  expect(rebound.virtualModels).toEqual([{ ...fast, routing: boundThrough('node-fast', onWork) }]);
});

test('rebinding one virtual model leaves every other definition standing as it was', () => {
  const rebound = gatewayRebinding({ ...codex, virtualModels: [fast, slow] }, 'fast', onWork);

  expect(rebound.virtualModels).toEqual([
    { ...fast, routing: boundThrough('node-fast', onWork) },
    slow,
  ]);
});

test('rebinding a virtual model this gateway never served rewrites nothing', () => {
  const held = { ...codex, virtualModels: [fast] };

  expect(gatewayRebinding(held, 'nowhere', onWork).virtualModels).toEqual([fast]);
});

test('releasing a binding takes the definition out, because the stored shape holds no bare model', () => {
  const released = gatewayReleasing({ ...codex, virtualModels: [fast, slow] }, 'fast');

  expect(released.virtualModels).toEqual([slow]);
});

test('releasing leaves the gateway itself untouched, so only the binding goes', () => {
  const released = gatewayReleasing({ ...codex, virtualModels: [fast] }, 'fast');

  expect(released).toEqual({ ...codex, virtualModels: [] });
});

test('releasing a virtual model this gateway never served takes nothing away', () => {
  const held = { ...codex, virtualModels: [fast, slow] };

  expect(gatewayReleasing(held, 'nowhere').virtualModels).toEqual([fast, slow]);
});

test('a gateway the rewrite could not find refuses in the words main wrote', () => {
  const refused = new IpcResultError({
    code: 'storage-failed',
    message: 'recompose stores no gateway under the slug "codex", so it has nothing to rewrite.',
  });

  expect(refusalFromMain(refused)).toBe(
    'recompose stores no gateway under the slug "codex", so it has nothing to rewrite.',
  );
});

test('a schema refusal trades its developer words for a sentence', () => {
  const refused = new IpcResultError({ code: 'validation-failed', message: 'invalid_type at [0]' });

  expect(refusalFromMain(refused)).toBe(
    "recompose can't store this virtual model. Check the name and the id, then try again.",
  );
});

test('every other refusal reads in the words main wrote', () => {
  const namesake = new IpcResultError({
    code: 'name-conflict',
    message: 'Another gateway already holds the name "Codex".',
  });

  expect(refusalFromMain(namesake)).toBe('Another gateway already holds the name "Codex".');
  expect(refusalFromMain(new Error('the disk is full'))).toBe('the disk is full');
});

test('a refusal arriving with no words at all still says something a person can read', () => {
  expect(refusalFromMain(new Error(''))).toBe(
    'recompose refused this without a reason. Try again.',
  );
  expect(refusalFromMain('the engine went away')).toBe(
    'recompose refused this without a reason. Try again.',
  );
});
