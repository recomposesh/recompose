import type { ReactElement } from 'react';

import type { CatalogEntry, ConnectionWay, ProviderKind } from '../../../../entities/provider';
import type { FoundSource } from '../../model/found-source';

import { accountKindTitle, accountKinds } from '../../../../entities/account';
import { catalogEntries, offeredUnder } from '../../../../entities/provider';
import { Button } from '../../../../shared/ui';
import { lookReads } from '../../model/found-source';
import { continueReads } from '../../model/picked-count';
import { ProviderTile } from '../provider-tile/provider-tile';
import { SetupStepFrame } from '../setup-step-frame/setup-step-frame';
import { SourceRow } from '../source-row/source-row';

const CLAUDE_TERMS = "Claude Code signs in on its own and spends this plan, under Claude's terms.";

const HEADING = 'mb-1.75 text-footnote font-medium tracking-wide text-ink-secondary uppercase';

type SourcesStepProps = {
  /** Every source the look and the store turned up, in the order they read. */
  found: readonly FoundSource[];
  /** Which of them the person has marked. */
  marked: ReadonlySet<string>;
  /** Marks a source or clears the mark. */
  onToggle: (id: string) => void;
  /** Opens a provider's own connect sheet. */
  onConnect: (entry: CatalogEntry, kind: ProviderKind) => void;
  /** Steps back to the harness question. */
  onBack: () => void;
  /** Carries the marked sources into the compose step. */
  onContinue: () => void;
  /** Leaves setup. */
  onSkip: () => void;
};

/**
 * @summary Only the Claude plan carries one, because Claude Code signs itself in and spends the
 * plan without asking again. Every other source spends only what a person handed over here.
 */
function noteFor(source: FoundSource): string | undefined {
  return source.provider === 'anthropic' && source.kind === 'subscription'
    ? CLAUDE_TERMS
    : undefined;
}

function yourSources(
  found: readonly FoundSource[],
  marked: ReadonlySet<string>,
  onToggle: (id: string) => void,
): ReactElement | null {
  if (found.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="your-sources">
      <h2 className={HEADING} id="your-sources">
        Your sources
      </h2>
      <ul className="divide-y divide-line-faint overflow-hidden rounded-card border border-line-subtle bg-surface-card">
        {found.map((source) => (
          <li key={source.id}>
            <SourceRow
              marked={marked.has(source.id)}
              note={noteFor(source)}
              onToggle={() => {
                onToggle(source.id);
              }}
              source={source}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

type ColumnProps = {
  way: ConnectionWay;
  /**
   * Which products already stand among the sources, keyed by provider and column.
   *
   * @summary A provider selling both a plan and a key sells two products, so a stored plan must
   * never mark the key tile as connected. A person who holds one and wants the other would read
   * the tile as already done.
   */
  connected: ReadonlySet<string>;
  onConnect: (entry: CatalogEntry, kind: ProviderKind) => void;
};

function catalogColumn({ way, connected, onConnect }: ColumnProps): ReactElement {
  return (
    <section aria-labelledby={`catalog-${way}`} key={way}>
      <h2 className={HEADING} id={`catalog-${way}`}>
        {accountKindTitle(way)}
      </h2>
      <ul className="grid grid-cols-5 gap-1.5">
        {offeredUnder(catalogEntries, way).map((entry) => (
          <li key={entry.id}>
            <ProviderTile
              connected={connected.has(`${entry.id}:${way}`)}
              entry={entry}
              onPick={() => {
                onConnect(entry, way);
              }}
              way={way}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The second question setup asks, and the only one that answers part of itself.
 *
 * @summary The look runs before the step draws, so a person meets what the machine already holds
 * rather than an empty list they have to fill. Everything the catalog offers stands under it,
 * including providers already connected: one Claude plan does not mean a person wants only one.
 */
export function SourcesStep({
  found,
  marked,
  onToggle,
  onConnect,
  onBack,
  onContinue,
  onSkip,
}: SourcesStepProps) {
  const connected = new Set(found.map((source) => `${source.provider}:${source.kind}`));

  return (
    <SetupStepFrame
      acts={
        <>
          <Button onPress={onBack}>Back</Button>
          <Button disabled={marked.size === 0} onPress={onContinue} variant="ink">
            {continueReads(marked.size, 'source')}
          </Button>
        </>
      }
      lede={lookReads(found.length)}
      onSkip={onSkip}
      step="sources"
    >
      <div className="flex flex-col gap-4">
        {yourSources(found, marked, onToggle)}
        {accountKinds.map((kind) => catalogColumn({ connected, onConnect, way: kind }))}
        <p className="text-detail text-ink-secondary">You can add more later from Providers.</p>
      </div>
    </SetupStepFrame>
  );
}
