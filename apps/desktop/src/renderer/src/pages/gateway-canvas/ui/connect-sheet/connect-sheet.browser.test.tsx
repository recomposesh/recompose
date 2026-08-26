import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page, userEvent } from 'vitest/browser';

import type { ConnectFacts } from '../../../../entities/harness';

import { ConnectSheet } from './connect-sheet';

const serving: ConnectFacts = {
  gatewayName: 'My Gateway',
  slug: 'my-gateway',
  baseUrl: 'http://127.0.0.1:8397',
  apiKey: 'rc-local-4Xh2p9Fd',
  models: [
    { id: 'creative', displayName: 'Creative' },
    { id: 'fast', displayName: 'Fast' },
  ],
};

async function openSheet(facts: ConnectFacts = serving, onOpenChange = () => undefined) {
  await render(<ConnectSheet answered={0} facts={facts} onOpenChange={onOpenChange} open />);

  await expect
    .element(page.getByRole('dialog', { name: 'Connect a client to My Gateway' }))
    .toBeVisible();
}

async function press(name: string | RegExp) {
  page.getByRole('button', { name }).element().focus();

  await userEvent.keyboard('{Enter}');
}

function watchTheClipboard(): { written: string[] } {
  const written: string[] = [];

  vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(async (value: string) => {
    written.push(value);

    return Promise.resolve();
  });

  return { written };
}

test('the sheet opens on a client already, so nobody has to pick one to see what to do', async () => {
  await openSheet();

  await expect.element(page.getByRole('heading', { name: 'Claude Code' })).toBeVisible();
});

test('picking a client in the rail rewrites the pane beside it', async () => {
  await openSheet();

  await press(/Codex CLI/);

  await expect.element(page.getByRole('heading', { name: 'Codex CLI' })).toBeVisible();
  await expect.element(page.getByText('wire_api = "responses"')).toBeVisible();
});

test('copying a block lands one runnable command, wrapped lines and all', async () => {
  const clipboard = watchTheClipboard();

  await openSheet();
  await press('Copy the block for Point it at the gateway');

  await vi.waitFor(() => {
    expect(clipboard.written).toHaveLength(1);
  });
  expect(clipboard.written[0]).toContain('ANTHROPIC_BASE_URL="http://127.0.0.1:8397" \\\n');
  expect(clipboard.written[0]).toContain('  ANTHROPIC_AUTH_TOKEN="rc-local-4Xh2p9Fd" \\\n');
  expect(clipboard.written[0]).toContain('  ANTHROPIC_MODEL="creative" \\\n');
  expect(clipboard.written[0]).toMatch(/ claude$/u);
  expect(clipboard.written[0]).not.toContain('export ');
});

test('the address a client copies carries the path segment that client joins onto it', async () => {
  const clipboard = watchTheClipboard();

  await openSheet();
  await press(/opencode/);
  await press('Copy the base URL for opencode');

  await vi.waitFor(() => {
    expect(clipboard.written).toEqual(['http://127.0.0.1:8397/v1']);
  });
});

test('a model id is copied on its own, beside the name the person gave it', async () => {
  const clipboard = watchTheClipboard();

  await openSheet();
  await press('Copy the id of Fast');

  await vi.waitFor(() => {
    expect(clipboard.written).toEqual(['fast']);
  });
});

test('a gateway enforcing no key hands over a stand-in and says the gateway checks nothing', async () => {
  await openSheet({ ...serving, apiKey: undefined });

  await expect.element(page.getByText(/This gateway enforces no key/)).toBeVisible();
  await expect.element(page.getByText(/ANTHROPIC_AUTH_TOKEN="unused"/)).toBeVisible();
});

test('the settle control asks for the sheet to go away rather than answering itself', async () => {
  const asked: boolean[] = [];

  await openSheet(serving, () => {
    asked.push(true);
  });
  await press('Close');

  expect(asked).toEqual([true]);
});

test('narrowing the rail leaves standing only the headings that still hold a client', async () => {
  await openSheet();

  page.getByRole('textbox', { name: 'Search clients' }).element().focus();
  await userEvent.keyboard('cursor');

  await expect.element(page.getByRole('heading', { name: 'Editors' })).toBeVisible();
  await expect
    .element(page.getByRole('heading', { name: 'Terminal agents' }))
    .not.toBeInTheDocument();
});
