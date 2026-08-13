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

test('the catalog opens as a modal holding only the kind the screen asked for', async () => {
  installFakeBridge({ tools: [claudeCode] });

  const screen = await renderCatalog('subscription');

  await expect.element(screen.getByRole('dialog', { name: 'Add provider' })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: /Claude/ })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: /Codex/ })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: /OpenRouter/ })).not.toBeInTheDocument();
});

test('a subscription row reads as the plan product and what signing in gives', async () => {
  installFakeBridge({ tools: [claudeCode] });

  const screen = await renderCatalog('subscription');

  await expect
    .element(screen.getByRole('button', { name: /Claude/ }))
    .toHaveTextContent('Sign in with your Pro or Max plan');
});

test('every plan the subscriptions catalog holds connects', async () => {
  installFakeBridge({ tools: [claudeCode] });

  const screen = await renderCatalog('subscription');

  for (const named of [/^Claude/, /^Codex/, /GLM Coding Plan/, /MiniMax Coding Plan/]) {
    const entry = screen.getByRole('button', { name: named });

    await expect.element(entry).toBeVisible();
    await expect.element(entry).not.toHaveAttribute('aria-disabled');
  }
});

test('the keys screen catalog reads each row as the endpoint the key is spent against', async () => {
  installFakeBridge({ tools: [claudeCode] });

  const screen = await renderCatalog('api-key');

  await expect.element(screen.getByRole('button', { name: /Anthropic API/ })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: /OpenAI API/ })).toBeVisible();
  await expect
    .element(screen.getByRole('button', { name: /GitHub Copilot/ }))
    .not.toBeInTheDocument();
});

test('every runtime the local catalog holds connects', async () => {
  installFakeBridge({ tools: [claudeCode] });

  const screen = await renderCatalog('local');

  for (const named of [/^Ollama/, /LM Studio/, /llama\.cpp/, /vLLM/, /Custom local server/]) {
    await expect
      .element(screen.getByRole('button', { name: named }))
      .not.toHaveAttribute('aria-disabled');
  }
});

test('the local catalog says what it offers in its own sentence', async () => {
  installFakeBridge({ tools: [claudeCode] });

  const screen = await renderCatalog('local');

  await expect.element(screen.getByText('Servers this machine already runs.')).toBeVisible();
});

test('the aggregator catalog offers a hosted catalog rather than the providers themselves', async () => {
  installFakeBridge({ tools: [claudeCode] });

  const screen = await renderCatalog('aggregator');

  await expect
    .element(screen.getByText('One key, many models, routed through a hosted catalog.'))
    .toBeVisible();
});

test('picking the runtime stands the detect step where the grid was', async () => {
  installFakeBridge({ tools: [claudeCode] });

  const screen = await renderCatalog('local');

  await press(/^Ollama/);

  await expect
    .element(
      screen.getByText("Ollama isn't running at 127.0.0.1:11434. Start it, then check again."),
    )
    .toBeVisible();
  expect(closingActNames()).toEqual(['Add anyway', 'Check again']);
});

test('picking a provider stands its one way where the grid was', async () => {
  installFakeBridge({ tools: [claudeCode] });

  const screen = await renderCatalog('subscription');

  await press(/^Claude/);

  await expect
    .element(screen.getByRole('heading', { name: 'An account for Claude Code' }))
    .toBeVisible();
  await expect
    .element(screen.getByRole('heading', { name: 'A target a gateway can reach' }))
    .not.toBeInTheDocument();
});

test('a provider picked by mistake hands the catalog back', async () => {
  installFakeBridge({ tools: [claudeCode] });

  const screen = await renderCatalog('subscription');

  await press(/^Claude/);
  await press('Back');

  await expect.element(screen.getByRole('button', { name: /Codex/ })).toBeVisible();
});

test('a catalog opened again stands on the whole grid, not on the last pick', async () => {
  installFakeBridge({ tools: [claudeCode] });

  const screen = await renderCatalog('subscription');

  await press(/^Claude/);
  await press('Cancel');
  await press('Add provider again');

  await expect.element(screen.getByRole('button', { name: /Codex/ })).toBeVisible();
});

test('an account the catalog connected closes it', async () => {
  installFakeBridge({ tools: [claudeCode] });

  const screen = await renderCatalog('subscription');

  await press(/^Claude/);
  await press('Sign in to Anthropic');

  await expect.element(screen.getByText('The catalog closed.'), { timeout: 10_000 }).toBeVisible();
});

function closingActNames() {
  const dialog = page.getByRole('dialog', { name: 'Add provider' });

  return dialog
    .getByRole('button')
    .all()
    .map((act) => act.element().textContent)
    .slice(-2);
}

test('the key page reads its settle acts last, Cancel then Connect', async () => {
  installFakeBridge();

  const screen = await renderCatalog('api-key');

  await press(/Anthropic API/);

  await expect.element(screen.getByLabelText('Key')).toBeVisible();
  expect(closingActNames()).toEqual(['Cancel', 'Connect']);
});

test('the subscription page reads the sign-in after Cancel the same way', async () => {
  installFakeBridge({ tools: [claudeCode] });

  const screen = await renderCatalog('subscription');

  await press(/Claude/);

  await expect.element(screen.getByText(/signs in on its own/)).toBeVisible();
  expect(closingActNames()).toEqual(['Cancel', 'Sign in to Anthropic']);
});
