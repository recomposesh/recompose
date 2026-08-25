import type { CatalogEntry, ConnectionWay } from '../../../../entities/provider';

import { offerFor, ProviderLead } from '../../../../entities/provider';

type ProviderTileProps = {
  /** The catalog entry this tile stands for. */
  entry: CatalogEntry;
  /** Which column of the catalog the tile stands in, which decides what it reads as. */
  way: ConnectionWay;
  /** Whether this provider already stands among the person's sources. */
  connected: boolean;
  /** Opens this provider's own connect sheet. */
  onPick: () => void;
};

/**
 * One provider a person can reach from the catalog, drawn small enough that all of them fit.
 *
 * @summary It reads as the offer's own title rather than the entry's name, because a provider
 * selling both a plan and a key stands in two columns and the two are different products. A
 * provider already connected keeps its tile: a person with one Claude plan may want a second.
 */
export function ProviderTile({ entry, way, connected, onPick }: ProviderTileProps) {
  const offer = offerFor(entry, way);

  if (offer === undefined) {
    return null;
  }

  return (
    <button
      className={`relative flex h-16 w-full flex-col items-center justify-center gap-1.5 rounded-card border px-1 focus-ring-fill row-hover ${
        connected ? 'border-accent bg-surface-selected' : 'border-line-subtle bg-surface-card'
      }`}
      onClick={onPick}
      type="button"
    >
      <ProviderLead lead={entry.lead} />
      <span className="text-center text-caption text-ink">{offer.title}</span>
    </button>
  );
}
