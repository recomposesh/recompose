import { execFile } from 'node:child_process';

export const WAITS_FOR_THE_PERSON = 0;

const windowsScriptSuffixes = ['.cmd', '.bat'];

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

export async function runCommand(
  command: string,
  args: readonly string[],
  boundMs: number,
): Promise<string> {
  const shell = runsOnlyThroughAShell(command, process.platform);

  return new Promise((carry, refuse) => {
    execFile(
      shell ? `"${command}"` : command,
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
