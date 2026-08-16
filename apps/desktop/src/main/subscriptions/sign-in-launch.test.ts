import { describe, expect, test, vi } from 'vitest';

import { terminalSignInLaunch } from './sign-in-launch';

type SpawnCall = { binary: string; argv: string[]; env?: Record<string, string> };

type WrittenFile = { path: string; content: string };

const spawned = vi.hoisted(() => {
  const calls: SpawnCall[] = [];

  return { calls, exitCode: 0, said: '' };
});

const written = vi.hoisted(() => {
  const files: WrittenFile[] = [];

  return { files };
});

vi.mock('node:child_process', () => ({
  spawn: (binary: string, argv: string[], options?: { env?: Record<string, string> }) => {
    spawned.calls.push({
      binary,
      argv,
      ...(options?.env === undefined ? {} : { env: options.env }),
    });

    return {
      unref: () => undefined,
      stderr: {
        on: (event: string, listener: (chunk: Buffer) => void) => {
          if (event === 'data' && spawned.said !== '') {
            setTimeout(() => {
              listener(Buffer.from(spawned.said));
            }, 0);
          }
        },
      },
      once: (event: string, listener: (code?: number) => void) => {
        if (event === 'spawn') {
          setTimeout(listener, 0);
        }

        if (event === 'close') {
          setTimeout(() => {
            listener(spawned.exitCode);
          }, 1);
        }
      },
    };
  },
}));

vi.mock('node:fs/promises', () => ({
  writeFile: async (path: string, content: string) => {
    written.files.push({ path, content });

    return Promise.resolve();
  },
  chmod: async () => Promise.resolve(),
}));

function freshLaunch(exitCode = 0, said = ''): void {
  spawned.calls.length = 0;
  written.files.length = 0;
  spawned.exitCode = exitCode;
  spawned.said = said;
}

describe('handing the sign-in to a terminal on macOS', () => {
  test('the command runs from a .command file, so the terminal a person chose opens it', async () => {
    freshLaunch();

    await terminalSignInLaunch('darwin', null)('claude /login');

    const script = written.files[0];

    expect(script?.path).toMatch(/\.command$/);
    expect(script?.content).toContain('claude /login');
    expect(spawned.calls).toEqual([{ binary: 'open', argv: [script?.path] }]);
  });

  test('the window closes itself once the tool finishes, found by its tty, not its title', async () => {
    freshLaunch();

    await terminalSignInLaunch('darwin', null)('claude /login');

    const content = written.files[0]?.content ?? '';

    expect(content).toContain('rm -f "$0"');
    expect(content).toContain('SIGNIN_TTY="$(tty)"');
    expect(content).toContain(
      'if (tty of tabs of w) contains \\"$SIGNIN_TTY\\" then close w saving no',
    );
  });

  test('an override launcher takes the command whole, so end-to-end runs open no terminal', async () => {
    freshLaunch();

    await terminalSignInLaunch('darwin', '/tmp/fake-launcher')('claude /login');

    expect(written.files).toEqual([]);
    expect(spawned.calls).toEqual([{ binary: '/tmp/fake-launcher', argv: ['claude /login'] }]);
  });
  test('a refused open carries out, so no dialog waits on a terminal that never opened', async () => {
    freshLaunch(1, 'Unable to find application named Terminal');

    await expect(terminalSignInLaunch('darwin', null)('claude /login')).rejects.toThrow(
      'Unable to find application named Terminal',
    );

    freshLaunch();
  });

  test('the window stays open on a refusal, so the tool keeps its last words on screen', async () => {
    freshLaunch();

    await terminalSignInLaunch('darwin', null)('claude /login');

    const script = written.files[0]?.content ?? '';

    expect(script).toContain('SIGNIN_STATUS=$?');
    expect(script.indexOf('if [ "$SIGNIN_STATUS" -ne 0 ]')).toBeLessThan(
      script.indexOf('$TERM_PROGRAM'),
    );
  });
});

describe('handing the sign-in to an override launcher on Windows', () => {
  const composite = '$env:CLAUDE_CONFIG_DIR="C:\\a b\\pending"; claude login';

  test('a .cmd override runs through cmd.exe, because Node will not spawn a batch file itself', async () => {
    spawned.calls.length = 0;

    await terminalSignInLaunch('win32', 'C:\\fakes\\sign-in-launcher.cmd')(composite);

    const call = spawned.calls[0];

    expect(call?.binary).toBe('cmd.exe');
    expect(call?.argv).toEqual(['/c', 'C:\\fakes\\sign-in-launcher.cmd']);
  });

  test('the command travels in the environment, so cmd.exe never has to quote it', async () => {
    spawned.calls.length = 0;

    await terminalSignInLaunch('win32', 'C:\\fakes\\sign-in-launcher.cmd')(composite);

    expect(spawned.calls[0]?.env?.['RECOMPOSE_SIGN_IN_COMMAND']).toBe(composite);
    expect(spawned.calls[0]?.argv).not.toContain(composite);
  });

  test('an .exe override runs directly, still handed the command through the environment', async () => {
    spawned.calls.length = 0;

    await terminalSignInLaunch('win32', 'C:\\fakes\\launcher.exe')(composite);

    const call = spawned.calls[0];

    expect(call?.binary).toBe('C:\\fakes\\launcher.exe');
    expect(call?.argv).toEqual([]);
    expect(call?.env?.['RECOMPOSE_SIGN_IN_COMMAND']).toBe(composite);
  });
});
