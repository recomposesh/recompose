import type { UpdateState } from '@recompose/contracts';

import { updateChannelFor, type UpdateChannel } from './update-channel';
import { RELEASE_FEED, updateLogFor } from './update-log';
import { wireAppUpdater, type UpdaterPort } from './wire-app-updater';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export type UpdatesWiring = {
  state: () => UpdateState;
  /** Whether this install updates itself, which is what decides the menu offers a check at all. */
  owned: boolean;
  checkNow: () => void;
  restart: () => boolean;
  dispose: () => void;
};

export function devFeedPort<Port extends { forceDevUpdateConfig: boolean }>(
  port: Port,
  env: NodeJS.ProcessEnv,
): Port {
  port.forceDevUpdateConfig = env['RECOMPOSE_DEV_UPDATE_FEED'] !== undefined;

  return port;
}

function ownedChannel(deps: {
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
  isPackaged: boolean;
  inApplicationsFolder: boolean;
}): UpdateChannel {
  if (deps.env['RECOMPOSE_DEV_UPDATE_FEED'] !== undefined) {
    return 'self';
  }

  return updateChannelFor(deps.platform, deps.env, deps.isPackaged, deps.inApplicationsFolder);
}

export function wireUpdatesFor(deps: {
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
  isPackaged: boolean;
  inApplicationsFolder: boolean;
  openPort: () => UpdaterPort;
  push: (state: UpdateState) => void;
}): UpdatesWiring {
  const markerArmed = deps.env['RECOMPOSE_DEV_UPDATE_FEED'] !== undefined;
  const log = updateLogFor(markerArmed ? 'dev-app-update.yml' : RELEASE_FEED);
  const channel = ownedChannel(deps);

  if (channel !== 'self') {
    log.logger.info(`update channel '${channel}': the app runs no updater of its own`);

    return {
      state: () => ({ standing: 'quiet' }),
      owned: false,
      checkNow: () => undefined,
      restart: () => false,
      dispose: () => undefined,
    };
  }

  return {
    owned: true,
    ...wireAppUpdater({
      updater: deps.openPort(),
      log,
      push: deps.push,
      intervalMs: checkIntervalFrom(deps.env),
    }),
  };
}

function checkIntervalFrom(env: NodeJS.ProcessEnv): number {
  const marker = Number(env['RECOMPOSE_DEV_UPDATE_FEED']);

  return Number.isFinite(marker) && marker > 1 ? marker : UPDATE_CHECK_INTERVAL_MS;
}
