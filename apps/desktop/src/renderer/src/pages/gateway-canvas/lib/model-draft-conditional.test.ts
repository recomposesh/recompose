import type { GatewayConfig } from '@recompose/contracts';

import { GATEWAY_CONFIG_VERSION, routingSchema } from '@recompose/contracts';
import { expect, test } from 'vitest';

import type { SettledDefinition } from './model-draft';

import { conditionalIn } from './conditional-policy';
import { draftFilledIn, emptyDefinition, gatewayDefiningDraft } from './model-draft';

const codex: GatewayConfig = {
  schemaVersion: GATEWAY_CONFIG_VERSION,
  slug: 'codex',
  displayName: 'Codex',
  port: 8397,
  virtualModels: [],
  layout: { nodes: {} },
};

function judgedDraft(over: Partial<SettledDefinition> = {}): SettledDefinition {
  return {
    ...emptyDefinition(),
    displayName: 'Fast',
    id: 'fast',
    bindsThrough: 'router',
    routerMode: 'conditional',
    accountId: 'a1',
    providerModel: 'claude-sonnet-5',
    judge: { accountId: 'a2', providerModel: 'claude-haiku-5' },
    ...over,
  };
}

function storedRouting(draft: SettledDefinition) {
  const stored = gatewayDefiningDraft(codex, draft);
  const model = stored.virtualModels[0];

  if (model === undefined) {
    throw new Error('the save stored no virtual model at all');
  }

  return model.routing;
}

test('a router that spreads by failover needs no judge, because it asks nobody anything', () => {
  expect(draftFilledIn(judgedDraft({ routerMode: 'failover', judge: undefined }))).toBe(true);
});

test('a conditional draft holding no judge cannot be saved, because it would route nothing', () => {
  expect(draftFilledIn(judgedDraft({ judge: undefined }))).toBe(false);
});

test('a conditional draft whose judge names an account but no model cannot be saved', () => {
  expect(draftFilledIn(judgedDraft({ judge: { accountId: 'a2', providerModel: '' } }))).toBe(false);
});

test('a conditional draft whose judge names a model but no account cannot be saved', () => {
  expect(
    draftFilledIn(judgedDraft({ judge: { accountId: '', providerModel: 'claude-haiku-5' } })),
  ).toBe(false);
});

test('a conditional draft with nothing to catch what the judge cannot place cannot be saved', () => {
  expect(draftFilledIn(judgedDraft({ accountId: '', providerModel: '' }))).toBe(false);
});

test('a conditional draft holding a judge and somewhere to fall back saves', () => {
  expect(draftFilledIn(judgedDraft())).toBe(true);
});

test('the target a conditional draft picked stands as the branch that catches everything', () => {
  const routing = storedRouting(judgedDraft());
  const policy = conditionalIn(routing.nodes[routing.entry]);

  expect(policy === undefined ? undefined : routing.nodes[policy.elseChild]).toEqual({
    kind: 'target',
    accountId: 'a1',
    providerModel: 'claude-sonnet-5',
  });
});

test('the judge a conditional draft named joins the table as a target of its own', () => {
  const routing = storedRouting(judgedDraft());
  const policy = conditionalIn(routing.nodes[routing.entry]);

  expect(policy === undefined ? undefined : routing.nodes[policy.judge]).toEqual({
    kind: 'target',
    accountId: 'a2',
    providerModel: 'claude-haiku-5',
  });
});

test('no ladder names the judge, so a declared-order walk never meets it', () => {
  const routing = storedRouting(judgedDraft());
  const policy = conditionalIn(routing.nodes[routing.entry]);
  const entry = routing.nodes[routing.entry];
  const children = entry?.kind === 'router' ? entry.children : [];

  expect(policy === undefined ? undefined : children).not.toContain(policy?.judge);
});

test('a saved conditional draft stands as a table the stored shape will serve', () => {
  expect(routingSchema.safeParse(storedRouting(judgedDraft())).success).toBe(true);
});

test('a conditional router keeps the name a person typed for it', () => {
  const routing = storedRouting(judgedDraft({ routerName: '  Triage  ' }));

  expect(routing.nodes[routing.entry]).toMatchObject({ displayName: 'Triage' });
});

test('a conditional router a person left unnamed answers to its mode instead', () => {
  const routing = storedRouting(judgedDraft());

  expect(routing.nodes[routing.entry]).not.toHaveProperty('displayName');
});

test('a draft binding straight to a provider ignores a judge nobody asked it for', () => {
  const direct = judgedDraft({ bindsThrough: 'target', routerMode: undefined });
  const routing = storedRouting(direct);

  expect(routing.nodes[routing.entry]).toEqual({
    kind: 'target',
    accountId: 'a1',
    providerModel: 'claude-sonnet-5',
  });
});
