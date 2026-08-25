import type { ReactElement } from 'react';

import type { JobStanding, SetupJob } from '../../model/setup-job';

import { Icon } from '../../../../shared/ui';

type JobRowProps = {
  /** The job this row stands for. */
  job: SetupJob;
  /** How the job reads right now. */
  standing: JobStanding;
  /** Why it refused, where it did. */
  refusal?: string | undefined;
};

/**
 * @summary The mark takes the standing colour and the reason takes the readable one. A refusal is
 * the one row a person has to read rather than glance at, and the mark tone is cut for a shape
 * against a card rather than for twelve-point prose.
 *
 * A finished job takes a tick, a running one a turning ring, and a waiting one a hollow
 * disc that says the run has not reached it. A refusal takes its own mark and its own colour,
 * because a person scanning the list has to find the one row that stopped without reading four.
 */
function standingMark(standing: JobStanding): ReactElement {
  if (standing === 'finished') {
    return <Icon className="size-3.75 shrink-0 text-running" name="check" />;
  }

  if (standing === 'refused') {
    return <Icon className="size-3.75 shrink-0 text-stopped" name="close" />;
  }

  if (standing === 'running') {
    return (
      <span className="size-3.5 shrink-0 job-turning rounded-full border-2 border-line-field border-t-ink" />
    );
  }

  return <span className="size-3.25 shrink-0 rounded-full border border-line-field" />;
}

const TITLE_INK: Record<JobStanding, string> = {
  finished: 'text-ink',
  running: 'text-ink',
  refused: 'text-ink',
  waiting: 'text-ink-secondary',
};

/** One piece of the build run, reading where it stands and what it touched. */
export function JobRow({ job, standing, refusal }: JobRowProps) {
  return (
    <div className="flex items-start gap-2.5 px-3.5 py-2.75" data-job-standing={standing}>
      {standingMark(standing)}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={`text-card-title ${TITLE_INK[standing]}`}>{job.title}</span>
        <span
          className={`text-detail ${standing === 'refused' ? 'text-danger-ink' : 'text-ink-secondary'}`}
        >
          {standing === 'refused' && refusal !== undefined ? refusal : job.note}
        </span>
      </span>
    </div>
  );
}
