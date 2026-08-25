import type { ReactElement } from 'react';

import type { CatalogEntry, ProviderKind } from '../../../../entities/provider';
import type { SetupStep } from '../../model/setup-step';

import { HarnessStep } from '../harness-step/harness-step';
import { SourcesStanding } from '../sources-standing/sources-standing';
import { WelcomeStep } from '../welcome-step/welcome-step';

type SetupStandingProps = {
  /** The step setup stands on. */
  step: SetupStep;
  /** Moves setup on to the named step. */
  walkTo: (step: SetupStep) => void;
  /** Records that setup is over, whether it finished or the person left it. */
  settle: () => void;
  /** The harnesses the person picked. */
  pickedHarnesses: ReadonlySet<string>;
  /** Picks a harness or takes it back out. */
  onPickHarness: (id: string) => void;
  /** The sources the person marked. */
  markedSources: ReadonlySet<string>;
  /** Marks a source or clears the mark. */
  onMarkSource: (id: string) => void;
  /** Opens a provider's own connect sheet. */
  onConnect: (entry: CatalogEntry, kind: ProviderKind) => void;
};

function harnessStanding({
  walkTo,
  settle,
  pickedHarnesses,
  onPickHarness,
}: SetupStandingProps): ReactElement {
  return (
    <HarnessStep
      onBack={() => {
        walkTo('welcome');
      }}
      onContinue={() => {
        walkTo('sources');
      }}
      onSkip={settle}
      onToggle={onPickHarness}
      picked={pickedHarnesses}
    />
  );
}

function sourcesStanding({
  walkTo,
  settle,
  markedSources,
  onMarkSource,
  onConnect,
}: SetupStandingProps): ReactElement {
  return (
    <SourcesStanding
      marked={markedSources}
      onBack={() => {
        walkTo('harnesses');
      }}
      onConnect={onConnect}
      onContinue={() => {
        walkTo('compose');
      }}
      onSkip={settle}
      onToggle={onMarkSource}
    />
  );
}

function welcomeStanding({ walkTo, settle }: SetupStandingProps): ReactElement {
  return (
    <WelcomeStep
      onExplore={settle}
      onSetUp={() => {
        walkTo('harnesses');
      }}
    />
  );
}

const STANDING: Partial<Record<SetupStep, (props: SetupStandingProps) => ReactElement>> = {
  welcome: welcomeStanding,
  harnesses: harnessStanding,
  sources: sourcesStanding,
};

/**
 * Whichever step setup stands on.
 *
 * @summary Each step draws only while it stands, so no step reads the machine or holds a query
 * open behind the one a person is looking at. A step nobody has written yet draws nothing rather
 * than a placeholder, which keeps the surface honest while the rest of setup is built.
 */
export function SetupStanding(props: SetupStandingProps) {
  return STANDING[props.step]?.(props) ?? null;
}
