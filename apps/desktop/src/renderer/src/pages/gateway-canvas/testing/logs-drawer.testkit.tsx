import type { Account, GatewayConfig, LogRow as LoggedRequest } from '@recompose/contracts';

import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import type { InspectorSubject } from '../ui/gateway-drawer/gateway-drawer';

import { logsDrawerOpen, toggleLogsDrawer } from '../../../shared/lib';
import { LogsDrawer } from '../ui/logs-drawer/logs-drawer';
import { servedRequest, servingGateway, storedAccounts } from './gateway-canvas.testkit';

/**
 * Four requests across the two seeded virtual models, two of which failed.
 *
 * @summary One run serves every drawer scenario, so a scenario about scoping and one about outcome
 * filtering read the same world and cannot drift apart. Rows `c` and `d` are the failures.
 */
const twoModels: readonly LoggedRequest[] = [
  servedRequest({ id: 'a', virtualModel: 'fast', status: 200 }),
  servedRequest({ id: 'b', virtualModel: 'creative', accountId: 'g1', provider: 'openrouter' }),
  servedRequest({ id: 'c', virtualModel: 'fast', status: 500 }),
  servedRequest({
    id: 'd',
    virtualModel: 'creative',
    accountId: 'g1',
    provider: 'openrouter',
    status: 429,
  }),
];

type Standing = {
  accounts: readonly Account[];
  gateway: GatewayConfig;
  leaving: boolean;
  rows: readonly LoggedRequest[];
  serving: 'running' | 'stopped';
  subject: InspectorSubject;
};

const resting: Standing = {
  accounts: storedAccounts.accounts,
  gateway: servingGateway,
  leaving: false,
  rows: twoModels,
  serving: 'running',
  subject: { kind: 'gateway' },
};

/** Renders the drawer on the seeded world, differing only where a scenario says so. */
export async function drawerOn(differing: Partial<Standing> = {}) {
  const { accounts, gateway, leaving, rows, serving, subject } = {
    ...resting,
    ...differing,
  };

  return render(
    <LogsDrawer
      accounts={accounts}
      gateway={gateway}
      leaving={leaving}
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

/** Narrows the selected subject to failed requests. */
export async function narrowedToErrors(screen: Drawer): Promise<void> {
  await userEvent.click(screen.getByRole('radio', { name: 'Errors' }));
}

/** Narrows the selected subject to requests that did not fail. */
export async function narrowedToSuccess(screen: Drawer): Promise<void> {
  await userEvent.click(screen.getByRole('radio', { name: 'Success' }));
}

/** Restores every request in the selected subject. */
export async function widenedToAll(screen: Drawer): Promise<void> {
  await userEvent.click(screen.getByRole('radio', { name: 'All' }));
}

/** Which row the cursor points a reader at, said plainly so a failure reads as a value. */
export function cursorRefIn(screen: Drawer): string {
  return screen.getByRole('listbox').element().getAttribute('aria-activedescendant') ?? 'no cursor';
}

/**
 * Puts the keyboard on the run of rows.
 *
 * @operation Tab lands on the drawer's own top edge first, and pressing a segment leaves the focus
 * there, so a scenario about the row cursor says where the keyboard is rather than assuming it.
 */
export function focusTheList(screen: Drawer): void {
  screen.getByRole('listbox').element().focus();
}
