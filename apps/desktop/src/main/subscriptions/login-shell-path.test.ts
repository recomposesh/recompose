import { chmod, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { loginShellPath, pathHeldBriefly } from './login-shell-path';

const environmentPath = '/usr/bin:/bin';

const spawnsALoginShell = process.platform !== 'win32';

async function aLoginShellRunning(body: string): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), 'recompose-login-shell-'));
  const shell = join(folder, 'fake-login-shell');

  await writeFile(shell, `#!/bin/sh\n${body}\n`, 'utf8');
  await chmod(shell, 0o755);

  return shell;
}

const delimiter = '_SHELL_ENV_DELIMITER_';

function reportOf(lines: string): string {
  return `printf %s '${delimiter}'; cat <<REPORT\n${lines}\nREPORT\nprintf %s '${delimiter}'`;
}

async function aLoginShellReporting(report: string): Promise<string> {
  return aLoginShellRunning(reportOf(report));
}

async function pathProbed(shell: string | undefined, boundMs = 5000): Promise<string> {
  return loginShellPath({ shell, environmentPath, platform: 'linux', boundMs });
}

describe('reading the search path a login shell carries', () => {
  test.skipIf(!spawnsALoginShell)(
    'given a login shell that reports its environment, the probe answers the path it carries',
    async () => {
      const shell = await aLoginShellReporting('HOME=/home/ada\nPATH=/opt/tools/bin:/usr/bin');

      await expect(pathProbed(shell)).resolves.toBe('/opt/tools/bin:/usr/bin');
    },
  );

  test.skipIf(!spawnsALoginShell)(
    'given a shell that carries a different path outside an interactive login, the probe asks for the interactive login one',
    async () => {
      const shell = await aLoginShellRunning(
        `if [ "$1" = "-ilc" ]; then ${reportOf('PATH=/from-an-interactive-login-shell')}; else ${reportOf('PATH=/from-a-plain-shell')}; fi`,
      );

      await expect(pathProbed(shell)).resolves.toBe('/from-an-interactive-login-shell');
    },
  );

  test.skipIf(!spawnsALoginShell)(
    'given a login shell that greets before it reports, the greeting never stands in for the environment',
    async () => {
      const shell = await aLoginShellRunning(
        `echo "PATH=/from-a-greeting"; printf %s '${delimiter}'; echo "PATH=/from-the-environment"; printf %s '${delimiter}'`,
      );

      await expect(pathProbed(shell)).resolves.toBe('/from-the-environment');
    },
  );

  test.skipIf(!spawnsALoginShell)(
    'given a shell whose plugin manager would stop to update itself, the probe asks it not to',
    async () => {
      const shell = await aLoginShellReporting('PATH=/asked-not-to-update-$DISABLE_AUTO_UPDATE');

      await expect(pathProbed(shell)).resolves.toBe('/asked-not-to-update-true');
    },
  );
});

describe('falling back to the path this process already runs under', () => {
  test.skipIf(!spawnsALoginShell)(
    'given a login shell that names no path, the process environment path stands',
    async () => {
      const shell = await aLoginShellReporting('HOME=/home/ada\nMANPATH=/usr/share/man');

      await expect(pathProbed(shell)).resolves.toBe(environmentPath);
    },
  );

  test.skipIf(!spawnsALoginShell)(
    'given a login shell reporting a blank path, the process environment path stands',
    async () => {
      const shell = await aLoginShellReporting('PATH=');

      await expect(pathProbed(shell)).resolves.toBe(environmentPath);
    },
  );

  test.skipIf(!spawnsALoginShell)(
    'given a login shell that hangs past the bound, the process environment path stands',
    async () => {
      const shell = await aLoginShellRunning('sleep 30');

      await expect(pathProbed(shell, 100)).resolves.toBe(environmentPath);
    },
  );

  test.skipIf(!spawnsALoginShell)(
    'given a login shell whose profile breaks, the process environment path stands',
    async () => {
      const shell = await aLoginShellRunning('exit 1');

      await expect(pathProbed(shell)).resolves.toBe(environmentPath);
    },
  );

  test.skipIf(!spawnsALoginShell)(
    'given a shell that answers without the marks the probe asked for, the process environment path stands',
    async () => {
      const shell = await aLoginShellRunning('echo "PATH=/from-an-unmarked-answer"');

      await expect(pathProbed(shell)).resolves.toBe(environmentPath);
    },
  );

  test.skipIf(!spawnsALoginShell)(
    'given a shell cut off part way through its report, the process environment path stands',
    async () => {
      const shell = await aLoginShellRunning(
        `printf %s '${delimiter}'; echo "PATH=/from-a-report-that-never-finished"`,
      );

      await expect(pathProbed(shell)).resolves.toBe(environmentPath);
    },
  );

  test('given a machine naming no login shell, the process environment path stands', async () => {
    await expect(pathProbed(undefined)).resolves.toBe(environmentPath);
    await expect(pathProbed('')).resolves.toBe(environmentPath);
  });
});

describe('the machines the probe never asks at all', () => {
  test('given Windows, no shell is asked even when one would answer', async () => {
    const shell = await aLoginShellReporting('PATH=/from-a-shell-that-should-never-run');

    const answered = await loginShellPath({
      shell,
      environmentPath: 'C:\\tools;C:\\Windows',
      platform: 'win32',
      boundMs: 5000,
    });

    expect(answered).toBe('C:\\tools;C:\\Windows');
  });
});

function aShellAskedFor(answers: string[]): { ask: () => Promise<string>; asked: () => number } {
  let asked = 0;

  return {
    ask: async () => {
      const answer = answers[Math.min(asked, answers.length - 1)] ?? '';

      asked += 1;

      return Promise.resolve(answer);
    },
    asked: () => asked,
  };
}

describe('holding one reading of the search path for a short while', () => {
  test('given two readings inside the hold, the shell is asked once', async () => {
    const shell = aShellAskedFor(['/first', '/second']);
    let nowMs = 1_000;
    const held = pathHeldBriefly({ ask: shell.ask, nowMs: () => nowMs, holdMs: 10_000 });

    await expect(held()).resolves.toBe('/first');
    nowMs += 9_999;
    await expect(held()).resolves.toBe('/first');
    expect(shell.asked()).toBe(1);
  });

  test('given a reading once the hold has passed, the shell is asked again', async () => {
    const shell = aShellAskedFor(['/before', '/after']);
    let nowMs = 1_000;
    const held = pathHeldBriefly({ ask: shell.ask, nowMs: () => nowMs, holdMs: 10_000 });

    await expect(held()).resolves.toBe('/before');
    nowMs += 10_000;
    await expect(held()).resolves.toBe('/after');
    expect(shell.asked()).toBe(2);
  });

  test('given two readings that overlap in flight, the shell is asked once', async () => {
    const shell = aShellAskedFor(['/only']);
    const held = pathHeldBriefly({ ask: shell.ask, nowMs: () => 1_000, holdMs: 10_000 });

    await expect(Promise.all([held(), held()])).resolves.toEqual(['/only', '/only']);
    expect(shell.asked()).toBe(1);
  });
});

describe('asking the shell again once a reading refuses', () => {
  test('given an ask that refuses, the next reading asks again', async () => {
    let asked = 0;
    const held = pathHeldBriefly({
      ask: async () => {
        asked += 1;

        if (asked === 1) {
          throw new Error('the shell never answered');
        }

        return Promise.resolve('/second-time');
      },
      nowMs: () => 1_000,
      holdMs: 10_000,
    });

    await expect(held()).rejects.toThrow('the shell never answered');
    await expect(held()).resolves.toBe('/second-time');
  });

  test('given a refusal that lands after a later reading, the later reading still stands', async () => {
    let refuseTheFirst: (why: Error) => void = () => undefined;
    let asked = 0;
    let nowMs = 1_000;
    const held = pathHeldBriefly({
      ask: async () => {
        asked += 1;

        return asked === 1
          ? new Promise<string>((_, refuse) => {
              refuseTheFirst = refuse;
            })
          : Promise.resolve('/the-later-reading');
      },
      nowMs: () => nowMs,
      holdMs: 10_000,
    });

    const first = held();

    nowMs += 10_000;

    const later = held();

    refuseTheFirst(new Error('the first reading never answered'));

    await expect(first).rejects.toThrow('the first reading never answered');
    await expect(later).resolves.toBe('/the-later-reading');
    await expect(held()).resolves.toBe('/the-later-reading');
    expect(asked).toBe(2);
  });
});
