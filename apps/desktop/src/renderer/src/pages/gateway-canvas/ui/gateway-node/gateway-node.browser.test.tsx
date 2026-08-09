import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { cardOnCanvas } from '../../testing/canvas-flow.testkit';
import { GatewayNode } from './gateway-node';

async function renderGateway() {
  return render(
    cardOnCanvas(
      'gateway',
      GatewayNode,
      {
        id: 'gateway',
        kind: 'gateway',
        displayName: 'Local gateway',
        port: 51234,
        onAddVirtualModel: vi.fn<() => void>(),
      },
      false,
    ),
  );
}

test('the card names the gateway and the port a client points at', async () => {
  const screen = await renderGateway();

  await expect.element(screen.getByRole('button', { name: /Local gateway/ })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: /:51234/ })).toBeVisible();
});

test('the add path names what it asks for, so a keyboard alone can tell what it does', async () => {
  const screen = await renderGateway();

  await expect
    .element(screen.getByRole('button', { name: 'Add a virtual model' }))
    .toBeInTheDocument();
});
