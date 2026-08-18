import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { describe, expect, test } from 'vitest';

import {
  aMapOver,
  aMapWatching,
  aPricingClock,
  aPricingHome,
  CORRUPT_SUFFIX,
  miniPriced,
  neverFetches,
  NOW,
} from './price-map.testkit';

aPricingClock();

describe('the version a stored cache names', () => {
  test('the cache this build writes names the version it was written at', async () => {
    const files = await aPricingHome();
    const map = await aMapOver(files, async () => Promise.resolve(miniPriced));

    await map.refreshNow();

    const written: unknown = JSON.parse(await readFile(files.cacheFile, 'utf8'));

    expect(written).toEqual({ schemaVersion: 1, fetchedAt: NOW, payload: miniPriced });
  });

  test('a cache an earlier build left unversioned still prices, rather than reading as none', async () => {
    const files = await aPricingHome();
    const quarantined: string[] = [];

    await writeFile(
      files.cacheFile,
      JSON.stringify({ fetchedAt: NOW - 3_600_000, payload: miniPriced }),
    );

    const map = await aMapWatching({
      ...files,
      fetchPrices: neverFetches,
      onCorrupt: (path) => {
        quarantined.push(path);
      },
    });

    expect(map.standing().provenance).toEqual({ source: 'synced', fetchedAt: NOW - 3_600_000 });
    expect(map.standing().prices.get('gpt-5-mini')).toBeDefined();
    expect(quarantined).toEqual([]);
  });

  test('a cache from a newer build reads as no cache at all and is left where it stands', async () => {
    const files = await aPricingHome();
    const quarantined: string[] = [];
    const asStored = JSON.stringify({ schemaVersion: 2, fetchedAt: NOW, payload: miniPriced });

    await writeFile(files.cacheFile, asStored);

    const map = await aMapWatching({
      ...files,
      fetchPrices: neverFetches,
      onCorrupt: (path) => {
        quarantined.push(path);
      },
    });

    expect(map.standing().provenance).toEqual({ source: 'bundled' });
    expect(quarantined).toEqual([]);
    expect(await readFile(files.cacheFile, 'utf8')).toBe(asStored);
  });
});

describe('what the cache can refuse', () => {
  test('a corrupt cache is moved aside and the boot falls back to the bundle', async () => {
    const files = await aPricingHome();

    await writeFile(files.cacheFile, '{ not json');

    const map = await aMapOver(files, neverFetches);

    expect(map.standing().provenance).toEqual({ source: 'bundled' });
    expect(await readdir(dirname(files.cacheFile))).toContain(`prices.json.${CORRUPT_SUFFIX}`);
  });

  test('a corrupt cache names its quarantined path to the caller', async () => {
    const files = await aPricingHome();
    const quarantined: string[] = [];

    await writeFile(files.cacheFile, '{ not json');

    const map = await aMapWatching({
      ...files,
      fetchPrices: neverFetches,
      onCorrupt: (path) => {
        quarantined.push(path);
      },
    });

    expect(quarantined).toEqual([`${files.cacheFile}.${CORRUPT_SUFFIX}`]);
    expect(map.standing().provenance).toEqual({ source: 'bundled' });
  });

  test('a cache whose fetch instant is fractional reads as no cache at all', async () => {
    const files = await aPricingHome();

    await writeFile(files.cacheFile, JSON.stringify({ fetchedAt: 12.5, payload: miniPriced }));

    const map = await aMapOver(files, neverFetches);

    expect(map.standing().provenance).toEqual({ source: 'bundled' });
  });

  test('a cache that never says when it was fetched reads as no cache at all', async () => {
    const files = await aPricingHome();

    await writeFile(files.cacheFile, JSON.stringify({ payload: miniPriced }));

    const map = await aMapOver(files, neverFetches);

    expect(map.standing().provenance).toEqual({ source: 'bundled' });
  });

  test('a cache whose payload moved shape reads as no cache at all', async () => {
    const files = await aPricingHome();

    await writeFile(files.cacheFile, JSON.stringify({ fetchedAt: NOW - 60_000, payload: 'moved' }));

    const map = await aMapOver(files, neverFetches);

    expect(map.standing().provenance).toEqual({ source: 'bundled' });
  });
});
