import { execFile } from 'node:child_process';

export const WAITS_FOR_THE_PERSON = 0;

const windowsScriptSuffixes = ['.cmd', '.bat'];

const shellMetacharacters = /["&|<>^%!\r\n]/;

/**
 * Whether a file can only be run by handing it to a shell.
 *
 * @summary Node refuses to execute a `.cmd` or `.bat` directly, which is its answer to
 * CVE-2024-27980, and Claude Code installs on Windows as `claude.cmd`. A search that resolves one
 * of those therefore hands back a file that would otherwise fail to start at all.
 */
export function runsOnlyThroughAShell(command: string, platform: NodeJS.Platform): boolean {
  return (
    platform === 'win32' &&
    windowsScriptSuffixes.some((suffix) => command.toLowerCase().endsWith(suffix))
  );
}

/** How a command reaches the operating system, once the shell it may need is accounted for. */
export type CommandHandoff =
  | { verdict: 'direct' }
  | { verdict: 'through-a-shell'; quoted: string }
  | { verdict: 'refused'; because: string };

/**
 * What a command is handed to, and whether it may be handed over at all.
 *
 * @summary Going through a shell means the shell parses the whole line, and the tool's path comes
 * from the machine's search path rather than from this codebase. A directory named with a quote
 * would close the quoting around the path and leave whatever follows reading as a second command.
 * Nothing legitimate carries these characters, so a name holding one is refused rather than
 * escaped: escaping invites a reader to trust the escaping.
 */
export function handoffFor(
  command: string,
  args: readonly string[],
  platform: NodeJS.Platform,
): CommandHandoff {
  if (!runsOnlyThroughAShell(command, platform)) {
    return { verdict: 'direct' };
  }

  const readByTheShell = [command, ...args].find((word) => shellMetacharacters.test(word));

  if (readByTheShell !== undefined) {
    return {
      verdict: 'refused',
      because: `refused to start ${command}, because ${readByTheShell} carries a character the shell reads as its own`,
    };
  }

  return { verdict: 'through-a-shell', quoted: `"${command}"` };
}

export async function runCommand(
  command: string,
  args: readonly string[],
  boundMs: number,
): Promise<string> {
  const handoff = handoffFor(command, args, process.platform);

  if (handoff.verdict === 'refused') {
    throw new Error(handoff.because);
  }

  const shell = handoff.verdict === 'through-a-shell';

  return new Promise((carry, refuse) => {
    execFile(
      handoff.verdict === 'through-a-shell' ? handoff.quoted : command,
      args,
      { encoding: 'utf8', timeout: boundMs, windowsHide: true, shell },
      (failure, stdout) => {
        if (failure === null) {
          carry(stdout);

          return;
        }

        refuse(failure instanceof Error ? failure : new Error(`${command} failed`));
      },
    );
  });
}
