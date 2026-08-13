import { execFile } from 'node:child_process';

export const WAITS_FOR_THE_PERSON = 0;

const BATCH_SUFFIXES = ['.cmd', '.bat'];

const READ_BY_THE_PROCESSOR = /["&|<>^%!\r\n]/;

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
 * Whether a line may be handed to the command processor at all.
 *
 * @summary The quoting around the file is what keeps a path with a space one file, and the file
 * comes from the machine's search path rather than from this codebase. A directory named with a
 * quote closes that quoting itself, leaving whatever follows to read as a second command. Nothing
 * legitimate carries one of these, so a name holding one is refused rather than escaped: escaping
 * asks every later reader to trust the escaping.
 */
export function safeForTheCommandProcessor(file: string, args: readonly string[]): boolean {
  return ![file, ...args].some((word) => READ_BY_THE_PROCESSOR.test(word));
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

  if (!safeForTheCommandProcessor(file, args)) {
    throw new Error(
      `refused to start ${file}, because its line carries a character the command processor reads as its own`,
    );
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
