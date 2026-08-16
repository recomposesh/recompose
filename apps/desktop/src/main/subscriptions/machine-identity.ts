import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';

/** How this machine names itself to a vendor that counts its callers per install. */
export type MachineIdentity = {
  name: string;
  id: string;
  model: string;
  version: string;
};

function machineName(): string {
  try {
    return hostname();
  } catch {
    return 'unknown';
  }
}

const osNames: Readonly<Record<string, string>> = {
  darwin: 'macOS',
  win32: 'Windows',
  linux: 'Linux',
};

export function machineModel(platform: NodeJS.Platform, arch: string): string {
  return `${osNames[platform] ?? platform} ${arch}`;
}

/**
 * Names this machine for one sign-in.
 *
 * @summary The identity is minted per flow rather than kept, which is what CLIProxyAPI does in
 * `internal/auth/kimi/kimi.go`. A vendor that ties a renewal to a device reads the one stored
 * beside the credential, so nothing here has to survive a restart.
 */
export function thisMachine(version: string): MachineIdentity {
  return {
    name: machineName(),
    id: randomUUID(),
    model: machineModel(process.platform, process.arch),
    version,
  };
}
