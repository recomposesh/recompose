import { createSearchAPI } from 'fumadocs-core/search/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { searchClient } from './search-client';

const exported = await createSearchAPI('advanced', {
  indexes: [
    {
      id: '/docs/compose/failover',
      url: '/docs/compose/failover',
      title: 'Failover routing',
      structuredData: {
        headings: [{ id: 'order', content: 'The order' }],
        contents: [
          { heading: 'order', content: 'a failover router tries the next healthy target' },
        ],
      },
    },
    {
      id: '/docs/compose/round-robin',
      url: '/docs/compose/round-robin',
      title: 'Round-robin routing',
      structuredData: {
        headings: [{ id: 'turns', content: 'The turns' }],
        contents: [{ heading: 'turns', content: 'a round-robin router spreads requests in turn' }],
      },
    },
  ],
}).staticGET();

const index = await exported.text();

afterEach(() => {
  vi.unstubAllGlobals();
});

function servedFromFiles(): { addresses: string[] } {
  const addresses: string[] = [];

  vi.stubGlobal('fetch', async (address: string) => {
    addresses.push(address);

    return Promise.resolve(
      new Response(index, { headers: { 'content-type': 'application/json' } }),
    );
  });

  return { addresses };
}

describe('the search a visitor runs on the published site', () => {
  it('answers every query from one downloaded index, never from an address that runs the query', async () => {
    const { addresses } = servedFromFiles();

    const failover = await searchClient.search('failover');
    const roundRobin = await searchClient.search('round-robin');

    expect(JSON.stringify(failover)).toContain('/docs/compose/failover');
    expect(JSON.stringify(roundRobin)).toContain('/docs/compose/round-robin');
    expect(addresses).toEqual(['/api/search']);
  });
});
