import { spawnSync } from 'node:child_process';
import { isAbsolute } from 'node:path';

/**
 * The flag Playwright hands the application it launches, which nothing else passes.
 *
 * @summary What tells a suite's application apart from every other Electron on the machine. The
 * executable path can't: `pnpm dev` runs the same binary out of the same checkout, so a sweep that
 * matched on it would end the app a developer is looking at. The window title and the process name
 * can't either, because both read `Electron` for every Electron ever built. Playwright loads this
 * file into the main process to open its control channel, so the argument stands on the command
 * line of a launched application and on no other.
 */
const PLAYWRIGHT_ELECTRON_LOADER = 'playwright-core/lib/server/electron/loader.js';

const LISTED_PROCESS = /^\s*(?<pid>\d+)\s+(?<groupId>\d+)\s+(?<command>.+)$/u;

/** An application left running, named by the process group it heads. */
export type StrayApp = {
  pid: number;
  groupId: number;
};

type ListedProcess = StrayApp & { command: string };

function listedProcess(line: string): ListedProcess | undefined {
  const read = LISTED_PROCESS.exec(line)?.groups;

  return read === undefined
    ? undefined
    : {
        pid: Number(read['pid']),
        groupId: Number(read['groupId']),
        command: String(read['command']),
      };
}

/**
 * The applications in a process listing that this checkout's acceptance suite launched.
 *
 * @summary Reads `ps` output rather than a file the suite writes, because the run that leaves an
 * application behind is the run that died before it could write anything down. The application
 * root rather than the checkout root decides which listing lines belong to this suite, so that a
 * worktree at `recompose` never claims one at `recompose-2`, whose path starts with the same text.
 * That root has to be absolute, and this refuses anything else rather than sweeping wider than the
 * caller meant: a relative `apps/desktop` matches the launch of every worktree on the machine.
 */
export function strayElectronApps(processLines: readonly string[], appRoot: string): StrayApp[] {
  if (!isAbsolute(appRoot)) {
    throw new Error(`a sweep scopes itself by an absolute application root, and got '${appRoot}'`);
  }

  return processLines.flatMap((line) => {
    const listed = listedProcess(line);

    if (
      listed === undefined ||
      !listed.command.includes(PLAYWRIGHT_ELECTRON_LOADER) ||
      !listed.command.includes(appRoot)
    ) {
      return [];
    }

    return [{ pid: listed.pid, groupId: listed.groupId }];
  });
}

function alreadyGone(ending: unknown): boolean {
  return ending instanceof Error && 'code' in ending && ending.code === 'ESRCH';
}

function endApp({ pid, groupId }: StrayApp): void {
  try {
    process.kill(pid === groupId ? -groupId : pid, 'SIGKILL');
  } catch (ending) {
    if (!alreadyGone(ending)) {
      throw ending;
    }
  }
}

/**
 * Ends the applications a previous acceptance run left behind, and names what it ended.
 *
 * @summary Playwright launches an application detached, so it heads its own process group, and its
 * own handlers close it on every ending a process can observe. A `SIGKILL` or a hard crash is not
 * one of those, and what survives holds the worker's user data folder and its loopback ports, which
 * is what a later run trips over. Nothing inside the dead run can clean that up, so the next run
 * does it on the way in. A listing this machine refuses to produce means nothing to sweep.
 */
export function sweptStrayElectron(appRoot: string): StrayApp[] {
  const listing = spawnSync('ps', ['-Ao', 'pid=,pgid=,args='], { encoding: 'utf8' });

  if (listing.status !== 0) {
    return [];
  }

  const strays = strayElectronApps(listing.stdout.split('\n'), appRoot);

  for (const stray of strays) {
    endApp(stray);
  }

  return strays;
}
