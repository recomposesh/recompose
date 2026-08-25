/** One piece of work the build run carries out, as its row reads. */
export type SetupJob = {
  /** What keeps this row apart from every other. */
  id: string;
  /** What the row reads as. */
  title: string;
  /** The quiet line under it, which says what the job touched. */
  note: string;
};

/** An account the sources step already recorded, as the run reports it. */
export type RecordedAccount = { id: string; title: string; note: string };

/** How far a run has got, and what stopped it where it stands. */
export type RunStanding = {
  /** Which job the run stands on, counting from the first. */
  at: number;
  /** Why the job it stands on refused, or nothing while it is still working. */
  refusal: string | undefined;
};

/** How one job reads. */
export type JobStanding = 'finished' | 'running' | 'refused' | 'waiting';

const COUNTED = ['no', 'one', 'two', 'three', 'four'] as const;

function acrossReads(sources: number): string {
  if (sources === 1) {
    return 'Round-robin over your one source';
  }

  return `Round-robin across your ${COUNTED[sources] ?? String(sources)} sources`;
}

/**
 * Every job the run carries out, in the order it carries them.
 *
 * @summary The accounts stand first and already finished, because marking them on the step before
 * is what recorded them. A run that opened with them still waiting would ask a person to watch
 * work they already did.
 */
export function jobsFor(
  recorded: readonly RecordedAccount[],
  modelId: string,
  sources: number,
): readonly SetupJob[] {
  return [
    ...recorded.map((account) => ({ id: account.id, title: account.title, note: account.note })),
    { id: 'gateway', title: 'Creating your gateway', note: 'A local address nothing else holds' },
    {
      id: 'virtual-model',
      title: `Composing ${modelId}`,
      note: acrossReads(sources),
    },
  ];
}

/**
 * How one job reads, given where the run stands.
 *
 * @summary A refusal marks only the job it happened on. Everything under it stays waiting rather
 * than reading as skipped, because the run never reached them and a row claiming otherwise would
 * be inventing an outcome.
 */
export function standingOf(run: RunStanding, index: number): JobStanding {
  if (index < run.at) {
    return 'finished';
  }

  if (index > run.at) {
    return 'waiting';
  }

  return run.refusal === undefined ? 'running' : 'refused';
}

/** The line under the heading, which changes when a job refuses. */
export function runReads(run: RunStanding): string {
  return run.refusal === undefined
    ? 'A few seconds. Each of these becomes a card on the canvas.'
    : 'One step refused. Nothing you already connected is lost.';
}
