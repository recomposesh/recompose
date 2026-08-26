import type { GatewayConfig } from '@recompose/contracts';

import type { FoundSource } from '../../model/found-source';
import type { RunStanding } from '../../model/setup-job';
import type { SetupSlice } from '../../model/setup-slice';
import type { SourceReading } from '../../model/source-reading';

import { FIRST_GATEWAY_NAME } from '../../model/first-gateway-name';
import { firstModelName, pickServedModel } from '../../model/first-model';
import { jobsFor } from '../../model/setup-job';
import { sourceReadingOf } from '../../model/source-reading';
import { useBuildRun } from '../../model/use-build-run';
import { useFoundSources } from '../../model/use-found-sources';
import { useServedModels } from '../../model/use-served-models';
import { BuildingStep } from '../building-step/building-step';

type BuildingStandingProps = SetupSlice & {
  /** Steps back to the compose step, offered only where a job refused. */
  onBack: () => void;
  /** Carries the person on to pointing their harnesses, naming what the run stored. */
  onBuilt: (gateway: GatewayConfig) => void;
  /** Leaves setup. */
  onSkip: () => void;
};

function recordedJob(source: FoundSource) {
  return {
    id: source.id,
    title: source.kind === 'local' ? `${source.title} linked` : `${source.title} connected`,
    note: source.identity,
  };
}

/**
 * Where the whole run reads, which is the reading of the sources until that reading is done.
 *
 * @summary Nothing after the sources can start until they have all answered, so until they have,
 * the reading's own row is where the run stands and a refusal there is the run's refusal. Reading
 * the two as one standing is what keeps a silent account from leaving the surface on a turning ring
 * that never becomes anything.
 */
function runShown(
  built: GatewayConfig | undefined,
  reading: SourceReading,
  run: RunStanding,
  readingAt: number,
  jobs: number,
): RunStanding {
  if (built !== undefined) {
    return { at: jobs, refusal: undefined };
  }

  return reading.standing === 'listed' ? run : { at: readingAt, refusal: reading.refusal };
}

/**
 * The build run, standing over the sources the person marked.
 *
 * @summary The accounts are already recorded, so the run reports them as finished rather than
 * doing them again. What is left is asking each account what it serves, and then the gateway and
 * the virtual model, which reach disk together.
 *
 * A source the recording never produced carries a machine row's id rather than an account's, and
 * the run routes to accounts. Building over the recorded ones only keeps setup from writing a
 * target nothing on disk explains.
 *
 * Trying again asks the accounts again as well as building again, because the two refusals a
 * person can meet here arrive on one control and only one of them is the write.
 */
export function BuildingStanding({
  harnesses,
  isMarked,
  onBack,
  onBuilt,
  onSkip,
}: BuildingStandingProps) {
  const recorded = useFoundSources().filter((source) => isMarked(source) && !source.adoptable);
  const { served, lookAgain } = useServedModels(recorded);
  const modelId = firstModelName(harnesses);
  const reading = sourceReadingOf(served);

  const targets = recorded.map((source, index) => ({
    accountId: source.id,
    providerModel: pickServedModel(served[index]?.models ?? []) ?? '',
  }));

  const { run, built, onRetry } = useBuildRun(
    { gatewayName: FIRST_GATEWAY_NAME, modelId, targets },
    recorded.length + 1,
    reading.standing === 'listed',
  );

  const jobs = jobsFor(recorded.map(recordedJob), modelId, recorded.length);

  return (
    <BuildingStep
      jobs={jobs}
      onBack={onBack}
      onPointHarnesses={() => {
        if (built !== undefined) {
          onBuilt(built);
        }
      }}
      onRetry={() => {
        lookAgain();
        onRetry();
      }}
      onSkip={onSkip}
      run={runShown(built, reading, run, recorded.length, jobs.length)}
    />
  );
}
