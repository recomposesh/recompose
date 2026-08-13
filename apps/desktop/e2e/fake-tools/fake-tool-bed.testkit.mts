import { spawn } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir, userInfo } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { shimName, shimScript } from '../tool-shim.ts';

const keychainScript = fileURLToPath(new URL('./keychain.mts', import.meta.url));

/** A machine with a credential store, a desk the fakes leave their traces on, and a home. */
export type ToolBed = {
  desk: string;
  keychainDir: string;
  machineHome: string;
  env: Record<string, string>;
  dispose: () => Promise<void>;
};

/** What one run of a fake tool left behind for a spec to read. */
export type ToolRun = {
  status: number;
  said: string;
  complained: string;
};

export async function fakeToolBed(): Promise<ToolBed> {
  const root = await mkdtemp(join(tmpdir(), 'recompose-fake-tool-bed-'));
  const binDir = join(root, 'bin');
  const desk = join(root, 'desk');
  const keychainDir = join(root, 'keychain');
  const machineHome = join(root, 'machine-home');
  const shim = join(binDir, shimName('security'));

  await mkdir(binDir, { recursive: true });
  await mkdir(desk, { recursive: true });
  await mkdir(keychainDir, { recursive: true });
  await mkdir(machineHome, { recursive: true });
  await writeFile(shim, shimScript(keychainScript), 'utf8');
  await chmod(shim, 0o755);

  return {
    desk,
    keychainDir,
    machineHome,
    env: {
      RECOMPOSE_KEYCHAIN_COMMAND: shim,
      RECOMPOSE_FAKE_KEYCHAIN_DIR: keychainDir,
      RECOMPOSE_FAKE_TOOLS_DESK: desk,
      RECOMPOSE_FAKE_MACHINE_HOME: machineHome,
    },
    dispose: async () => rm(root, { force: true, recursive: true }),
  };
}

function toolScript(binary: string): string {
  return fileURLToPath(new URL(`./${binary}.mts`, import.meta.url));
}

export async function runTool(
  bed: ToolBed,
  binary: string,
  argv: readonly string[],
  settings: Record<string, string> = {},
): Promise<ToolRun> {
  const child = spawn(process.execPath, [toolScript(binary), ...argv], {
    env: { ...process.env, ...bed.env, ...settings },
  });
  let said = '';
  let complained = '';

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    said += chunk;
  });
  child.stderr.on('data', (chunk: string) => {
    complained += chunk;
  });

  const status = await new Promise<number>((resolve) => {
    child.on('close', (code) => {
      resolve(code ?? 0);
    });
  });

  return { status, said, complained };
}

/** What the fake credential store holds for one service, read the way the tools write it. */
export async function keychainHolds(bed: ToolBed, service: string): Promise<string | null> {
  const name = Buffer.from(`${service}\n${userInfo().username}`).toString('base64url');

  return readFile(join(bed.keychainDir, name), 'utf8').then(
    (blob) => blob,
    () => null,
  );
}

/** Every service the fake credential store carries an item for. */
export async function keychainServices(bed: ToolBed): Promise<string[]> {
  const shelves = await readdir(bed.keychainDir).catch(() => []);

  return shelves.map(
    (shelf) => Buffer.from(shelf, 'base64url').toString('utf8').split('\n')[0] ?? '',
  );
}

export async function deskLines(bed: ToolBed, file: string): Promise<string[]> {
  const written = await readFile(join(bed.desk, file), 'utf8').catch(() => '');

  return written.split('\n').filter((line) => line !== '');
}
