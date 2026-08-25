import type { ReactNode } from 'react';

import type { SetupStep } from '../../model/setup-step';

import { SetupHeading } from '../setup-heading/setup-heading';
import { SetupProgress } from '../setup-progress/setup-progress';

/**
 * How wide the rail under the lede runs.
 *
 * @summary Every step that asks a question sets on one rail, so moving between them never shifts
 * the column. A step that draws rather than asks takes the wide rail, because a diagram cropped to
 * a question's column stops being a diagram.
 */
type SetupRail = 'question' | 'drawing';

const RAIL: Record<SetupRail, string> = {
  question: 'w-160',
  drawing: 'w-full',
};

type SetupStepFrameProps = {
  /** The step this frames, which names its heading and marks its beat. */
  step: SetupStep;
  /** The one line under the heading saying what the step is asking for. */
  lede: string;
  /** Leaves setup, which every step past the welcome offers. */
  onSkip: () => void;
  /** The step's own content, laid on the rail the frame sets. */
  children: ReactNode;
  /** The acts that settle the step, standing under the content. */
  acts: ReactNode;
  /** How wide the rail under the lede runs. */
  rail?: SetupRail;
};

/**
 * The shape every step past the welcome shares.
 *
 * @summary The dots, the heading and the lede sit at the same height on every step, so moving
 * between them reads as one surface changing its question rather than as separate screens. The
 * way out sits in the corner rather than in the act row, because leaving setup is not one of the
 * choices the step is offering.
 */
export function SetupStepFrame({
  step,
  lede,
  onSkip,
  children,
  acts,
  rail = 'question',
}: SetupStepFrameProps) {
  return (
    <div className="relative flex h-full flex-col items-center px-10 pt-33">
      <button
        className="absolute inset-e-8 top-6 rounded-control focus-ring px-1 text-caption text-ink-secondary hover:text-ink"
        onClick={onSkip}
        type="button"
      >
        Skip setup
      </button>
      <SetupProgress step={step} />
      <div className="mt-5 flex flex-col items-center gap-2">
        <SetupHeading step={step} />
        <p className="max-w-140 text-center text-body text-ink-secondary">{lede}</p>
      </div>
      <div className={`mt-6.5 ${RAIL[rail]}`}>{children}</div>
      <div className="mt-6 flex items-center gap-2.5">{acts}</div>
    </div>
  );
}
