import { describe, expect, it } from 'vitest';

import { strayElectronApps } from './stray-electron';

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
