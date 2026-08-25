import type { SetupStep } from '../../model/setup-step';

import { beatOf, SETUP_BEATS } from '../../model/setup-beat';

type SetupProgressProps = {
  /** The step setup stands on, which decides which beat the count marks. */
  step: SetupStep;
};

function toneFor(index: number, standingAt: number): string {
  if (index === standingAt) {
    return 'w-5.5 bg-ink/56';
  }

  return index < standingAt ? 'w-1.75 bg-ink/40' : 'w-1.75 bg-ink/14';
}

/**
 * How far through setup a person stands, counted in turns rather than in screens.
 *
 * @summary Exactly one dot carries `aria-current`, so a screen reader hears which turn is the
 * current one rather than counting shapes. The list is named, because five unlabelled dots
 * announce as nothing a person can act on.
 */
export function SetupProgress({ step }: SetupProgressProps) {
  const beat = beatOf(step);
  const standingAt = beat === null ? -1 : SETUP_BEATS.indexOf(beat);

  return (
    <ol aria-label="Setup progress" className="flex items-center gap-1.75">
      {SETUP_BEATS.map((named, index) => (
        <li
          aria-current={index === standingAt ? 'step' : undefined}
          className={`h-1.75 rounded-full ${toneFor(index, standingAt)}`}
          key={named}
        >
          <span className="sr-only">{named}</span>
        </li>
      ))}
    </ol>
  );
}
