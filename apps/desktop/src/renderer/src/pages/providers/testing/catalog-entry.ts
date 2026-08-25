import type { CatalogEntry } from '../../../entities/provider';

import { catalogEntries } from '../../../entities/provider';

/**
 * The catalog entry one reading stands on, refusing loudly where the catalog holds none.
 *
 * @summary A story and a browser reading both need a real entry rather than a hand-built one, so
 * a row that leaves the catalog fails the reading that named it instead of quietly rendering a
 * shape nothing ships.
 */
export function entryNamed(id: string): CatalogEntry {
  const entry = catalogEntries.find((candidate) => candidate.id === id);

  if (entry === undefined) {
    throw new Error(`the catalog holds no entry under ${id}`);
  }

  return entry;
}
