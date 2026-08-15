import { join } from 'node:path';

import { sweptStrayElectron } from './stray-electron';

const appRoot = join(__dirname, '..');

/**
 * Clears what a previous run left behind, before this one launches anything.
 *
 * @summary Runs on the way in rather than on the way out, because the run that strands an
 * application is the run that was killed, and a killed run executes no teardown of its own. Says
 * what it ended, so a developer who sees a window vanish reads why here rather than guessing.
 */
export default function sweepBeforeTheRun(): void {
  for (const stray of sweptStrayElectron(appRoot)) {
    process.stdout.write(
      `Ended process ${String(stray.pid)}, an application a previous run left behind.\n`,
    );
  }
}
