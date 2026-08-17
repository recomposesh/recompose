export const RELEASE_FEED = 'https://github.com/recomposesh/recompose/releases';

type UpdateOperation = 'check' | 'download' | 'install';

export type UpdaterLogger = {
  info: (message?: unknown) => void;
  warn: (message?: unknown) => void;
  error: (message?: unknown) => void;
  debug: (message: string) => void;
};

export type UpdateLog = {
  logger: UpdaterLogger;
  failed: (operation: UpdateOperation, reason: string) => void;
};

/**
 * One writer for everything the updater has to say.
 *
 * @summary The updater's error object never carries the feed it tried, so every error line appends
 * the address from here. That is what makes the spec's "the log carries the reason and the feed"
 * an invariant of this module rather than a hope about upstream messages.
 */
export function updateLogFor(feedAddress: string): UpdateLog {
  const withFeed = (line: string) => `${line} (feed: ${feedAddress})`;

  return {
    logger: {
      info: (message) => {
        console.info(`updater: ${String(message)}`);
      },
      warn: (message) => {
        console.warn(`updater: ${String(message)}`);
      },
      error: (message) => {
        console.warn(withFeed(`updater error: ${String(message)}`));
      },
      debug: () => undefined,
    },
    failed: (operation, reason) => {
      console.warn(withFeed(`update ${operation} failed: ${reason}`));
    },
  };
}
