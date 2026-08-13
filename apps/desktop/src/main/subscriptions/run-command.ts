import { execFile } from 'node:child_process';

export const WAITS_FOR_THE_PERSON = 0;

const BATCH_SUFFIXES = ['.cmd', '.bat'];

export type CommandLine = {
  command: string;
  args: string[];
  /** Windows needs the line passed through untouched, because it is already quoted here. */
  verbatim: boolean;
};

function isBatchFile(file: string): boolean {
  return BATCH_SUFFIXES.some((suffix) => file.toLowerCase().endsWith(suffix));
}

/**
 * How a file on this machine is actually run.
 *
 * @summary Node refuses to run a Windows batch file directly, and Claude Code installs as
 * `claude.cmd` there, so a batch shim goes through the command processor. The whole line is quoted
 * and handed over as one argument, which is what keeps a path holding a space one file rather than
 * two, and the arguments beside it are ones this app names rather than anything a person typed.
 */
export function commandLineFor(
  file: string,
  args: readonly string[],
  platform: NodeJS.Platform,
): CommandLine {
  if (platform !== 'win32' || !isBatchFile(file)) {
    return { command: file, args: [...args], verbatim: false };
  }

  return {
    command: process.env['ComSpec'] ?? 'cmd.exe',
    args: ['/d', '/s', '/c', [`"${file}"`, ...args].join(' ')],
    verbatim: true,
  };
}

export async function runCommand(
  command: string,
  args: readonly string[],
  boundMs: number,
): Promise<string> {
  const line = commandLineFor(command, args, process.platform);

  return new Promise((carry, refuse) => {
    execFile(
      line.command,
      line.args,
      {
        encoding: 'utf8',
        timeout: boundMs,
        windowsHide: true,
        windowsVerbatimArguments: line.verbatim,
      },
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
