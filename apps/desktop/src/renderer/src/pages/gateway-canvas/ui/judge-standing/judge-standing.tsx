import type { Account } from '@recompose/contracts';
import type { ReactNode } from 'react';

import type { NodePlace } from '../../lib/judge-cooldown';

import { StatusChip } from '../../../../shared/ui';
import { useBackUpClockAt } from '../../lib/judge-cooldown';
import { factRow } from '../subject-shell/subject-shell';

type JudgeStandingProps = {
  /** The account paying for every classification, or nothing where it left the registry. */
  account: Account | undefined;
  /** Which judge this is: the gateway serving it, the model holding it, and the node itself. */
  place: NodePlace;
  /** The moment the reading is taken against, which only a story ever names. */
  now?: number | undefined;
};

/**
 * How the judge stands: bound, standing out of a cooldown, or holding an account that left.
 *
 * @summary An account that left the registry outranks a window, because the request it would have
 * decided lands on else from the first call and no waiting fixes it, while a cooling judge answers
 * again on its own.
 */
function judgeHealth(account: Account | undefined, backUpAt: string | undefined): ReactNode {
  if (account === undefined) {
    return <StatusChip tone="danger" word="Account left the registry" />;
  }

  return backUpAt === undefined ? (
    <StatusChip tone="positive" word="Bound" />
  ) : (
    <StatusChip tone="attention" word="Cooling" />
  );
}

/**
 * What the inspector says about a judge's health, and when a cooling one is expected back.
 *
 * @summary The window prints here rather than on the canvas, because a number ticking beside the
 * composition pulls the eye every second while the same fact read once in a panel costs nothing.
 * It is a clock time rather than a span for the same reason: a clock stays true however long the
 * drawer stands open, so nothing on screen has to keep it honest.
 */
export function JudgeStanding({ account, place, now = Date.now() }: JudgeStandingProps) {
  const backUpAt = useBackUpClockAt(place, now);

  return (
    <>
      {factRow('Standing', judgeHealth(account, backUpAt))}
      {backUpAt === undefined || account === undefined ? null : factRow('Back by', backUpAt)}
    </>
  );
}
