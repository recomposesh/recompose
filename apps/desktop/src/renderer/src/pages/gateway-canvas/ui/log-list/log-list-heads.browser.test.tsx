import type { LogRow as LoggedRequest } from '@recompose/contracts';

import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { servedRun, storedAccounts } from '../../testing/gateway-canvas.testkit';
import { LogList } from './log-list';

const NOTHING_YET = 'No requests from any client app yet.';

const EVERY_HEAD = ['Time', 'Method', 'Model', 'Provider', 'Account', 'Status', 'Took', 'Detail'];

async function listOf(rows: readonly LoggedRequest[]) {
  const screen = await render(
    <LogList accounts={storedAccounts.accounts} nothingYet={NOTHING_YET} rows={rows} scope="all" />,
  );

  return {
    heads: () =>
      [...(screen.container.querySelector('[data-log-heads]')?.children ?? [])].map(
        (head) => head.textContent,
      ),
    listbox: () => screen.container.querySelector('[role="listbox"]'),
    drawn: () => [...screen.container.querySelectorAll('[role="option"]')],
  };
}

test('the heads name every column, in the order the rows read across', async () => {
  const list = await listOf(servedRun(4));

  expect(list.heads()).toEqual(EVERY_HEAD);
});

test('the heads stand over a scope holding nothing, so the first request moves no column', async () => {
  const list = await listOf([]);

  expect(list.heads()).toEqual(EVERY_HEAD);
});

test('the heads stand outside the run, so the arrows never walk a cursor onto them', async () => {
  const list = await listOf(servedRun(4));

  expect(list.listbox()?.querySelector('[data-log-heads]')).toBeNull();
  expect(list.drawn()).toHaveLength(4);
});
