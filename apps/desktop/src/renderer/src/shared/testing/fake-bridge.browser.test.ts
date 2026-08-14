import type {
  GatewayTraffic,
  LogBatch,
  LogRow,
  SubscriptionAccountView,
  VirtualModel,
} from '@recompose/contracts';

import { ipcEvents } from '@recompose/contracts';
import { expect, test } from 'vitest';

import { emitEngineLogs, emitEngineTraffic } from '.';
import { installFakeBridge } from './fake-bridge';
import { gatewaySeed } from './fake-gateways';

async function saving(gateway: ReturnType<typeof gatewaySeed>) {
  return window.recompose['gateways:save'](gateway);
}

async function storedGateways() {
  const answer = await window.recompose['gateways:list']();

  return answer.ok ? answer.value : [];
}

async function reportedStates() {
  const answer = await window.recompose['engine:states']();

  return answer.ok ? answer.value : {};
}

const fast: VirtualModel = {
  id: 'fast',
  displayName: 'fast',
  routing: {
    entry: 'seat',
    nodes: { seat: { kind: 'target', accountId: 'acc-key', providerModel: 'claude-sonnet-5' } },
  },
};

const claudeMax: SubscriptionAccountView = {
  id: 's1',
  provider: 'anthropic',
  label: 'Anthropic',
  signedInAs: 'dev@example.com',
  plan: 'Max',
  standing: 'connected',
  provenance: 'sign-in',
  active: true,
};

async function heldSubscriptions() {
  const answer = await window.recompose['subscriptions:list']();

  return answer.ok ? answer.value : [];
}

test('the fake event bridge carries every push the real one does', () => {
  installFakeBridge();

  expect(Object.keys(window.recomposeEvents)).toEqual(Object.keys(ipcEvents));
});

test('a pushed traffic snapshot reaches whatever is listening for it', () => {
  installFakeBridge();

  const heard: GatewayTraffic[] = [];
  const letGo = window.recomposeEvents['engine:traffic']((traffic) => {
    heard.push(traffic);
  });
  const flowed: GatewayTraffic = {
    codex: { fast: { only: { outcome: 'served', at: 1_754_600_000_000 } } },
  };

  emitEngineTraffic(flowed);
  letGo();
  emitEngineTraffic({});

  expect(heard).toEqual([flowed]);
});

test('a fresh bridge forgets the traffic listeners the run before it left behind', () => {
  installFakeBridge();

  const heard: GatewayTraffic[] = [];

  window.recomposeEvents['engine:traffic']((traffic) => {
    heard.push(traffic);
  });
  installFakeBridge();
  emitEngineTraffic({ codex: { fast: { only: { outcome: 'served', at: 1 } } } });

  expect(heard).toEqual([]);
});

function aServedRow(): LogRow {
  return {
    id: 'req-1',
    at: 1_754_600_000_000,
    gateway: 'codex',
    virtualModel: 'fast',
    origin: 'provider',
    method: 'POST',
    provider: 'anthropic',
    status: 200,
    clientKey: `sha256:${'a'.repeat(64)}`,
  };
}

test('a pushed run of request rows reaches whatever is listening for it', () => {
  installFakeBridge();

  const heard: LogBatch[] = [];
  const letGo = window.recomposeEvents['engine:logs']((batch) => {
    heard.push(batch);
  });
  const served: LogBatch = { kind: 'append', rows: [aServedRow()] };

  emitEngineLogs(served);
  letGo();
  emitEngineLogs({ kind: 'append', rows: [] });

  expect(heard).toEqual([served]);
});

test('a fresh bridge forgets the log listeners the run before it left behind', () => {
  installFakeBridge();

  const heard: LogBatch[] = [];

  window.recomposeEvents['engine:logs']((batch) => {
    heard.push(batch);
  });
  installFakeBridge();
  emitEngineLogs({ kind: 'append', rows: [aServedRow()] });

  expect(heard).toEqual([]);
});

test('a gateway with no name is refused, the way the real boundary refuses it', async () => {
  installFakeBridge();

  const answer = await saving(gatewaySeed({ slug: 'codex', displayName: '', port: 51234 }));

  expect(answer.ok ? 'stored' : answer.error.code).toBe('validation-failed');
  expect(await storedGateways()).toEqual([]);
});

test('a port outside what a gateway can bind is refused the same way', async () => {
  installFakeBridge();

  const answer = await saving(gatewaySeed({ slug: 'codex', displayName: 'Codex', port: 80 }));

  expect(answer.ok ? 'stored' : answer.error.code).toBe('validation-failed');
  expect(await storedGateways()).toEqual([]);
});

test('a gateway the contract accepts still stores', async () => {
  installFakeBridge();

  const answer = await saving(gatewaySeed({ slug: 'codex', displayName: 'Codex', port: 51234 }));

  expect(answer.ok).toBe(true);
  expect(await storedGateways()).toMatchObject([{ slug: 'codex', port: 51234 }]);
});

test('an update to a stopped gateway leaves it stopped, the way an explicit stop stands', async () => {
  const codex = gatewaySeed({ slug: 'codex', displayName: 'Codex', port: 51234 });

  installFakeBridge({ gateways: [codex], engineStates: { codex: { status: 'stopped' } } });

  await window.recompose['gateways:update']({ ...codex, virtualModels: [fast] });

  expect(await reportedStates()).toEqual({ codex: { status: 'stopped' } });
});

test('an update to a running gateway leaves it running, because its snapshot is stale', async () => {
  const codex = gatewaySeed({ slug: 'codex', displayName: 'Codex', port: 51234 });

  installFakeBridge({ gateways: [codex], engineStates: { codex: { status: 'running' } } });

  await window.recompose['gateways:update']({ ...codex, virtualModels: [fast] });

  expect(await reportedStates()).toEqual({ codex: { status: 'running' } });
});

test('an update to a stopped gateway still rewrites its stored document', async () => {
  const codex = gatewaySeed({ slug: 'codex', displayName: 'Codex', port: 51234 });

  installFakeBridge({ gateways: [codex], engineStates: { codex: { status: 'stopped' } } });

  await window.recompose['gateways:update']({ ...codex, virtualModels: [fast] });

  expect(await storedGateways()).toMatchObject([{ slug: 'codex', virtualModels: [fast] }]);
});

test('a seeded subscription is the one the surface reads back', async () => {
  installFakeBridge({ subscriptions: [claudeMax] });

  expect(await heldSubscriptions()).toEqual([claudeMax]);
});

test('a seeded tool reports whether it is there to sign in with', async () => {
  installFakeBridge({
    tools: [
      {
        provider: 'anthropic',
        toolName: 'Claude Code',
        present: false,
        signInCommand: 'claude',
        shellSetupLine: 'export CLAUDE_CONFIG_DIR="/tmp/anthropic/active"',
      },
    ],
  });

  const answer = await window.recompose['subscriptions:tools']();

  expect(answer.ok ? answer.value.map((tool) => tool.present) : 'refused').toEqual([false]);
});

test('signing in leaves a connected account behind for the provider it signed in with', async () => {
  installFakeBridge();

  await window.recompose['subscriptions:sign-in']({ provider: 'openai' });

  expect(await heldSubscriptions()).toMatchObject([
    { provider: 'openai', standing: 'connected', provenance: 'sign-in', active: true },
  ]);
});

test('a second sign-in leaves the account already in use the active one', async () => {
  installFakeBridge({ subscriptions: [claudeMax] });

  await window.recompose['subscriptions:sign-in']({ provider: 'openai' });

  expect((await heldSubscriptions()).map((view) => view.active)).toEqual([true, false]);
});

test('restoring a lapsed account puts it back to connected', async () => {
  installFakeBridge({ subscriptions: [{ ...claudeMax, standing: 'lapsed' }] });

  await window.recompose['subscriptions:restore']({ id: 's1' });

  expect((await heldSubscriptions()).map((view) => view.standing)).toEqual(['connected']);
});

test('putting an account to use leaves exactly one account in use', async () => {
  installFakeBridge({
    subscriptions: [claudeMax, { ...claudeMax, id: 's2', provider: 'openai', active: false }],
  });

  await window.recompose['subscriptions:activate']({ id: 's2' });

  expect((await heldSubscriptions()).map((view) => view.active)).toEqual([false, true]);
});
