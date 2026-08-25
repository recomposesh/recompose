import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function statedVersion(): string {
  const read: unknown = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

  if (typeof read !== 'object' || read === null || !('version' in read)) {
    throw new Error('the desktop package states no version for an update feed to climb from');
  }

  return String(read.version);
}

/**
 * The version this build runs, and the one an update feed has to offer for anything to happen.
 *
 * @summary The update scenarios named a literal, and the release that made the app that very
 * version turned every one of them into a feed offering what the app already ran. Deriving the
 * newer one from the stored version means the next release costs these scenarios nothing.
 */
export const versionThisBuildRuns = statedVersion();

export const versionAboveThisBuild = ((): string => {
  const [major, minor] = versionThisBuildRuns.split('.');

  return `${major ?? '0'}.${String(Number(minor ?? '0') + 1)}.0`;
})();
