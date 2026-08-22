import { describe, expect, it } from 'vitest';

import type { ProviderObservation } from '../provider/provider-observability';

import { providerObservability } from '../provider/provider-observability';
import { sendObservedSubscription } from './observed-send';

async function acceptedResponse(): Promise<Response> {
  await Promise.resolve();

  return new Response(null, { status: 204 });
}

async function neverAnswering(): Promise<Response> {
  await Promise.resolve();

  throw new Error('the call was cut off before anything came back');
}

describe('sendObservedSubscription: a send that never comes back with a response', () => {
  it('settles the row it opened rather than leaving the request reading as in flight', async () => {
    const observed: ProviderObservation[] = [];
    const unsubscribe = providerObservability().subscribe((record) => {
      observed.push(record);
    });
    const request = { url: 'https://example.test/v1/messages', headers: [], body: '{}' };

    await expect(
      sendObservedSubscription('anthropic', 'account-1', {}, request, neverAnswering),
    ).rejects.toThrow('the call was cut off');
    unsubscribe();

    expect(observed.at(-1)).toMatchObject({ provider: 'anthropic', status: 502 });
  });

  it('lets the failure travel on, so the caller still learns the call never landed', async () => {
    const request = { url: 'https://example.test/v1/messages', headers: [], body: '{}' };

    await expect(
      sendObservedSubscription('anthropic', 'account-1', {}, request, neverAnswering),
    ).rejects.toThrow('the call was cut off');
  });
});

describe('sendObservedSubscription: a request body that names no model', () => {
  it('records the send with an empty model rather than skipping the observation', async () => {
    const observed: ProviderObservation[] = [];
    const unsubscribe = providerObservability().subscribe((record) => {
      observed.push(record);
    });
    const request = { url: 'https://example.test/v1/messages', headers: [], body: '{}' };

    await sendObservedSubscription('anthropic', 'account-1', {}, request, acceptedResponse);
    unsubscribe();

    expect(observed.at(-1)).toMatchObject({
      provider: 'anthropic',
      model: '',
      dialect: 'anthropic',
      status: 204,
    });
  });
});
