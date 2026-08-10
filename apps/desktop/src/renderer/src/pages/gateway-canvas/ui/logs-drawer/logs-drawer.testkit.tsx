import type { GatewayConfig, LogRow as LoggedRequest } from '@recompose/contracts';

import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import type { InspectorSubject } from '../gateway-drawer/gateway-drawer';

import { logsDrawerOpen, toggleLogsDrawer } from '../../../../shared/lib';
import {
  servedRequest,
  servingGateway,
  storedAccounts,
} from '../../testing/gateway-canvas.testkit';
import { LogsDrawer } from './logs-drawer';

/**
 * Four requests across the two seeded virtual models, two of which failed.
 *
 * @summary One run serves every drawer scenario, so a scenario about scoping and one about the
 * errors narrowing read the same world and cannot drift apart. Rows `c` and `d` are the failures.
 */
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
  subject: { kind: 'gateway' },
  onSelectSubject: () => undefined,
};

/** Renders the drawer on the seeded world, differing only where a scenario says so. */
export async function drawerOn(differing: Partial<Standing> = {}) {
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

type Drawer = Awaited<ReturnType<typeof drawerOn>>;

/** Puts the drawer's own standings back to how a fresh session opens it. */
export function freshDrawer(): void {
  localStorage.clear();

  if (!logsDrawerOpen()) {
    toggleLogsDrawer();
  }
}

/** What each listed row reads as, which is how a scenario says which requests remain. */
export function listed(container: Element): readonly (string | null)[] {
  return [...container.querySelectorAll('[role="option"]')].map((row) => row.textContent);
}

/** Turns the errors narrowing over, which is the one narrowing that stands apart from the scope. */
export async function narrowedToErrors(screen: Drawer): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Errors' }));
}

/** Which row the cursor points a reader at, said plainly so a failure reads as a value. */
export function cursorRefIn(screen: Drawer): string {
  return screen.getByRole('listbox').element().getAttribute('aria-activedescendant') ?? 'no cursor';
}

/**
 * Puts the keyboard on the run of rows.
 *
 * @operation Tab lands on the drawer's own top edge first, and pressing a chip leaves the focus on
 * that chip, so a scenario about the row cursor says where the keyboard is rather than assuming it.
 */
export function focusTheList(screen: Drawer): void {
  screen.getByRole('listbox').element().focus();
}
