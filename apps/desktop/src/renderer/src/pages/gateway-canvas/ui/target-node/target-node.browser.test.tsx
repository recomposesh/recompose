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

async function renderTarget(data: TargetNodeData) {
  return render(cardOnCanvas(data.kind, TargetNode, data, false));
}

test('a runtime that names itself reads as the server it is rather than as nothing', async () => {
  const screen = await renderTarget({ id: 'target:a4', kind: 'target', account: ollama });

  await expect.element(screen.getByRole('button', { name: /Ollama/ })).toHaveTextContent('ollama');
});

test('an account that left the registry keeps its card and says what became of it', async () => {
  const screen = await renderTarget({ id: 'ghost:a9', kind: 'ghost-target', accountId: 'a9' });

  const card = screen.getByRole('button', { name: /Removed/ });

  await expect.element(card).toHaveTextContent('a9');
  await expect.element(card).toHaveTextContent('not in the registry');
});

test('the spot a cable was let go at says it is still waiting on a pick', async () => {
  const screen = await renderTarget({ id: 'pending', kind: 'pending-target' });

  await expect
    .element(screen.getByRole('button', { name: /Choose a target/ }))
    .toHaveTextContent('waiting on a pick');
});

test('a selected card says so, which is what the inspector opens against', async () => {
  const screen = await render(
    cardOnCanvas('target', TargetNode, { id: 'target:a4', kind: 'target', account: ollama }, true),
  );

  await expect.element(screen.getByRole('button', { pressed: true })).toBeVisible();
});
