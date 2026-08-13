import type { Account } from '@recompose/contracts';

import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import type { TargetNodeData } from './target-node';

import { cardOnCanvas } from '../../testing/canvas-flow.testkit';
import { TargetNode } from './target-node';

const ollama: Account = {
  id: 'a4',
  provider: 'ollama',
  kind: 'local',
  address: '127.0.0.1:11434',
};

const claude: Account = {
  id: 'a1',
  provider: 'anthropic',
  kind: 'subscription',
  provenance: 'sign-in',
  label: 'Claude Max',
};

async function renderTarget(data: TargetNodeData) {
  return render(cardOnCanvas(data.kind, TargetNode, data, false));
}

test('a runtime that names itself reads as the server it is rather than as nothing', async () => {
  const screen = await renderTarget({
    id: 'target:a4',
    kind: 'target',
    account: ollama,
    modelId: 'fast',
  });

  await expect
    .element(screen.getByRole('button', { name: /Ollama/ }))
    .toHaveTextContent('127.0.0.1:11434');
});

test('a target leads with its provider product and connection kind rather than the word target', async () => {
  const screen = await renderTarget({
    id: 'target:a1',
    kind: 'target',
    account: claude,
    modelId: 'fast',
    detail: 'ada@example.com',
  });
  const card = screen.getByRole('button', { name: /ada@example.com/ });

  await expect.element(card).toHaveTextContent('Subscription');
  await expect.element(card).toHaveTextContent('Claude');
  await expect.element(card).toHaveTextContent('ada@example.com');
  await expect.element(card).not.toHaveTextContent('Target');
});

test('an account that left the registry keeps its card and says what became of it', async () => {
  const screen = await renderTarget({
    id: 'ghost:a9',
    kind: 'ghost-target',
    accountId: 'a9',
    modelId: 'slow',
  });

  const card = screen.getByRole('button', { name: /Removed/ });

  await expect.element(card).toHaveTextContent('a9');
  await expect.element(card).toHaveTextContent('not in the registry');
});

test('the spot a cable was let go at offers the pick without a redundant waiting line', async () => {
  const screen = await renderTarget({ id: 'pending', kind: 'pending-target' });

  await expect.element(screen.getByRole('button', { name: /Choose a target/ })).toBeVisible();
  await expect.element(screen.getByText('waiting on a pick')).not.toBeInTheDocument();
});

test('a selected card says so, which is what the inspector opens against', async () => {
  const screen = await render(
    cardOnCanvas(
      'target',
      TargetNode,
      { id: 'target:a4', kind: 'target', account: ollama, modelId: 'fast' },
      true,
    ),
  );

  await expect.element(screen.getByRole('button', { pressed: true })).toBeVisible();
});
