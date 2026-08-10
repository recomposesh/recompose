import type { GatewayConfig, LogRow as LoggedRequest } from '@recompose/contracts';

import { beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import type { InspectorSubject } from '../gateway-drawer/gateway-drawer';

import { logsDrawerOpen, panelWidth, toggleLogsDrawer } from '../../../../shared/lib';
import { gatewaySeed } from '../../../../shared/testing';
import {
  servedRequest,
  servingGateway,
  storedAccounts,
} from '../../testing/gateway-canvas.testkit';
import { LogsDrawer } from './logs-drawer';

const twoModels: readonly LoggedRequest[] = [
  servedRequest({ id: 'a', virtualModel: 'fast', status: 200 }),
  servedRequest({ id: 'b', virtualModel: 'creative', accountId: 'g1', provider: 'openrouter' }),
  servedRequest({ id: 'c', virtualModel: 'fast', status: 500, durationMs: undefined }),
  servedRequest({
    id: 'd',
    virtualModel: 'creative',
    accountId: 'g1',
    provider: 'openrouter',
    status: 429,
  }),
];

const gatewayScope: InspectorSubject = { kind: 'gateway' };

type Standing = {
  gateway: GatewayConfig;
  rows: readonly LoggedRequest[];
  serving: 'running' | 'stopped';
  subject: InspectorSubject;
  onSelectSubject: (nodeId: string | undefined) => void;
};

const resting: Standing = {
  gateway: servingGateway,
  rows: twoModels,
  serving: 'running',
  subject: gatewayScope,
  onSelectSubject: () => undefined,
};

async function drawerOn(differing: Partial<Standing> = {}) {
  const { gateway, rows, serving, subject, onSelectSubject } = { ...resting, ...differing };

  return render(
    <LogsDrawer
      accounts={storedAccounts.accounts}
      gateway={gateway}
      onSelectSubject={onSelectSubject}
      rows={rows}
      serving={serving}
      subject={subject}
    />,
  );
}

function listed(container: Element): readonly (string | null)[] {
  return [...container.querySelectorAll('[role="option"]')].map((row) => row.textContent);
}

beforeEach(() => {
  localStorage.clear();

  if (!logsDrawerOpen()) {
    toggleLogsDrawer();
  }
});

test('the drawer titles itself with the gateway it streams and reads live while it serves', async () => {
  const screen = await drawerOn();

  await expect.element(screen.getByText('Logs · My Gateway')).toBeVisible();
  await expect.element(screen.getByText('Live', { exact: true })).toBeVisible();
});

test('a gateway that stopped reads stopped in the same place, with its rows still standing', async () => {
  const screen = await drawerOn({ serving: 'stopped' });

  await expect.element(screen.getByText('Stopped', { exact: true })).toBeVisible();
  expect(listed(screen.container)).toHaveLength(4);
});

test('the scope strip offers the whole gateway and one segment per virtual model', async () => {
  const screen = await drawerOn();

  await expect
    .element(screen.getByRole('radio', { name: 'All' }))
    .toHaveAttribute('aria-checked', 'true');
  await expect.element(screen.getByRole('radio', { name: 'Fast' })).toBeVisible();
  await expect.element(screen.getByRole('radio', { name: 'Creative' })).toBeVisible();
});

test('a selected virtual model lights its own segment and leaves only its requests standing', async () => {
  const screen = await drawerOn({ subject: { kind: 'virtual-model', modelId: 'creative' } });

  await expect
    .element(screen.getByRole('radio', { name: 'Creative' }))
    .toHaveAttribute('aria-checked', 'true');
  expect(listed(screen.container)).toHaveLength(2);
  expect(listed(screen.container).join(' ')).not.toContain('fast');
});

test('the cable that binds a virtual model scopes the rows to that same model', async () => {
  const screen = await drawerOn({ subject: { kind: 'cable', modelId: 'fast' } });

  await expect
    .element(screen.getByRole('radio', { name: 'Fast' }))
    .toHaveAttribute('aria-checked', 'true');
  expect(listed(screen.container)).toHaveLength(2);
  expect(listed(screen.container).join(' ')).not.toContain('creative');
});

test('a selected target stands a segment of its own carrying the name of that target', async () => {
  const screen = await drawerOn({ subject: { kind: 'target', accountId: 'g1' } });

  await expect
    .element(screen.getByRole('radio', { name: 'openrouter' }))
    .toHaveAttribute('aria-checked', 'true');
  expect(listed(screen.container)).toHaveLength(2);
  expect(listed(screen.container).join(' ')).not.toContain('anthropic');
});

test('a target since removed stands a segment saying so rather than naming what is gone', async () => {
  const screen = await drawerOn({ subject: { kind: 'ghost-target', accountId: 'g1' } });

  await expect
    .element(screen.getByRole('radio', { name: 'Removed' }))
    .toHaveAttribute('aria-checked', 'true');
});

test('a draft in flight narrows nothing, so the whole gateway keeps reading', async () => {
  const screen = await drawerOn({ subject: { kind: 'draft' } });

  await expect
    .element(screen.getByRole('radio', { name: 'All' }))
    .toHaveAttribute('aria-checked', 'true');
  expect(listed(screen.container)).toHaveLength(4);
});

test('pressing a virtual model segment asks the canvas to select that model', async () => {
  const asked = vi.fn<(nodeId: string | undefined) => void>();
  const screen = await drawerOn({ onSelectSubject: asked });

  await userEvent.click(screen.getByRole('radio', { name: 'Creative' }));

  expect(asked).toHaveBeenCalledWith('model:creative');
});

test('pressing the whole-gateway segment clears the canvas selection instead of selecting it', async () => {
  const asked = vi.fn<(nodeId: string | undefined) => void>();
  const screen = await drawerOn({
    onSelectSubject: asked,
    subject: { kind: 'virtual-model', modelId: 'fast' },
  });

  await userEvent.click(screen.getByRole('radio', { name: 'All' }));

  expect(asked).toHaveBeenCalledWith(undefined);
});

test('the errors narrowing stands apart from the scope and only ever takes requests away', async () => {
  const screen = await drawerOn();

  await userEvent.click(screen.getByRole('button', { name: 'Errors' }));

  expect(listed(screen.container)).toHaveLength(2);
  expect(listed(screen.container).join(' ')).not.toContain('200');
});

test('the errors narrowing composes with whatever scope stands', async () => {
  const screen = await drawerOn({ subject: { kind: 'virtual-model', modelId: 'fast' } });

  await userEvent.click(screen.getByRole('button', { name: 'Errors' }));

  expect(listed(screen.container)).toHaveLength(1);
  expect(listed(screen.container).join(' ')).toContain('500');
});

test('a scope holding no requests says which scope came up empty', async () => {
  const screen = await drawerOn({
    rows: [],
    subject: { kind: 'virtual-model', modelId: 'fast' },
  });

  await expect
    .element(screen.getByText('No requests through this virtual model yet.'))
    .toBeVisible();
});

test('a removed target with no requests behind it says so in its own words', async () => {
  const screen = await drawerOn({ rows: [], subject: { kind: 'ghost-target', accountId: 'g1' } });

  await expect
    .element(screen.getByText('No requests reached the removed target yet.'))
    .toBeVisible();
});

test('more virtual models than the header holds go behind the overflow control', async () => {
  const crowded = gatewaySeed({
    slug: 'my-gateway',
    displayName: 'My Gateway',
    port: 8397,
    virtualModels: ['one', 'two', 'three', 'four', 'five', 'six'].map((id) => ({
      id,
      displayName: id,
      target: { accountId: 'k1', providerModel: 'claude-haiku-4-5' },
    })),
  });
  const screen = await drawerOn({ gateway: crowded, rows: [] });

  await expect.element(screen.getByRole('radio', { name: 'one' })).toBeVisible();
  expect(screen.container.querySelectorAll('[role="radio"]')).toHaveLength(5);
  await expect.element(screen.getByRole('button', { name: 'More log scopes' })).toBeVisible();
});

test('a scope the header pushed into the overflow still stands lit while it holds', async () => {
  const crowded = gatewaySeed({
    slug: 'my-gateway',
    displayName: 'My Gateway',
    port: 8397,
    virtualModels: ['one', 'two', 'three', 'four', 'five', 'six'].map((id) => ({
      id,
      displayName: id,
      target: { accountId: 'k1', providerModel: 'claude-haiku-4-5' },
    })),
  });
  const screen = await drawerOn({
    gateway: crowded,
    rows: [],
    subject: { kind: 'virtual-model', modelId: 'six' },
  });

  await expect
    .element(screen.getByRole('radio', { name: 'six' }))
    .toHaveAttribute('aria-checked', 'true');
});

test('the close control inside the drawer puts it away', async () => {
  const screen = await drawerOn();

  await userEvent.click(screen.getByRole('button', { name: 'Close logs' }));

  expect(logsDrawerOpen()).toBe(false);
});

test('the top edge sizes the drawer with the arrows of its own axis', async () => {
  const screen = await drawerOn();
  const stood = panelWidth('logs');

  screen.getByRole('separator', { name: 'Logs height' }).element().focus();
  await userEvent.keyboard('{ArrowUp}');

  expect(panelWidth('logs')).toBeGreaterThan(stood);
});

test('dragging the top edge past the collapse threshold shuts the drawer rather than slivering it', async () => {
  const screen = await drawerOn();

  screen.getByRole('separator', { name: 'Logs height' }).element().focus();
  await userEvent.keyboard('{Enter}');

  expect(logsDrawerOpen()).toBe(false);
});
