import type { CatalogEntry, ProviderKind } from '../../../../entities/provider';
import type { FoundSource } from '../../model/found-source';

import { useFoundSources } from '../../model/use-found-sources';
import { SourcesStep } from '../sources-step/sources-step';

type SourcesStandingProps = {
  /** Whether this source stands marked. */
  isMarked: (source: FoundSource) => boolean;
  /** Marks a source or clears the mark. */
  onMark: (source: FoundSource) => void;
  /** Steps back to the harness question. */
  onBack: () => void;
  /** Opens a provider's own connect sheet. */
  onConnect: (entry: CatalogEntry, kind: ProviderKind) => void;
  /** Carries the marked sources into the compose step. */
  onContinue: () => void;
  /** Leaves setup. */
  onSkip: () => void;
};

/**
 * The sources step, standing over the look this machine answers with.
 *
 * @summary The look lives here rather than a step above, because reading the credential store can
 * ask the operating system for permission and a prompt belongs to something the person did. A
 * person who never walks past the welcome screen is never asked.
 */
export function SourcesStanding({
  isMarked,
  onMark,
  onBack,
  onConnect,
  onContinue,
  onSkip,
}: SourcesStandingProps) {
  const found = useFoundSources();
  const marked = new Set<string>();
  const byId = new Map<string, FoundSource>();

  for (const source of found) {
    byId.set(source.id, source);

    if (isMarked(source)) {
      marked.add(source.id);
    }
  }

  return (
    <SourcesStep
      found={found}
      marked={marked}
      onBack={onBack}
      onConnect={onConnect}
      onContinue={onContinue}
      onSkip={onSkip}
      onToggle={(id) => {
        const source = byId.get(id);

        if (source !== undefined) {
          onMark(source);
        }
      }}
    />
  );
}
