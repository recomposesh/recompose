import type { LogRow as LoggedRequest } from '@recompose/contracts';

import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import {
  SERVED_AT,
  servedRequest,
  servedRun,
  storedAccounts,
} from '../../testing/gateway-canvas.testkit';
import { LOG_ROW_HEIGHT } from '../log-row/logged-request';
import { LogList } from './log-list';

const LIST_FOOTING = `
[data-log-list-footing] { display: flex; width: 640px; height: 300px; }
[data-log-list-footing] > div { display: flex; flex: 1 1 0%; min-height: 0; }
[data-log-list-footing] [role='listbox'] { flex: 1 1 0%; min-height: 0; overflow-y: auto; }
[data-log-list-footing] [role='option'] { height: 20px; }
`;

const footing = document.createElement('style');

footing.textContent = LIST_FOOTING;
document.head.append(footing);

const NOTHING_YET = 'No requests from any client app yet.';

const ARRIVING = 3;

function arriving(round: number): readonly LoggedRequest[] {
  return Array.from({ length: ARRIVING }, (_unused, seat) =>
    servedRequest({
      id: `arrived-${String(round)}-${String(seat)}`,
      at: SERVED_AT + round * 1000 - seat,
    }),
  );
}

function LiveList({ start }: { start: readonly LoggedRequest[] }) {
  const [rows, setRows] = useState(start);
  const [round, setRound] = useState(1);

  return (
    <>
      <div data-log-list-footing="">
        <LogList
          accounts={storedAccounts.accounts}
          nothingYet={NOTHING_YET}
          rows={rows}
          scope="all"
        />
      </div>
      <button
        onClick={() => {
          setRows((held) => [...arriving(round), ...held]);
          setRound((held) => held + 1);
        }}
        type="button"
      >
        serve more
      </button>
    </>
  );
}

async function listOf(rows: readonly LoggedRequest[]) {
  const screen = await render(<LiveList start={rows} />);

  return {
    screen,
    listbox: () => screen.getByRole('listbox').element(),
    cursorRef: () => screen.getByRole('listbox').element().getAttribute('aria-activedescendant'),
    announced: () => screen.getByRole('status').element().textContent,
    drawn: () => [...screen.container.querySelectorAll('[role="option"]')],
    serveMore: async () => {
      await userEvent.click(screen.getByRole('button', { name: 'serve more' }));
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

test('a scope holding no requests reads its own line rather than an empty box', async () => {
  const list = await listOf([]);

  await expect.element(list.screen.getByText(NOTHING_YET)).toBeVisible();
  expect(list.drawn()).toHaveLength(0);
});

test('the list reads newest first, in the order the cache handed the rows over', async () => {
  const list = await listOf(servedRun(4));

  const times = list.drawn().map((row) => row.querySelector('span')?.textContent);

  expect(times).toEqual(['14:22:09', '14:22:08', '14:22:07', '14:22:06']);
});

test('the list never re-sorts a run, because the cache already decided what newest means', async () => {
  const jumbled = [
    servedRequest({ id: 'older', at: SERVED_AT - 5000 }),
    servedRequest({ id: 'newest', at: SERVED_AT }),
    servedRequest({ id: 'middle', at: SERVED_AT - 1000 }),
  ];
  const list = await listOf(jumbled);

  const times = list.drawn().map((row) => row.querySelector('span')?.textContent);

  expect(times).toEqual(['14:22:04', '14:22:09', '14:22:08']);
});

test('a run too long to paint draws only the rows in view', async () => {
  const list = await listOf(servedRun(2000));

  await expect.element(list.screen.getByRole('listbox')).toBeVisible();
  expect(list.drawn().length).toBeLessThan(40);
  expect(list.drawn().length).toBeGreaterThan(0);
});

test('every drawn row names its place in the whole run, so the few speak for the many', async () => {
  const list = await listOf(servedRun(2000));

  const [first] = list.drawn();

  expect(first?.getAttribute('aria-setsize')).toBe('2000');
  expect(first?.getAttribute('aria-posinset')).toBe('1');
});

test('the whole list is one tab stop, and the arrows walk a cursor down the rows', async () => {
  const list = await listOf(servedRun(6));

  await userEvent.tab();
  await expect.element(list.screen.getByRole('listbox')).toHaveFocus();

  await userEvent.keyboard('{ArrowDown}');
  await expect
    .element(list.screen.getByRole('listbox'))
    .toHaveAttribute('aria-activedescendant', expect.stringContaining('served-1'));

  await userEvent.keyboard('{ArrowDown}{ArrowDown}');
  await expect
    .element(list.screen.getByRole('listbox'))
    .toHaveAttribute('aria-activedescendant', expect.stringContaining('served-3'));

  await userEvent.keyboard('{ArrowUp}');
  await expect
    .element(list.screen.getByRole('listbox'))
    .toHaveAttribute('aria-activedescendant', expect.stringContaining('served-2'));
});

test('the cursor stops at the ends rather than wrapping around the run', async () => {
  const list = await listOf(servedRun(2));

  await userEvent.tab();
  await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
  await expect
    .element(list.screen.getByRole('listbox'))
    .toHaveAttribute('aria-activedescendant', expect.stringContaining('served-1'));

  await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
  await expect
    .element(list.screen.getByRole('listbox'))
    .toHaveAttribute('aria-activedescendant', expect.stringContaining('served-2'));
});

test('the row under the cursor hands its own line to the clipboard', async () => {
  const written = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
  const list = await listOf(servedRun(3));

  await userEvent.tab();
  await expect.element(list.screen.getByRole('listbox')).toHaveFocus();
  await userEvent.keyboard('{ArrowDown}{ArrowDown}');
  await userEvent.keyboard('{Meta>}c{/Meta}');

  expect(written).toHaveBeenCalledWith(
    '14:22:08 POST fast → claude-haiku-4-5 anthropic · work 200 0.9s',
  );
});

test('a copy with no row under the cursor takes nothing rather than guessing a row', async () => {
  const written = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
  const list = await listOf(servedRun(3));

  await userEvent.tab();
  await expect.element(list.screen.getByRole('listbox')).toHaveFocus();
  await userEvent.keyboard('{Meta>}c{/Meta}');

  expect(written).not.toHaveBeenCalled();
});

test('requests arriving while the viewport rests at the top bring the newest row into view', async () => {
  const list = await listOf(servedRun(200));

  expect(list.listbox().scrollTop).toBe(0);

  await list.serveMore();

  expect(list.listbox().scrollTop).toBe(0);
  expect(list.drawn()[0]?.id).toContain('arrived-1-0');
});

test('requests arriving while a person reads history leave the viewport where it stood', async () => {
  const list = await listOf(servedRun(200));

  list.listbox().scrollTop = 600;
  await expect.element(list.screen.getByRole('listbox')).toBeVisible();
  expect(list.listbox().scrollTop).toBe(600);

  await list.serveMore();

  expect(list.listbox().scrollTop).toBe(600 + ARRIVING * LOG_ROW_HEIGHT);
});

test('the cursor stays on the row a person put it on when newer requests arrive above it', async () => {
  const list = await listOf(servedRun(20));

  await userEvent.tab();
  await userEvent.keyboard('{ArrowDown}{ArrowDown}');
  await list.serveMore();

  await expect
    .element(list.screen.getByRole('listbox'))
    .toHaveAttribute('aria-activedescendant', expect.stringContaining('served-2'));
});

test('arrivals are announced as one batch, so a busy gateway stays calm in a reader', async () => {
  const list = await listOf(servedRun(20));

  await list.serveMore();

  await expect.element(list.screen.getByRole('status')).toHaveTextContent('3 new requests.');
});

test('nothing is announced before the first requests have even been read', async () => {
  const list = await listOf(servedRun(20));

  await expect.element(list.screen.getByRole('listbox')).toBeVisible();
  expect(list.announced()).toBe('');
});

test('the first requests into an empty scope announce themselves', async () => {
  const list = await listOf([]);

  await expect.element(list.screen.getByText(NOTHING_YET)).toBeVisible();
  await list.serveMore();

  await expect.poll(list.announced).toBe('3 new requests.');
});

test('a steady gateway keeps announcing, since each summary has to differ from the last', async () => {
  const list = await listOf(servedRun(20));

  await list.serveMore();
  await expect.poll(list.announced).toBe('3 new requests.');

  await list.serveMore();

  await expect.poll(list.announced).toBe('6 new requests.');
});

test('the cursor reference leaves with the row, so it never points at a row no longer drawn', async () => {
  const list = await listOf(servedRun(400));

  await userEvent.tab();
  await userEvent.keyboard('{ArrowDown}');
  expect(list.cursorRef()).toMatch(/-served-1$/);

  list.listbox().scrollTop = 4000;

  await expect.poll(list.cursorRef).toBe(null);
});

test('a copy takes the row under the cursor even once that row has scrolled out of view', async () => {
  const written = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
  const list = await listOf(servedRun(400));

  await userEvent.tab();
  await userEvent.keyboard('{ArrowDown}');
  list.listbox().scrollTop = 4000;
  await expect.poll(list.cursorRef).toBe(null);

  await userEvent.keyboard('{Meta>}c{/Meta}');

  expect(written).toHaveBeenCalledWith(
    '14:22:09 POST fast → claude-haiku-4-5 anthropic · work 200 0.9s',
  );
});
