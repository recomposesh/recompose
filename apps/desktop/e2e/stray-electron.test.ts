import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { strayElectronApps, sweptStrayElectron } from './stray-electron';

const checkout = '/checkouts/recompose';

const appRoot = `${checkout}/apps/desktop`;

const electronBinary = `${checkout}/node_modules/.pnpm/electron@43.2.0/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron`;

const loader = `${checkout}/node_modules/.pnpm/playwright-core@1.61.1/node_modules/playwright-core/lib/server/electron/loader.js`;

const launchedByTheSuite = `  4101  4101 ${electronBinary} -r ${loader} ${appRoot}`;

describe('the sweep that clears what an interrupted acceptance run left behind', () => {
  it('claims an application the suite launched from this checkout', () => {
    expect(strayElectronApps([launchedByTheSuite], appRoot)).toEqual([
      { pid: 4101, groupId: 4101 },
    ]);
  });

  it('leaves an installed application alone, however much its command says Electron', () => {
    const installed = [
      '  34316 34314 /Applications/Kimi.app/Contents/Frameworks/Electron Framework.framework/Helpers/chrome_crashpad_handler --no-rate-limit',
      '  51610 51609 /Applications/Pen.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework',
    ];

    expect(strayElectronApps(installed, appRoot)).toEqual([]);
  });

  it('leaves the app a developer is running from this same checkout alone', () => {
    const developerApp = `  2200  2200 ${electronBinary} ${appRoot}`;

    expect(strayElectronApps([developerApp], appRoot)).toEqual([]);
  });

  it('leaves another checkout of the same repository to sweep its own', () => {
    const elsewhere = launchedByTheSuite.replaceAll(checkout, '/checkouts/other-recompose');

    expect(strayElectronApps([elsewhere], appRoot)).toEqual([]);
  });

  it('leaves a checkout whose path merely starts with this one alone', () => {
    const neighbor = launchedByTheSuite.replaceAll(checkout, `${checkout}-2`);

    expect(strayElectronApps([neighbor], appRoot)).toEqual([]);
  });

  it('names the leader once, because its helpers fall with the group it heads', () => {
    const helper = `  4108  4101 ${electronBinary} --type=renderer --app-path=${appRoot}`;

    expect(strayElectronApps([launchedByTheSuite, helper], appRoot)).toEqual([
      { pid: 4101, groupId: 4101 },
    ]);
  });

  it('refuses a root that names no one checkout, which would reach every worktree at once', () => {
    expect(() => strayElectronApps([launchedByTheSuite], 'apps/desktop')).toThrow(/absolute/u);
  });

  it('reads nothing out of the blank line ps ends its listing on', () => {
    expect(strayElectronApps([launchedByTheSuite, '', '   '], appRoot)).toEqual([
      { pid: 4101, groupId: 4101 },
    ]);
  });
});

const LOADER_LEAF = 'node_modules/playwright-core/lib/server/electron/loader.js';

const STRANDS_A_CHILD = `
const { spawn } = require('node:child_process');
const kid = spawn(process.argv[1], process.argv.slice(2), { detached: true, stdio: 'ignore' });
kid.unref();
setInterval(() => {}, 1000);
`;

const NAMES_ITSELF_AND_WAITS = `
require('node:fs').writeFileSync(process.argv[1], String(process.pid));
setInterval(() => {}, 1000);
`;

function parentOf(pid: number): number | undefined {
  const listed = spawnSync('ps', ['-o', 'ppid=', '-p', String(pid)], { encoding: 'utf8' });
  const parent = Number(listed.stdout.trim());

  return listed.status === 0 && Number.isInteger(parent) ? parent : undefined;
}

function processListing(): string[] {
  return spawnSync('ps', ['-Ao', 'pid=,pgid=,args='], { encoding: 'utf8' }).stdout.split('\n');
}

async function settles(reads: () => boolean): Promise<boolean> {
  for (let look = 0; look < 100; look += 1) {
    if (reads()) {
      return true;
    }

    await new Promise((resume) => {
      setTimeout(resume, 50);
    });
  }

  return reads();
}

/**
 * The one path the sweep exists for, which a green suite never walks.
 *
 * @summary A suite that finishes tidily strands nothing, so it proves only that the sweep harms
 * nothing. This strands an application on purpose and kills its runner with `SIGKILL`, which is the
 * ending no handler can observe. The stand-in is a plain node process carrying the loader argument
 * and an application root on its command line, because the sweep reads `ps` output and knows
 * nothing about Electron. Its root is a temporary folder, so a suite running from this checkout at
 * the same time can never match it.
 */
describe('the sweep against an application a killed run left behind', () => {
  let sandbox: string | undefined;
  let stranded: number | undefined;

  afterEach(() => {
    if (stranded !== undefined && parentOf(stranded) !== undefined) {
      process.kill(-stranded, 'SIGKILL');
    }

    if (sandbox !== undefined) {
      rmSync(sandbox, { force: true, recursive: true });
    }

    stranded = undefined;
    sandbox = undefined;
  });

  it('ends the orphan, and leaves the run that follows nothing to trip over', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'recompose-sweep-'));

    const appRoot = join(sandbox, 'apps/desktop');
    const named = join(sandbox, 'stranded.pid');
    const runner = spawn(
      process.execPath,
      [
        '-e',
        STRANDS_A_CHILD,
        process.execPath,
        '-e',
        NAMES_ITSELF_AND_WAITS,
        named,
        join(appRoot, LOADER_LEAF),
        appRoot,
      ],
      { stdio: 'ignore' },
    );

    const namedItself = await settles(() => {
      const reading = spawnSync('cat', [named], { encoding: 'utf8' });

      return reading.status === 0 && reading.stdout.trim().length > 0;
    });

    expect(namedItself).toBe(true);

    stranded = Number(readFileSync(named, 'utf8').trim());

    process.kill(runner.pid ?? 0, 'SIGKILL');

    const orphaned = await settles(() => parentOf(stranded ?? 0) === 1);

    expect(orphaned).toBe(true);
    expect(strayElectronApps(processListing(), appRoot)).toEqual([
      { pid: stranded, groupId: stranded },
    ]);

    expect(sweptStrayElectron(appRoot)).toEqual([{ pid: stranded, groupId: stranded }]);

    const cleared = await settles(() => parentOf(stranded ?? 0) === undefined);

    expect(cleared).toBe(true);
    expect(strayElectronApps(processListing(), appRoot)).toEqual([]);
  });
});
