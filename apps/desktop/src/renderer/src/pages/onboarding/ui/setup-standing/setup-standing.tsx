import type { GatewayConfig } from '@recompose/contracts';
import type { ReactElement } from 'react';

import type { CatalogEntry, ProviderKind } from '../../../../entities/provider';
import type { FoundSource } from '../../model/found-source';
import type { SetupStep } from '../../model/setup-step';

import { BuildingStanding } from '../building-standing/building-standing';
import { ComposeStanding } from '../compose-standing/compose-standing';
import { HarnessStep } from '../harness-step/harness-step';
import { PointingStanding } from '../pointing-standing/pointing-standing';
import { SourcesStanding } from '../sources-standing/sources-standing';
import { WaitingStanding } from '../waiting-standing/waiting-standing';
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
  /** Whether a source stands marked. */
  isMarked: (source: FoundSource) => boolean;
  /** Marks a source or clears the mark. */
  onMarkSource: (source: FoundSource) => void;
  /** Opens a provider's own connect sheet. */
  onConnect: (entry: CatalogEntry, kind: ProviderKind) => void;
  /** Builds the graph the compose step showed. */
  onCreate: () => void;
  /** The gateway setup built, once it built one. */
  built: GatewayConfig | undefined;
  /** Records the gateway the run stored, so the steps after it can read one. */
  onBuilt: (gateway: GatewayConfig) => void;
};

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
  isMarked,
  onMarkSource,
  onConnect,
}: SetupStandingProps): ReactElement {
  return (
    <SourcesStanding
      isMarked={isMarked}
      onBack={() => {
        walkTo('harnesses');
      }}
      onConnect={onConnect}
      onContinue={() => {
        walkTo('compose');
      }}
      onMark={onMarkSource}
      onSkip={settle}
    />
  );
}

function composeStanding({
  walkTo,
  settle,
  pickedHarnesses,
  isMarked,
  onCreate,
}: SetupStandingProps): ReactElement {
  return (
    <ComposeStanding
      harnesses={pickedHarnesses}
      isMarked={isMarked}
      onBack={() => {
        walkTo('sources');
      }}
      onCreate={onCreate}
      onSkip={settle}
    />
  );
}

function buildingStanding({
  walkTo,
  settle,
  pickedHarnesses,
  isMarked,
  onBuilt,
}: SetupStandingProps): ReactElement {
  return (
    <BuildingStanding
      harnesses={pickedHarnesses}
      isMarked={isMarked}
      onBack={() => {
        walkTo('compose');
      }}
      onBuilt={(gateway) => {
        onBuilt(gateway);
        walkTo('pointing');
      }}
      onSkip={settle}
    />
  );
}

function pointingStanding({
  walkTo,
  settle,
  pickedHarnesses,
  built,
}: SetupStandingProps): ReactElement | null {
  return built === undefined ? null : (
    <PointingStanding
      gateway={built}
      harnesses={pickedHarnesses}
      onBack={() => {
        walkTo('building');
      }}
      onConnected={() => {
        walkTo('waiting');
      }}
      onSkip={settle}
    />
  );
}

function waitingStanding({
  walkTo,
  settle,
  pickedHarnesses,
  built,
}: SetupStandingProps): ReactElement {
  return (
    <WaitingStanding
      gateway={built}
      harnesses={pickedHarnesses}
      onShowCommands={() => {
        walkTo('pointing');
      }}
      onSkip={settle}
    />
  );
}

const STANDING: Partial<Record<SetupStep, (props: SetupStandingProps) => ReactElement | null>> = {
  welcome: welcomeStanding,
  harnesses: harnessStanding,
  sources: sourcesStanding,
  compose: composeStanding,
  building: buildingStanding,
  pointing: pointingStanding,
  waiting: waitingStanding,
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
