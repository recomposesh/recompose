import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';

import type { Bench, MachineSeams } from './machine-seams';

import { machineSeams } from './machine-seams';
import { shimName, shimScript } from './tool-shim';

const fakeTools = join(__dirname, 'fake-tools');

/** Stands in for the provider command-line tools and the macOS keychain a scenario must not touch. */
export type SubscriptionTools = MachineSeams & {
  env: (inherited: Record<string, string>) => Record<string, string>;
  install: (binary: string) => Promise<void>;
  uninstall: (binary: string) => Promise<void>;
  /** Empties the keychain, the way a provider revoking an authorization would. */
  revokeKeptCredentials: () => Promise<void>;
  dispose: () => Promise<void>;
};

/**
 * The folders a machine with no provider tool installed still has.
 *
 * @summary A prepended folder can't hide a tool the machine already carries, so the bed replaces
 * the search path outright. What stays is the system folders the fake launcher's shell lives in,
 * which is why the shims name their interpreter by absolute path rather than looking it up.
 */
function systemFolders(): string[] {
  if (process.platform === 'win32') {
    const systemRoot = process.env['SystemRoot'] ?? 'C:\\Windows';

    return [
      join(systemRoot, 'System32'),
      join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0'),
    ];
  }

  return ['/usr/bin', '/bin', '/usr/sbin', '/sbin'];
}

async function writeShim(binDir: string, binary: string, target: string): Promise<void> {
  const shim = join(binDir, shimName(binary));

  await writeFile(shim, shimScript(target), 'utf8');
  await chmod(shim, 0o755);
}

function searchPathKeyIn(inherited: Record<string, string>): string {
  return Object.keys(inherited).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH';
}

async function benchIn(root: string): Promise<Bench & { binDir: string }> {
  const binDir = join(root, 'bin');
  const keychainDir = join(root, 'keychain');
  const desk = join(root, 'desk');
  const machineHome = join(root, 'machine-home');

  for (const folder of [binDir, keychainDir, desk, machineHome]) {
    await mkdir(folder, { recursive: true });
  }

  await writeShim(binDir, 'security', join(fakeTools, 'keychain.mts'));
  await writeShim(binDir, 'sign-in-launcher', join(fakeTools, 'sign-in-launcher.mts'));

  return {
    binDir,
    keychainDir,
    desk,
    machineHome,
    machine: {
      RECOMPOSE_KEYCHAIN_COMMAND: join(binDir, shimName('security')),
      RECOMPOSE_SIGN_IN_LAUNCHER: join(binDir, shimName('sign-in-launcher')),
      RECOMPOSE_FAKE_KEYCHAIN_DIR: keychainDir,
      RECOMPOSE_FAKE_TOOLS_DESK: desk,
      RECOMPOSE_FAKE_MACHINE_HOME: machineHome,
    },
  };
}

export async function fakeSubscriptionTools(): Promise<SubscriptionTools> {
  const root = await mkdtemp(join(tmpdir(), 'recompose-subscription-tools-'));
  const bench = await benchIn(root);
  const { binDir, keychainDir } = bench;

  return {
    ...machineSeams(bench),

    env: (inherited) => ({
      ...inherited,
      [searchPathKeyIn(inherited)]: [binDir, ...systemFolders()].join(delimiter),
      SHELL: '',
      ...bench.machine,
    }),
    install: async (binary) => writeShim(binDir, binary, join(fakeTools, `${binary}.mts`)),
    uninstall: async (binary) => rm(join(binDir, shimName(binary)), { force: true }),

    revokeKeptCredentials: async () => {
      await rm(keychainDir, { force: true, recursive: true });
      await mkdir(keychainDir, { recursive: true });
    },
    dispose: async () => rm(root, { force: true, recursive: true }),
  };
}
