import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page, userEvent } from 'vitest/browser';

import { installFakeBridge } from '../../../../shared/testing';
import { ReaderKeySheet } from './reader-key-sheet';

const ask = {
  label: 'Mgmt key',
  hint: 'sk-or-v1-…',
  note: 'Optional. OpenRouter reads credits only with a management key, and this one never serves a request.',
};

/**
 * Presses one of the sheet's footer buttons, by the words on it.
 *
 * @summary The sheet animates its own height as it opens, so a pointer press waits for a stability
 * the surface never reaches and times out. The press reaches the control directly instead, which is
 * what the create-gateway sheet's own scenarios do for the same reason.
 */
function pressed(name: string): void {
  [...document.querySelectorAll('button')].find((held) => held.textContent === name)?.click();
}

async function sheetOn() {
  const onOpenChange = vi.fn();

  installFakeBridge({});

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  await render(
    <QueryClientProvider client={queryClient}>
      <ReaderKeySheet
        accountId="a1"
        ask={ask}
        onOpenChange={(next) => {
          onOpenChange(next);
        }}
        open
      />
    </QueryClientProvider>,
  );

  const sheet = page.getByRole('dialog', { name: 'Add a credits key' });

  await expect.element(sheet).toBeVisible();

  return { sheet, onOpenChange };
}

test('the sheet names the key the provider asks for and says why it wants one', async () => {
  const { sheet } = await sheetOn();

  await expect.element(sheet.getByText(/never serves a request/)).toBeVisible();
  await expect.element(sheet.getByLabelText('Mgmt key', { exact: true })).toBeVisible();
});

test('an empty field stores nothing, so a stray press cannot clear a key already held', async () => {
  const { sheet } = await sheetOn();

  await expect.element(sheet.getByRole('button', { name: 'Save' })).toBeDisabled();
});

test('a pasted key is stored and the sheet hands the screen back', async () => {
  const { sheet, onOpenChange } = await sheetOn();

  await userEvent.fill(sheet.getByLabelText('Mgmt key', { exact: true }), 'sk-or-v1-abcdefghij');
  pressed('Save');

  await vi.waitFor(() => {
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

test('cancelling hands the screen back without storing anything', async () => {
  const { onOpenChange } = await sheetOn();

  pressed('Cancel');

  expect(onOpenChange).toHaveBeenCalledWith(false);
});
