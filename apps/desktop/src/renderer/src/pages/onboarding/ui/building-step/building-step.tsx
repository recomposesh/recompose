import type { RunStanding, SetupJob } from '../../model/setup-job';

import { Button } from '../../../../shared/ui';
import { runReads, standingOf } from '../../model/setup-job';
import { JobRow } from '../job-row/job-row';
import { SetupStepFrame } from '../setup-step-frame/setup-step-frame';

type BuildingStepProps = {
  /** Every job the run carries out, in the order it carries them. */
  jobs: readonly SetupJob[];
  /** How far the run has got, and what stopped it. */
  run: RunStanding;
  /** Steps back to the compose step, offered only where a job refused. */
  onBack: () => void;
  /** Runs the refused job again. */
  onRetry: () => void;
  /** Carries the person on to pointing their harnesses. */
  onPointHarnesses: () => void;
  /** Leaves setup. */
  onSkip: () => void;
};

function actsFor(
  run: RunStanding,
  jobs: number,
  onBack: () => void,
  onRetry: () => void,
  onPointHarnesses: () => void,
) {
  if (run.refusal !== undefined) {
    return (
      <>
        <Button onPress={onBack}>Back</Button>
        <Button onPress={onRetry} variant="ink">
          Try again
        </Button>
      </>
    );
  }

  return run.at < jobs ? null : (
    <Button onPress={onPointHarnesses} variant="ink">
      Point your harnesses at it
    </Button>
  );
}

/**
 * The run that builds what the compose step showed.
 *
 * @summary A working run offers no act at all: there is nothing for a person to decide while it
 * works, and a control they could press would only invite them to interrupt it. The acts arrive
 * with an outcome, which is the first moment there is a choice to make.
 */
export function BuildingStep({
  jobs,
  run,
  onBack,
  onRetry,
  onPointHarnesses,
  onSkip,
}: BuildingStepProps) {
  return (
    <SetupStepFrame
      acts={actsFor(run, jobs.length, onBack, onRetry, onPointHarnesses)}
      lede={runReads(run)}
      onSkip={onSkip}
      step="building"
    >
      <div
        aria-live="polite"
        className="divide-y divide-line-faint overflow-hidden rounded-card border border-line-subtle bg-surface-card"
      >
        {jobs.map((job, index) => (
          <JobRow job={job} key={job.id} refusal={run.refusal} standing={standingOf(run, index)} />
        ))}
      </div>
    </SetupStepFrame>
  );
}
