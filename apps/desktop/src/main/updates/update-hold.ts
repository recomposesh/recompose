import type { UpdateCheck, UpdateState } from '@recompose/contracts';

import { nextUpdateState, type UpdaterSignal } from './update-standing';

export type HeardUpdate = { check?: UpdateCheck; signal?: UpdaterSignal };

export type UpdateHold = {
  state: () => UpdateState;
  asking: () => boolean;
  /** Starts a check for the person, answering false where one already stands. */
  ask: () => boolean;
  hear: (word: HeardUpdate) => void;
};

function reported(standing: UpdateState, check: UpdateCheck | undefined): UpdateState {
  if (check === undefined) {
    return standing;
  }

  if (standing.standing === 'quiet') {
    return { standing: 'quiet', check };
  }

  if (standing.standing === 'downloading') {
    return { standing: 'downloading', version: standing.version, check };
  }

  return { standing: 'ready', version: standing.version, check };
}

function reportKey(check: UpdateCheck): string {
  if (check.standing === 'found') {
    return `found:${check.version}`;
  }

  if (check.standing === 'failed') {
    return `failed:${check.reason}`;
  }

  return check.standing;
}

function sameReport(word: UpdateCheck, held: UpdateCheck | undefined): boolean {
  return held !== undefined && reportKey(word) === reportKey(held);
}

/**
 * What the report reads after one word, which a restatement of it never disturbs.
 *
 * @summary electron-updater answers a failed check twice, emitting `error` and then rethrowing out
 * of `checkForUpdates`, so the second word always lands after the ask has closed. Clearing on any
 * unasked word would erase the person's own report on the tick it appeared. A word that restates
 * the report already held is that second answer, so it changes nothing, and every word carrying
 * genuinely newer news still clears the report the way record 0200 asks.
 */
function checkAfter(
  word: HeardUpdate,
  asking: boolean,
  held: UpdateCheck | undefined,
): UpdateCheck | undefined {
  if (asking) {
    return word.check ?? held;
  }

  return word.check !== undefined && sameReport(word.check, held) ? held : undefined;
}

/**
 * Holds where the app stands against the feed and how the asked-for check is going.
 *
 * @summary The standing and the report stay two values, and only the standing ever reaches the
 * fold. That is what keeps a check nobody asked for from surfacing anything the log already
 * carries: a report exists only while somebody waits on one, and the next unasked signal clears
 * it (record 0200).
 */
export function holdUpdateState(push: (state: UpdateState) => void): UpdateHold {
  let standing: UpdateState = { standing: 'quiet' };
  let check: UpdateCheck | undefined;
  let asking = false;

  const stateNow = (): UpdateState => reported(standing, check);

  const pushedOnMovement = (
    heldStanding: UpdateState,
    heldCheck: UpdateCheck | undefined,
  ): void => {
    if (standing !== heldStanding || check !== heldCheck) {
      push(stateNow());
    }
  };

  return {
    state: stateNow,
    asking: () => asking,
    ask: () => {
      if (asking) {
        return false;
      }

      asking = true;
      check = { standing: 'asking' };
      push(stateNow());

      return true;
    },
    hear: (word) => {
      const heldStanding = standing;
      const heldCheck = check;

      if (word.signal !== undefined) {
        standing = nextUpdateState(standing, word.signal);
      }

      check = checkAfter(word, asking, check);
      asking = asking && word.check === undefined;

      pushedOnMovement(heldStanding, heldCheck);
    },
  };
}
