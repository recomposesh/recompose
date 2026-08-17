export type UpdateChannel = 'self' | 'package-tool' | 'none';

function runsAsAppImage(env: NodeJS.ProcessEnv): boolean {
  const appImagePath = env['APPIMAGE'];

  return appImagePath !== undefined && appImagePath !== '';
}

/**
 * Which channel owns this install's updates.
 *
 * @summary Only 'self' ever arms the updater. Windows answers 'none' until SignPath signs the
 * installer (ADR-0137), and a macOS copy outside the Applications folder answers 'none' because
 * Squirrel.Mac cannot replace a translocated or read-only copy.
 */
export function updateChannelFor(
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
  isPackaged: boolean,
  inApplicationsFolder: boolean,
): UpdateChannel {
  if (!isPackaged) {
    return 'none';
  }

  const ownerOf: Partial<Record<NodeJS.Platform, () => UpdateChannel>> = {
    darwin: () => (inApplicationsFolder ? 'self' : 'none'),
    linux: () => (runsAsAppImage(env) ? 'self' : 'package-tool'),
  };

  return ownerOf[platform]?.() ?? 'none';
}
