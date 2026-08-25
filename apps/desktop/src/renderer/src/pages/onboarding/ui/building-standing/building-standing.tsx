import type { GatewayConfig } from '@recompose/contracts';

import type { FoundSource } from '../../model/found-source';
import type { SetupSlice } from '../../model/setup-slice';

import { firstModelName, pickServedModel } from '../../model/first-model';
import { jobsFor } from '../../model/setup-job';
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
 * The build run, standing over the sources the person marked.
 *
 * @summary The accounts are already recorded, so the run reports them as finished rather than
 * doing them again. What is left is the gateway and the virtual model, which reach disk together.
 */
export function BuildingStanding({
  harnesses,
  isMarked,
  onBack,
  onBuilt,
  onSkip,
}: BuildingStandingProps) {
  const marked = useFoundSources().filter(isMarked);
  const listings = useServedModels(marked);
  const modelId = firstModelName(harnesses);

  const targets = marked.map((source, index) => ({
    accountId: source.id,
    providerModel: pickServedModel(listings[index] ?? []) ?? '',
  }));

  const { run, built, onRetry } = useBuildRun(
    { gatewayName: 'My Gateway', modelId, targets },
    marked.length,
    targets.every((target) => target.providerModel !== ''),
  );

  return (
    <BuildingStep
      jobs={jobsFor(marked.map(recordedJob), modelId, marked.length)}
      onBack={onBack}
      onPointHarnesses={() => {
        if (built !== undefined) {
          onBuilt(built);
        }
      }}
      onRetry={onRetry}
      onSkip={onSkip}
      run={built === undefined ? run : { at: marked.length + 2, refusal: undefined }}
    />
  );
}
