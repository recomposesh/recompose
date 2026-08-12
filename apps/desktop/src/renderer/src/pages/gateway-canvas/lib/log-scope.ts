import type { LogRow } from '@recompose/contracts';

import { requestFailed } from '../../../entities/request-log';

/** What stands selected on the canvas, which is the one thing the rows narrow to. */
export type LogSubject =
  | { kind: 'gateway' }
  | { kind: 'virtual-model'; modelId: string }
  | { kind: 'cable'; modelId: string }
  | { kind: 'target'; accountId: string }
  | { kind: 'ghost-target'; accountId: string }
  | { kind: 'draft' };

/**
 * Whether a request reached the target a selection stands for.
 *
 * @summary The canvas names a target by the account it holds today, and a sibling change renames
 * that identity as the account and the real model together. Every target and ghost-target
 * comparison reads through this one function, so the rename lands here rather than across the
 * predicate.
 */
function reachedTarget(row: LogRow, target: { accountId: string }): boolean {
  return row.accountId === target.accountId;
}

function everyRequest(): boolean {
  return true;
}

function subjectScope(subject: LogSubject): (row: LogRow) => boolean {
  if (subject.kind === 'virtual-model' || subject.kind === 'cable') {
    return (row) => row.virtualModel === subject.modelId;
  }

  if (subject.kind === 'target' || subject.kind === 'ghost-target') {
    return (row) => reachedTarget(row, subject);
  }

  return everyRequest;
}

/**
 * The rows one canvas selection leaves standing, narrowed again while the errors toggle holds.
 *
 * @summary The gateway and a draft show every request, a virtual model and the cable that binds it
 * show what passed through that model, and a target and the ghost it leaves behind show what
 * reached that identity. A selection this function does not recognize shows everything rather than
 * nothing, so a subject kind that arrives later reads as too much history instead of an empty lie.
 * The errors toggle stands apart from the selection and only ever takes requests away.
 */
export function logScope(subject: LogSubject, errorsOnly: boolean): (row: LogRow) => boolean {
  const scope = subjectScope(subject);

  return errorsOnly ? (row) => scope(row) && requestFailed(row) : scope;
}
