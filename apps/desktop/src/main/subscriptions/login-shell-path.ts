import { runCommand } from './run-command';

const pathAssignment = 'PATH=';

const delimiter = '_SHELL_ENV_DELIMITER_';

const environmentReport = `echo -n "${delimiter}"; command env; echo -n "${delimiter}"; exit`;

/**
 * What the probe asks the shell not to do while it answers.
 *
 * @summary An interactive shell runs whatever a plugin manager put in the rc file, and two of
 * those stall a shell that has nobody to answer them: Oh My Zsh stops to offer an update, and its
 * tmux plugin replaces the shell with a session that reports nothing. Either one spends the whole
 * bound and leaves the person told no tool is installed.
 */
const askedNotToStall = {
  DISABLE_AUTO_UPDATE: 'true',
  ZSH_TMUX_AUTOSTARTED: 'true',
  ZSH_TMUX_AUTOSTART: 'false',
};

export type LoginShellProbe = {
  shell: string | undefined;
  environmentPath: string;
  platform: NodeJS.Platform;
  boundMs: number;
};

export type PathHold = {
  ask: () => Promise<string>;
  nowMs: () => number;
  holdMs: number;
};

/**
 * The path the shell reported, read from between the marks and nowhere else.
 *
 * @summary An rc file is free to greet, warn, or print a `PATH=` line of its own on the way in, and
 * the first such line used to stand in for the environment. Both marks have to arrive, because a
 * report cut off part way through carries an opening mark and whatever the shell managed to print.
 */
function environmentBetweenTheMarks(report: string): string {
  const parts = report.split(delimiter);

  return parts.length < 3 ? '' : (parts[1] ?? '');
}

function pathInsideEnvironmentReport(report: string): string | null {
  const environment = environmentBetweenTheMarks(report);
  const assigned = environment.split('\n').find((line) => line.startsWith(pathAssignment));
  const carried = assigned?.slice(pathAssignment.length) ?? '';

  return carried === '' ? null : carried;
}

/**
 * @summary The shell runs as an interactive login shell, because a login alone reads `.zprofile`
 * and `.zlogin` while every rc file a person actually edits is read for interactive shells only.
 * Both the Claude Code installer and nvm write their `PATH` line into `.zshrc`, so a login-only
 * probe reports a path carrying neither tool, and the app tells a machine that has both that it
 * has none.
 */
async function askTheLoginShell(shell: string, boundMs: number): Promise<string | null> {
  try {
    return pathInsideEnvironmentReport(
      await runCommand(shell, ['-ilc', environmentReport], boundMs, undefined, {
        ...process.env,
        ...askedNotToStall,
      }),
    );
  } catch {
    return null;
  }
}

export async function loginShellPath(probe: LoginShellProbe): Promise<string> {
  if (probe.platform === 'win32' || probe.shell === undefined || probe.shell === '') {
    return probe.environmentPath;
  }

  return (await askTheLoginShell(probe.shell, probe.boundMs)) ?? probe.environmentPath;
}

/**
 * One reading of the search path, shared by everything that asks inside the hold.
 *
 * @summary Every surface that reports a tool takes a fresh reading on mount, and each reading used
 * to spawn an interactive login shell of its own, which is the slowest thing either surface does.
 * The hold is short rather than for the whole run, because installing a tool is exactly what a
 * person does between two readings, and an installer is free to leave its binary in a folder no
 * earlier path carried.
 */
export function pathHeldBriefly(hold: PathHold): () => Promise<string> {
  let held: { asked: Promise<string>; atMs: number } | null = null;

  return async () => {
    const atMs = hold.nowMs();
    const standing =
      held !== null && atMs - held.atMs < hold.holdMs ? held : { asked: hold.ask(), atMs };

    held = standing;
    standing.asked.catch(() => undefined);

    try {
      return await standing.asked;
    } catch (refusal) {
      if (held === standing) {
        held = null;
      }

      throw refusal;
    }
  };
}
