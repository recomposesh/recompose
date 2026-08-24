/**
 * One document's writes, taken one at a time in the order they were asked for.
 *
 * @summary Two flushes of one document overlap easily: the quiet cadence fires while a gateway
 * state change asks for its own, and both await the disk. Left to race, the slower one renames its
 * older snapshot over the newer, and the bookkeeping that says what reached the disk then names a
 * write that lost. Queueing is what makes the last rename the newest snapshot.
 *
 * A write that refuses never blocks the queue, because the next write carries everything the failed
 * one owed and refusing twice is better than never writing again.
 */
export function writingInTurn(write: () => Promise<void>): () => Promise<void> {
  let standing: Promise<void> = Promise.resolve();

  return async () => {
    const queued = standing.catch(() => undefined).then(write);

    standing = queued;

    return queued;
  };
}
