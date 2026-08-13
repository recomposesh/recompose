import { spawn } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  codexEntryFor,
  credentialTheAppKeeps,
  lapseTheKeptCredential,
  shelvedBlob,
} from './keychain-shelf';

const fakeTools = join(__dirname, 'fake-tools');

const vendorServices = {
  anthropic: 'Claude Code-credentials',
  openai: 'Codex Auth',
} as const;

const toolBinaries = { anthropic: 'claude', openai: 'codex' } as const;

const recordFiles = { anthropic: '.credentials.json', openai: 'auth.json' } as const;

const machineFolders = { anthropic: '.claude', openai: '.codex' } as const;

/** The two providers whose tools a scenario can stand a machine credential up for. */
export type MachineProvider = keyof typeof vendorServices;

/** Where a vendor keeps a record: the operating system's store, or a file beside the home. */
type CredentialStore = 'keychain' | 'file';

/**
 * A login the person's own tool left on the machine before recompose ever ran.
 *
 * @summary An account with no credential is the empty shell a vendor leaves behind, which reads as
 * a record carrying nothing to adopt rather than as a machine holding nothing.
 */
type MachineRecord = {
  provider: MachineProvider;
  signedInAs: string;
  plan: string;
  expiresAt: number;
  carriesAccountCredential: boolean;
  store?: CredentialStore;
};

/** Every seam a scenario reaches the machine's own stores and tools through. */
export type MachineSeams = {
  /** The home the machine's own tools read, standing in for the person's home folder. */
  machineHome: string;
  /** Writes a vendor-shaped login onto the machine, the way the person's own tool would have. */
  plantMachineCredential: (record: MachineRecord) => Promise<void>;
  /** The record the machine's store holds now, so a step can prove one stood untouched. */
  machineCredential: (provider: MachineProvider) => Promise<string | null>;
  /**
   * Moves the lapsing moment of a credential the app signed in itself.
   *
   * @summary No run of a vendor tool leaves a fresh sign-in near expiry, so a scenario about the
   * app renewing what it owns has no other way to stand one there.
   */
  appCredentialLapsesAt: (home: string, expiresAt: number) => Promise<void>;
  /**
   * What the app itself keeps for one config home, so a step can prove it kept nothing.
   *
   * @summary A copy the app kept on macOS lands in the login keychain rather than on disk, so
   * looking for a folder would miss it and only asking this machine's own store finds it.
   */
  appCredentialKept: (home: string) => Promise<string | null>;
  /** Whether a fresh run of the provider's own tool still reads as signed in. */
  machineToolReadsSignedIn: (provider: MachineProvider) => Promise<boolean>;
  /** How many renewals the provider's own tool ran, so one run reads apart from two. */
  renewalRuns: (provider: MachineProvider) => Promise<number>;
  /** Makes the provider's own tool fail every renewal from here on. */
  toolFailsToRenew: (provider: MachineProvider) => Promise<void>;
  /** Locks the credential store, the way a keychain over a remote session refuses to open. */
  keychainRefusesToOpen: () => Promise<void>;
  /** How many reads asked the operating system for a secret, which is what would prompt. */
  keychainOpens: () => Promise<number>;
};

/** The folders one scenario's machine is built from, and the variables that point at them. */
export type Bench = {
  keychainDir: string;
  desk: string;
  machineHome: string;
  machine: Record<string, string>;
};

function settingsFor(record: MachineRecord): Record<string, string> {
  return {
    RECOMPOSE_FAKE_TOOL_ADDRESS: record.signedInAs,
    RECOMPOSE_FAKE_TOOL_PLAN: record.plan,
    RECOMPOSE_FAKE_TOOL_EXPIRES_AT: String(record.expiresAt),
    RECOMPOSE_FAKE_TOOL_CARRIES_CREDENTIAL: record.carriesAccountCredential ? 'yes' : 'no',
    ...(record.store === undefined ? {} : { RECOMPOSE_FAKE_TOOL_STORE: record.store }),
  };
}

/**
 * The environment a tool run outside the app gets.
 *
 * @summary A config home override would send the run's credential to a derived keychain name, so
 * a machine-side run drops whatever the session that started the suite happened to carry.
 */
function machineRunEnv(machine: Record<string, string>): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, ...machine };

  delete env['CLAUDE_CONFIG_DIR'];
  delete env['CODEX_HOME'];

  return env;
}

async function runFakeTool(
  binary: string,
  argv: readonly string[],
  env: NodeJS.ProcessEnv,
): Promise<{ status: number; said: string }> {
  const child = spawn(process.execPath, [join(fakeTools, `${binary}.mts`), ...argv], { env });
  let said = '';

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    said += chunk;
  });
  child.stderr.pipe(process.stderr);

  const status = await new Promise<number>((resolve) => {
    child.on('close', (code) => {
      resolve(code ?? 0);
    });
  });

  return { status, said };
}

async function linesIn(path: string): Promise<number> {
  const written = await readFile(path, 'utf8').catch(() => '');

  return written.split('\n').filter((line) => line !== '').length;
}

export function machineSeams(bench: Bench): MachineSeams {
  const { desk, keychainDir, machine, machineHome } = bench;

  /**
   * @summary Each vendor names its keyring entry its own way: Claude Code by the person, Codex by
   * the config home it wrote from, so reading one asks under the name that vendor would have used.
   */
  const entryFor = (provider: MachineProvider): string | undefined =>
    provider === 'openai'
      ? codexEntryFor(realpathSync(join(machineHome, machineFolders.openai)))
      : undefined;

  const machineCredential: MachineSeams['machineCredential'] = async (provider) =>
    (await shelvedBlob(keychainDir, vendorServices[provider], entryFor(provider))) ??
    readFile(join(machineHome, machineFolders[provider], recordFiles[provider]), 'utf8').then(
      (blob) => blob,
      () => null,
    );

  return {
    machineHome,

    plantMachineCredential: async (record) => {
      const env = machineRunEnv({ ...machine, ...settingsFor(record) });
      const run = await runFakeTool(toolBinaries[record.provider], [], env);

      if (run.status !== 0) {
        throw new Error(
          `planting the ${record.provider} login on the machine answered status ${String(run.status)}`,
        );
      }
    },

    machineCredential,

    appCredentialLapsesAt: async (home, expiresAt) =>
      lapseTheKeptCredential(keychainDir, home, expiresAt),

    appCredentialKept: async (home) => credentialTheAppKeeps(keychainDir, home),

    machineToolReadsSignedIn: async (provider) => {
      if (provider === 'openai') {
        return (await machineCredential(provider)) !== null;
      }

      const run = await runFakeTool('claude', ['config', 'ls'], machineRunEnv(machine));

      return !run.said.includes('Not logged in');
    },

    renewalRuns: async (provider) => linesIn(join(desk, `renewals-${toolBinaries[provider]}.log`)),

    toolFailsToRenew: async (provider) =>
      writeFile(join(desk, `renewal-fails-${toolBinaries[provider]}`), '', 'utf8'),

    keychainRefusesToOpen: async () => writeFile(join(desk, 'keychain-refuses'), '', 'utf8'),

    keychainOpens: async () => linesIn(join(desk, 'keychain-opens.log')),
  };
}
