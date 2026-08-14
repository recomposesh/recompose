import { KeychainDenied, type KeychainItem, type KeychainSeam } from './credential-custody';
import { runCommand, WAITS_FOR_THE_PERSON } from './run-command';
import { securityWriteLine } from './security-line';

const NOT_FOUND = 44;
const USER_CANCELED = 128;
const AUTHORIZATION_DENIED = 51;

function exitStatus(cause: unknown): number | null {
  if (!(cause instanceof Error) || !('code' in cause)) {
    return null;
  }

  return typeof cause.code === 'number' ? cause.code : null;
}

/**
 * Names the failed operation without ever repeating what was handed to the tool.
 *
 * @summary Node builds a failed child process's message out of the whole argument vector, and a
 * write hands the credential over as an argument, so rethrowing the cause would carry the blob
 * into a refusal the renderer reads aloud.
 */
function refuse(cause: unknown, operation: string): never {
  const status = exitStatus(cause);

  if (status === USER_CANCELED || status === AUTHORIZATION_DENIED) {
    throw new KeychainDenied(`the keychain prompt was denied while recompose ran ${operation}`);
  }

  throw new Error(`the keychain refused ${operation}, exit ${status ?? 'unknown'}`);
}

export type RunCommand = (
  command: string,
  args: readonly string[],
  boundMs: number,
  input?: string,
) => Promise<string>;

/**
 * The keychain as the tool on this machine answers it.
 *
 * @summary The runner is a seam so a spec can read what the argument vector carried, which is the
 * one thing a write here must never carry.
 */
export function securityKeychain(command: string, run: RunCommand = runCommand): KeychainSeam {
  return {
    read: async (item: KeychainItem) => {
      try {
        const found = await run(
          command,
          ['find-generic-password', '-s', item.service, '-a', item.account, '-w'],
          WAITS_FOR_THE_PERSON,
        );

        return found.replace(/\n$/, '');
      } catch (cause) {
        if (exitStatus(cause) === NOT_FOUND) {
          return null;
        }

        return refuse(cause, 'find-generic-password');
      }
    },

    write: async (item: KeychainItem, blob: string) => {
      try {
        await run(command, ['-i'], WAITS_FOR_THE_PERSON, securityWriteLine(item, blob));
      } catch (cause) {
        refuse(cause, 'add-generic-password');
      }
    },

    remove: async (item: KeychainItem) => {
      try {
        await run(
          command,
          ['delete-generic-password', '-s', item.service, '-a', item.account],
          WAITS_FOR_THE_PERSON,
        );
      } catch (cause) {
        if (exitStatus(cause) === NOT_FOUND) {
          return;
        }

        refuse(cause, 'delete-generic-password');
      }
    },
  };
}
