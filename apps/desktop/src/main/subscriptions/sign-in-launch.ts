import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { chmod, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type SignInLaunch = (command: string) => Promise<void>;

const WINDOW_MARK = 'recompose sign-in';

const linuxTerminals = ['x-terminal-emulator', 'gnome-terminal', 'konsole', 'xterm'];

async function detached(
  binary: string,
  argv: readonly string[],
  env?: Record<string, string>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, [...argv], {
      detached: true,
      stdio: 'ignore',
      ...(env === undefined ? {} : { env: { ...process.env, ...env } }),
    });

    child.once('error', reject);
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}

/**
 * The script a terminal runs, which tidies itself away only once the tool left cleanly.
 *
 * @operation Closing the window whatever happened takes the tool's own last words with it, and a
 * tool that refused in its first second reads to a person as a terminal that never opened. A
 * refusal keeps the window and says to close it by hand, so whatever the tool printed can be read.
 */
function signInScript(command: string): string {
  return [
    '#!/bin/zsh',
    `printf '\\033]0;${WINDOW_MARK}\\007'`,
    'SIGNIN_TTY="$(tty)"',
    'clear',
    command,
    'SIGNIN_STATUS=$?',
    'rm -f "$0"',
    'if [ "$SIGNIN_STATUS" -ne 0 ]; then',
    `  printf '\\n${WINDOW_MARK}: the tool exited with %s. Close this window when you have read the message above.\\n' "$SIGNIN_STATUS"`,
    '  exit "$SIGNIN_STATUS"',
    'fi',
    'if [ "$TERM_PROGRAM" = "Apple_Terminal" ]; then',
    '  nohup osascript -e "tell application \\"Terminal\\"',
    'repeat with w in windows',
    'try',
    'if (tty of tabs of w) contains \\"$SIGNIN_TTY\\" then close w saving no',
    'end try',
    'end repeat',
    'end tell" > /dev/null 2>&1 &',
    'fi',
    '',
  ].join('\n');
}

/**
 * Runs `open` to the end and carries out on anything but a clean exit.
 *
 * @operation Every other launcher on this file is the terminal itself and stays alive, so starting
 * it is the whole of the news. `open` is a dispatcher that exits the moment it has handed the file
 * to LaunchServices, and it reports a refusal there rather than by failing to start. Waiting for
 * that exit is the only way a person hears that no terminal opened, instead of watching a dialog
 * wait forever on a sign-in nothing was ever asked to run.
 */
async function openThroughLaunchServices(script: string): Promise<void> {
  const complaint = await new Promise<string | null>((resolve, reject) => {
    const child = spawn('open', [script], { stdio: ['ignore', 'ignore', 'pipe'] });
    let said = '';

    child.stderr.on('data', (chunk: Buffer) => {
      said += chunk.toString();
    });

    child.once('error', reject);
    child.once('close', (code) => {
      resolve(code === 0 ? null : said.trim() || `open exited with ${String(code)}`);
    });
  });

  if (complaint !== null) {
    throw new Error(`no terminal opened for the sign-in: ${complaint}`);
  }
}

/**
 * LaunchServices decides which terminal opens a .command file, which is the one place macOS
 * lets a person choose their terminal, and `open` brings that terminal to the front.
 */
async function openTheMacTerminal(command: string): Promise<void> {
  const script = join(tmpdir(), `recompose-sign-in-${randomUUID()}.command`);

  await writeFile(script, signInScript(command), { mode: 0o700 });
  await chmod(script, 0o700);
  await openThroughLaunchServices(script);
}

async function openALinuxTerminal(command: string): Promise<void> {
  for (const terminal of linuxTerminals) {
    try {
      await detached(terminal, ['-e', 'sh', '-c', command]);

      return;
    } catch {
      continue;
    }
  }

  throw new Error(`no terminal emulator on this machine could run ${command}`);
}

async function runOverride(
  platform: NodeJS.Platform,
  launcher: string,
  command: string,
): Promise<void> {
  if (platform === 'win32') {
    const batch = /\.(?:cmd|bat)$/iu.test(launcher);

    await detached(batch ? 'cmd.exe' : launcher, batch ? ['/c', launcher] : [], {
      RECOMPOSE_SIGN_IN_COMMAND: command,
    });

    return;
  }

  await detached(launcher, [command]);
}

export function terminalSignInLaunch(
  platform: NodeJS.Platform,
  launcherOverride: string | null,
): SignInLaunch {
  return async (command) => {
    if (launcherOverride !== null) {
      await runOverride(platform, launcherOverride, command);

      return;
    }

    if (platform === 'darwin') {
      await openTheMacTerminal(command);

      return;
    }

    if (platform === 'win32') {
      await detached('cmd.exe', ['/c', 'start', '', 'powershell', '-Command', command]);

      return;
    }

    await openALinuxTerminal(command);
  };
}
