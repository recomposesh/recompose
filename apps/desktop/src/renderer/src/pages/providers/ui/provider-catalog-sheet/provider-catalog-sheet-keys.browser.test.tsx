import type { SubscriptionTool } from '@recompose/contracts';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, useState } from 'react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { page, userEvent } from 'vitest/browser';

import type { AccountKind } from '../../../../entities/account';

import { installFakeBridge } from '../../../../shared/testing';
import { ProviderCatalogSheet } from './provider-catalog-sheet';

const claudeCode: SubscriptionTool = {
  provider: 'anthropic',
  toolName: 'Claude Code',
  present: true,
  signInCommand: 'claude',
  shellSetupLine: 'export CLAUDE_CONFIG_DIR="/tmp/anthropic/active"',
};

function Catalog({ kind }: { kind: AccountKind }) {
  const [open, setOpen] = useState(true);

  return (
    <>
      <p>{open ? 'The screen behind stands.' : 'The catalog closed.'}</p>
      <button
        onClick={() => {
          setOpen(true);
        }}
        type="button"
      >
        Add provider again
      </button>
      <ProviderCatalogSheet kind={kind} onOpenChange={setOpen} open={open} />
    </>
  );
}

async function renderCatalog(kind: AccountKind = 'subscription') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<p>Loading…</p>}>
        <Catalog kind={kind} />
      </Suspense>
    </QueryClientProvider>,
  );
}

async function focusHeldBy(control: ReturnType<typeof page.getByRole>): Promise<boolean> {
  control.element().focus();

  if (document.activeElement !== control.element()) {
    return false;
  }

  await new Promise((settle) => {
    setTimeout(settle, 50);
  });

  return document.activeElement === control.element();
}

/**
 * Reaches a control the way a keyboard does, pressing Enter only once focus holds still.
 *
 * @summary The sheet's own mount effects move focus while the panel settles, so a press right
 * after a single focus check can land on nothing. Focus has to survive a beat before the key
 * goes, which is also the only moment a person's Enter could arrive.
 */
async function press(name: RegExp | string) {
  const control = page.getByRole('button', { name });

  await expect.element(control).toBeVisible();

  await expect.poll(async () => focusHeldBy(control), { timeout: 10_000 }).toBe(true);

  await userEvent.keyboard('{Enter}');
}

test('the keys catalog stands nine entries and connects every one of them', async () => {
  installFakeBridge({ tools: [claudeCode] });

  const screen = await renderCatalog('api-key');

  const offered = [
    'Anthropic API',
    'OpenAI API',
    'Gemini API',
    'Mistral',
    'xAI Grok',
    'DeepSeek',
    'Moonshot AI',
    'Qwen',
    'Custom endpoint',
  ];

  for (const name of offered) {
    const entry = screen.getByRole('button', { name: new RegExp(name) });

    await expect.element(entry).toBeVisible();
    await expect.element(entry).not.toHaveAttribute('aria-disabled');
  }
});

test('a key entry that once stood inert now opens its own connect step', async () => {
  installFakeBridge({ tools: [claudeCode] });

  const screen = await renderCatalog('api-key');

  await press(/Gemini API/);

  await expect.element(screen.getByLabelText('Key')).toBeVisible();
});

test('the escape hatch asks for the address and the dialect nothing documents', async () => {
  installFakeBridge({ tools: [claudeCode] });

  const screen = await renderCatalog('api-key');

  await press(/Custom endpoint/);

  await expect.element(screen.getByLabelText('Base URL')).toBeVisible();
  await expect.element(screen.getByLabelText('Dialect')).toBeVisible();
  await expect.element(screen.getByLabelText('Key')).toBeVisible();
});
