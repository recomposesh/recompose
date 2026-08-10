import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { installFakeBridge } from '../shared/testing';
import { AppDevtools } from './devtools';
import { createQueryClient } from './query-client';
import { createAppRouter } from './router';

async function renderDevtools() {
  installFakeBridge();

  const queryClient = createQueryClient();

  return render(
    <AppDevtools queryClient={queryClient} router={createAppRouter({ queryClient })} />,
  );
}

test('mounting the host opens the panels without a press, since the ask that mounted it asked', async () => {
  const screen = await renderDevtools();

  await expect.element(screen.getByRole('heading', { name: 'Router' })).toBeVisible();
  await expect.element(screen.getByRole('heading', { name: 'React Query' })).toBeVisible();
});
