import type { ReactNode } from 'react';

import type { CatalogEntry, ConnectionWay, ProviderKind } from '../../../../entities/provider';

import {
  catalogEntries,
  offerFor,
  offeredUnder,
  ProviderLead,
} from '../../../../entities/provider';

type CatalogListProps = {
  /** The kind the screen behind holds, which is the only kind the list offers. */
  kind: ProviderKind;
  onPick: (entry: CatalogEntry) => void;
};

function cardBody(lead: ReactNode, title: string, benefit: string): ReactNode {
  return (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-control border border-line-subtle bg-surface-raised">
        {lead}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-card-title text-ink">{title}</span>
        <span className="truncate text-detail text-ink-secondary">{benefit}</span>
      </span>
    </>
  );
}

function connectableCards(
  way: ConnectionWay,
  onPick: (entry: CatalogEntry) => void,
): readonly ReactNode[] {
  return offeredUnder(catalogEntries, way).map((entry) => {
    const offer = offerFor(entry, way);

    if (offer === undefined) {
      return null;
    }

    return (
      <button
        className="flex items-center gap-2.5 rounded-card border border-line-subtle bg-surface-card p-3 text-start focus-ring-wide row-hover"
        key={entry.id}
        onClick={() => {
          onPick(entry);
        }}
        type="button"
      >
        {cardBody(
          <ProviderLead className="size-4" lead={entry.lead} />,
          offer.title,
          offer.benefit,
        )}
      </button>
    );
  });
}

/**
 * The providers the screen's kind can connect to, as cards.
 *
 * @summary Reach for it from the catalog. The grid holds one kind because the screen that opened
 * it holds one kind, and every card in it connects, so nothing on the surface stands inert.
 */
export function CatalogList({ kind, onPick }: CatalogListProps) {
  return <div className="grid grid-cols-2 gap-2">{connectableCards(kind, onPick)}</div>;
}
