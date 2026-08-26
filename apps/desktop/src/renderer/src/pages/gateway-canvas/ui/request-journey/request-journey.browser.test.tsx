import { afterEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { servedRequest, workKey } from '../../testing/gateway-canvas.testkit';
import { RequestJourney } from './request-journey';

const exhausted = servedRequest({
  origin: 'gateway',
  status: 502,
  provider: undefined,
  accountId: undefined,
  providerModel: undefined,
  durationMs: undefined,
  tokens: undefined,
  failure: 'The router "Failover" in the gateway "My gateway" has no child left to try.',
  diagnosis: {
    router: 'Failover',
    tried: [
      { child: 'claude-sonnet-4-5', why: 'refused with 429' },
      { child: 'gpt-5-mini', why: 'has no credential' },
    ],
  },
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('a request that no child could take reads the router and every child by name', async () => {
  const screen = await render(<RequestJourney account={undefined} logged={exhausted} />);

  await expect.element(screen.getByText('Failover', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('claude-sonnet-4-5 refused with 429')).toBeVisible();
  await expect.element(screen.getByText('gpt-5-mini has no credential')).toBeVisible();
});

test('the reading pairs every label with what it stands for, so a reader is never guessing', async () => {
  const screen = await render(<RequestJourney account={workKey} logged={servedRequest()} />);
  const pairs = screen.container.querySelectorAll('dt');

  expect([...pairs].map((label) => label.textContent)).toEqual([
    'Time',
    'Method',
    'Asked for',
    'Resolved to',
    'Served by',
    'Status',
    'Took',
  ]);
});

test('the whole reading copies in one press, because it is written to be pasted', async () => {
  const written = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
  const screen = await render(<RequestJourney account={undefined} logged={exhausted} />);

  await userEvent.click(screen.getByRole('button', { name: 'Copy request detail' }));

  expect(written).toHaveBeenCalledWith(
    [
      'Time: 14:22:09',
      'Method: POST',
      'Asked for: fast',
      'Status: 502',
      'Router: Failover',
      'Tried: claude-sonnet-4-5 refused with 429',
      'Tried: gpt-5-mini has no credential',
      'Cause: The router "Failover" in the gateway "My gateway" has no child left to try.',
    ].join('\n'),
  );
});

test('a copy says so out loud, so a person reading by ear knows it landed', async () => {
  vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
  const screen = await render(<RequestJourney account={undefined} logged={exhausted} />);

  await userEvent.click(screen.getByRole('button', { name: 'Copy request detail' }));

  await expect.element(screen.getByRole('status')).toHaveTextContent('Request detail copied.');
});

test('nothing read offers no copy at all, because there is nothing to hand over', async () => {
  const screen = await render(<RequestJourney account={undefined} logged={undefined} />);

  await expect.element(screen.getByText('Select a request to read what it came to.')).toBeVisible();
  expect(screen.container.querySelector('button')).toBeNull();
});
