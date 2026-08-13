import { join } from 'node:path';

const MISSING_MACHINE_HOME = 2;
const FRESH_WINDOW_MS = 60 * 60 * 1000;

/** Where a vendor keeps a record: the operating system's store, or a file beside the home. */
export type CredentialStore = 'keychain' | 'file';

export const desk = process.env['RECOMPOSE_FAKE_TOOLS_DESK'] ?? '';

export const address = process.env['RECOMPOSE_FAKE_TOOL_ADDRESS'] ?? 'dev@example.com';

/**
 * Whether the record this run writes holds a login at all.
 *
 * @summary A vendor leaves an empty shell behind on some sign-outs, and a Codex machine keyed with
 * an API key carries a record that is no subscription. Both read as a record with nothing to adopt,
 * which is a different answer from a machine holding nothing.
 */
export const carriesCredential = process.env['RECOMPOSE_FAKE_TOOL_CARRIES_CREDENTIAL'] !== 'no';

export function chosenPlan(whenUnsaid: string): string {
  return process.env['RECOMPOSE_FAKE_TOOL_PLAN'] ?? whenUnsaid;
}

/** The moment the written credential lapses, so a scenario can stand one either side of it. */
export function chosenExpiry(): number {
  const chosen = process.env['RECOMPOSE_FAKE_TOOL_EXPIRES_AT'];

  return chosen === undefined || chosen === '' ? Date.now() + FRESH_WINDOW_MS : Number(chosen);
}

export function chosenStore(whenUnsaid: CredentialStore): CredentialStore {
  const chosen = process.env['RECOMPOSE_FAKE_TOOL_STORE'];

  return chosen === 'keychain' || chosen === 'file' ? chosen : whenUnsaid;
}

export function freshWindowEnds(): number {
  return Date.now() + FRESH_WINDOW_MS;
}

/**
 * The config home the machine's own copy of a tool reads.
 *
 * @summary A run with no config home override is the person's own tool acting on their own login,
 * which is what a delegated renewal and a credential planted before launch both are.
 */
export function machineConfigHome(tool: string, folder: string): string {
  const machineHome = process.env['RECOMPOSE_FAKE_MACHINE_HOME'] ?? '';

  if (machineHome === '') {
    process.stderr.write(`the fake ${tool} needs RECOMPOSE_FAKE_MACHINE_HOME\n`);
    process.exit(MISSING_MACHINE_HOME);
  }

  return join(machineHome, folder);
}

export function securityCommand(tool: string): string {
  const security = process.env['RECOMPOSE_KEYCHAIN_COMMAND'];

  if (security === undefined || security === '') {
    throw new Error(`the fake ${tool} needs RECOMPOSE_KEYCHAIN_COMMAND to reach the store`);
  }

  return security;
}
