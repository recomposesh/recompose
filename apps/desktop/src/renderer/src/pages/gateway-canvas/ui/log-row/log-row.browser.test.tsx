import type { Account, LogRow as LoggedRequest } from '@recompose/contracts';

import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { servedRequest, workKey } from '../../testing/gateway-canvas.testkit';
import { LogRow } from './log-row';
import { copiedRow } from './logged-request';

async function renderRow(logged: LoggedRequest, account: Account | undefined) {
  return render(
    <div role="listbox">
      <LogRow account={account} id="row" logged={logged} />
    </div>,
  );
}

test('a served row reads the time, the method, the models it went through, and what it cost', async () => {
  const screen = await renderRow(servedRequest(), workKey);

  await expect.element(screen.getByText('14:22:09', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('POST', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('fast', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('claude-haiku-4-5', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('anthropic · work', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('200', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('0.9s', { exact: true })).toBeVisible();
});

test('the model pair carries the whole of both names where the cells run out of room', async () => {
  const screen = await renderRow(servedRequest(), workKey);

  await expect
    .element(screen.getByText('claude-haiku-4-5', { exact: true }))
    .toHaveAttribute('title', 'claude-haiku-4-5');
  await expect.element(screen.getByText('fast', { exact: true })).toHaveAttribute('title', 'fast');
});

test('a request that failed leaves its duration cell empty and says so out loud', async () => {
  const screen = await renderRow(
    servedRequest({ status: 500, durationMs: undefined, failure: 'The provider answered 500.' }),
    workKey,
  );

  await expect.element(screen.getByText('no duration', { exact: true })).toBeInTheDocument();
  await expect.element(screen.getByText('500', { exact: true })).toBeVisible();
  expect(screen.container.textContent).not.toContain('0.9s');
});

test('a row the gateway raised before any provider answered leaves its provider cells empty', async () => {
  const screen = await renderRow(
    servedRequest({
      origin: 'gateway',
      provider: undefined,
      accountId: undefined,
      providerModel: undefined,
      status: 502,
      durationMs: undefined,
      failure: 'No target answered.',
    }),
    undefined,
  );

  await expect.element(screen.getByRole('option')).toBeVisible();
  await expect.element(screen.getByText('502', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('fast', { exact: true })).toBeVisible();
  expect(screen.container.textContent).not.toContain('anthropic');
  expect(screen.container.textContent).not.toContain('→');
});

test('a request served through an account that has left the registry reads its raw id', async () => {
  const screen = await renderRow(servedRequest(), undefined);

  await expect.element(screen.getByText('anthropic · k1', { exact: true })).toBeVisible();
});

test('the row cursor marks the row a copy would take, without taking focus off the list', async () => {
  const screen = await render(
    <div role="listbox">
      <LogRow account={workKey} id="row" logged={servedRequest()} underCursor />
    </div>,
  );

  await expect.element(screen.getByRole('option')).toHaveAttribute('aria-selected', 'true');
  expect(document.activeElement).toBe(document.body);
});

test('one row copies as the line a person reads, so a paste says what the row said', () => {
  expect(copiedRow(servedRequest(), workKey)).toBe(
    '14:22:09 POST fast → claude-haiku-4-5 anthropic · work 200 0.9s',
  );
});

test('copying a gateway-raised row leaves out the cells that never filled', () => {
  const raised = servedRequest({
    origin: 'gateway',
    provider: undefined,
    accountId: undefined,
    providerModel: undefined,
    status: 502,
    durationMs: undefined,
  });

  expect(copiedRow(raised, undefined)).toBe('14:22:09 POST fast 502');
});
