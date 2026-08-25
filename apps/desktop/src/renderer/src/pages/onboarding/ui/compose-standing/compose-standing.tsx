import type { SetupSlice } from '../../model/setup-slice';

import { useComposePlan } from '../../model/use-compose-plan';
import { useFoundSources } from '../../model/use-found-sources';
import { ComposeStep } from '../compose-step/compose-step';

type ComposeStandingProps = SetupSlice & {
  /** Steps back to the source question. */
  onBack: () => void;
  /** Builds the graph the diagram showed. */
  onCreate: () => void;
  /** Leaves setup. */
  onSkip: () => void;
};

/**
 * The compose step, standing over the plan the marked sources add up to.
 *
 * @summary The model listings are read here rather than a step earlier, because a listing taken
 * before an account was recorded would answer for an account that did not exist yet.
 */
export function ComposeStanding({
  harnesses,
  isMarked,
  onBack,
  onCreate,
  onSkip,
}: ComposeStandingProps) {
  const plan = useComposePlan(harnesses, useFoundSources().filter(isMarked));

  return (
    <ComposeStep
      gatewayName={plan.gatewayName}
      modelId={plan.modelId}
      onBack={onBack}
      onCreate={onCreate}
      onSkip={onSkip}
      port={plan.port}
      targets={plan.targets}
    />
  );
}
