import type { LogRow as LoggedRequest } from '@recompose/contracts';

import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { servedRequest, servedRun, storedAccounts } from '../../testing/gateway-canvas.testkit';
import { LogList } from './log-list';

const READING_FOOTING = `
[data-log-reading-footing] { display: flex; width: 640px; height: 300px; }
[data-log-reading-footing] > div { display: flex; flex: 1 1 0%; min-height: 0; }
[data-log-reading-footing] [role='listbox'] { flex: 1 1 0%; min-height: 0; overflow-y: auto; }
[data-log-reading-footing] [role='option'] { height: 20px; }
`;

const footing = document.createElement('style');

footing.textContent = READING_FOOTING;
document.head.append(footing);

const NOTHING_YET = 'No requests from any client app yet.';

const KEEP_NEWEST = 3;

function NarrowableList({ start }: { start: readonly LoggedRequest[] }) {
  const [rows, setRows] = useState(start);

  return (
    <>
      <div data-log-reading-footing="">
        <LogList
          accounts={storedAccounts.accounts}
          nothingYet={NOTHING_YET}
          rows={rows}
          scope="all"
        />
      </div>
      <button
        onClick={() => {
          setRows((held) => held.slice(0, KEEP_NEWEST));
        }}
        type="button"
      >
        narrow
      </button>
    </>
  );
}

async function listOf(rows: readonly LoggedRequest[]) {
  const screen = await render(<NarrowableList start={rows} />);

  return {
    screen,
    listbox: () => screen.getByRole('listbox').element(),
    drawn: () => [...screen.container.querySelectorAll('[role="option"]')],
    narrowed: async () => {
      await userEvent.click(screen.getByRole('button', { name: 'narrow' }));
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

test('Control with C copies the row under the cursor, the same as Command does', async () => {
  const written = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
  const list = await listOf(servedRun(3));

  await userEvent.tab();
  await expect.element(list.screen.getByRole('listbox')).toHaveFocus();
  await userEvent.keyboard('{ArrowDown}');
  await userEvent.keyboard('{Control>}c{/Control}');

  expect(written).toHaveBeenCalledWith(
    '14:22:09 POST fast → claude-haiku-4-5 anthropic · work 200 0.9s',
  );
});

test('a request served by an account nobody stored copies without naming one', async () => {
  const written = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
  const list = await listOf([servedRequest({ accountId: undefined })]);

  await userEvent.tab();
  await expect.element(list.screen.getByRole('listbox')).toHaveFocus();
  await userEvent.keyboard('{ArrowDown}');
  await userEvent.keyboard('{Meta>}c{/Meta}');

  expect(written).toHaveBeenCalledWith('14:22:09 POST fast → claude-haiku-4-5 anthropic 200 0.9s');
});

test('a run narrowed under a deep scroll settles on the rows that remain', async () => {
  const list = await listOf(servedRun(400));

  list.listbox().scrollTop = 4000;
  await expect.element(list.screen.getByRole('listbox')).toBeVisible();

  await list.narrowed();

  await expect.poll(() => list.drawn().length).toBe(KEEP_NEWEST);
  expect(list.drawn().every((row) => row.textContent !== '')).toBe(true);
});
