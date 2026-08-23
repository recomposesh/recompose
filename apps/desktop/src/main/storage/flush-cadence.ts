const FLUSH_QUIET_MS = 3_000;

const FLUSH_CEILING_MS = 30_000;

export type FlushCadence = {
  watchForQuiet: () => void;
  stopWatching: () => void;
};

/**
 * The cadence a stored document reaches the disk on, once its store answers reads from memory.
 *
 * @summary One cadence serves every such store: a few quiet seconds after the last change, and a
 * hard ceiling so sustained change still lands. Writing on each change would put a file write in
 * front of traffic that settles hundreds of times a minute, and the ceiling is what stops a busy
 * stretch from postponing the write forever.
 */
export function flushingWhenQuiet(flush: () => void): FlushCadence {
  let quiet: ReturnType<typeof setTimeout> | null = null;
  let ceiling: ReturnType<typeof setTimeout> | null = null;

  const stopWatching = (): void => {
    clearTimeout(quiet ?? undefined);
    clearTimeout(ceiling ?? undefined);
    quiet = null;
    ceiling = null;
  };

  const fire = (): void => {
    stopWatching();
    flush();
  };

  return {
    watchForQuiet: () => {
      clearTimeout(quiet ?? undefined);
      quiet = setTimeout(fire, FLUSH_QUIET_MS);
      ceiling ??= setTimeout(fire, FLUSH_CEILING_MS);
    },
    stopWatching,
  };
}
