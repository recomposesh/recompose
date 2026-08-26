import { describe, expect, test } from 'vitest';

import { listProviderModels } from './model-list';
import { credentialed, fetchAnswering, twoModels, vendorOrigin } from './model-list.testkit';

describe('a catalog naming the models that are going away', () => {
  test('a model the vendor announced a shutdown for carries that date off the catalog', async () => {
    const body = JSON.stringify({
      data: [
        { id: 'gpt-5-pro', shutdown_date: '2026-12-11' },
        { id: 'gpt-5.6-sol', shutdown_date: null },
      ],
    });
    const { fetchLike } = fetchAnswering(200, body);

    await expect(listProviderModels(fetchLike, vendorOrigin, credentialed)).resolves.toEqual({
      standing: 'listed',
      models: [{ id: 'gpt-5-pro', shutdownDate: '2026-12-11' }, { id: 'gpt-5.6-sol' }],
    });
  });

  test('a vendor publishing no shutdown field loses nothing it named', async () => {
    const { fetchLike } = fetchAnswering(200, twoModels);

    await expect(listProviderModels(fetchLike, vendorOrigin, credentialed)).resolves.toEqual({
      standing: 'listed',
      models: [{ id: 'gpt-5' }, { id: 'gpt-5-mini' }],
    });
  });

  test('a shutdown field that is not a date announces nothing, rather than announcing a blank', async () => {
    const body = JSON.stringify({
      data: [
        { id: 'gpt-5', shutdown_date: '   ' },
        { id: 'gpt-5-mini', shutdown_date: 20261211 },
      ],
    });
    const { fetchLike } = fetchAnswering(200, body);

    await expect(listProviderModels(fetchLike, vendorOrigin, credentialed)).resolves.toEqual({
      standing: 'listed',
      models: [{ id: 'gpt-5' }, { id: 'gpt-5-mini' }],
    });
  });
});
