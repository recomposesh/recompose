import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { cardOnCanvas } from '../../testing/canvas-flow.testkit';
import { VirtualModelNode } from './virtual-model-node';

async function renderDefinition(displayName: string) {
  return render(
    cardOnCanvas(
      'virtual-model',
      VirtualModelNode,
      {
        id: 'model:sonnet-latest',
        kind: 'virtual-model',
        modelId: 'sonnet-latest',
        displayName,
        providerModel: 'claude-sonnet-4',
        onPickTarget: vi.fn<() => void>(),
      },
      false,
    ),
  );
}

test('the card names the definition and the id a client sends for it', async () => {
  const screen = await renderDefinition('Everyday Sonnet');

  await expect
    .element(screen.getByRole('button', { name: /Everyday Sonnet/ }))
    .toHaveTextContent('sonnet-latest');
});

test('a name too long for the card hands its whole self to a pointer resting on it', async () => {
  const runsLong = 'The one everybody points their editor at on a Monday morning';
  const screen = await renderDefinition(runsLong);

  const card = screen.container.querySelector('[aria-pressed]');

  expect(card?.children[1]).toHaveAttribute('title', runsLong);
});
