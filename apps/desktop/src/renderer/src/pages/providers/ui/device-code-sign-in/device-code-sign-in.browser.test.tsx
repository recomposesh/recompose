import type { RecomposeIpc } from '@recompose/contracts';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page, userEvent } from 'vitest/browser';

import { installFakeBridge } from '../../../../shared/testing';
import { entryNamed } from '../../testing/catalog-entry';
import { DeviceCodeSignIn } from './device-code-sign-in';

function countingCodeChannel() {
  let asked = 0;

  const channel: RecomposeIpc['subscriptions:device-code'] = async () => {
    asked += 1;

    return Promise.resolve({
      ok: true as const,
      value: {
        userCode: `ABCD-${String(asked)}`,
        verificationUri: 'https://github.com/login/device',
      },
    });
  };

  return { channel, timesAsked: () => asked };
}

async function renderStep(overrides: Partial<RecomposeIpc>, onConnected: () => void) {
  installFakeBridge({ overrides });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, networkMode: 'always' },
      mutations: { retry: false, networkMode: 'always' },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <DeviceCodeSignIn
        entry={entryNamed('copilot')}
        onConnected={onConnected}
        provider="copilot"
      />
    </QueryClientProvider>,
  );
}

test('Given a code is on screen, when the app comes back to the foreground, no second code is asked for', async () => {
  const asking = countingCodeChannel();
  const onConnected = vi.fn(() => undefined);

  await renderStep({ 'subscriptions:device-code': asking.channel }, onConnected);

  await expect.element(page.getByText('ABCD-1')).toBeVisible();

  window.dispatchEvent(new Event('visibilitychange'));

  await userEvent.click(page.getByRole('button', { name: 'I entered the code' }));
  await vi.waitFor(() => {
    expect(onConnected).toHaveBeenCalled();
  });

  expect(asking.timesAsked()).toBe(1);
  await expect.element(page.getByText('ABCD-1')).toBeVisible();
});
