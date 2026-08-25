import type { CatalogEntry, ProviderKind } from '../../../../entities/provider';

import { useFoundSources } from '../../model/use-found-sources';
import { SourcesStep } from '../sources-step/sources-step';

type SourcesStandingProps = {
  /** Which sources the person has marked. */
  marked: ReadonlySet<string>;
  /** Marks a source or clears the mark. */
  onToggle: (id: string) => void;
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
  marked,
  onToggle,
  onBack,
  onConnect,
  onContinue,
  onSkip,
}: SourcesStandingProps) {
  return (
    <SourcesStep
      found={useFoundSources()}
      marked={marked}
      onBack={onBack}
      onConnect={onConnect}
      onContinue={onContinue}
      onSkip={onSkip}
      onToggle={onToggle}
    />
  );
}
