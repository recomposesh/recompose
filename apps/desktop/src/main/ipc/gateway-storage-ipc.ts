import type { EngineGateway, GatewayConfig, IpcRequest } from '@recompose/contracts';

import type { IpcHandlers } from './dispatch';
import type { StorageIpcContext, StoragePaths } from './storage-context';

import { engineGatewayOf } from '../engine-host/stored-gateway';
import {
  listGatewayConfigs,
  removeGatewayConfig,
  saveGatewayConfig,
} from '../storage/gateway-store';
import { inGatewayWriteOrder } from '../storage/gateway-write-order';
import { ipcFailure, storageFailure } from './storage-envelope';

export type GatewayStorageHandlers = Pick<
  IpcHandlers,
  'gateways:list' | 'gateways:save' | 'gateways:update' | 'gateways:remove' | 'gateways:set-port'
>;

function noteGatewayWrite(ctx: StorageIpcContext, gateway: GatewayConfig): void {
  ctx.noteGatewayWrite?.(gateway);
}

async function listGateways(ctx: StorageIpcContext, paths: StoragePaths) {
  try {
    return { ok: true as const, value: await listGatewayConfigs(paths.gatewaysDir, ctx.onCorrupt) };
  } catch (error) {
    return storageFailure(error, ctx.homeFolder);
  }
}

function conflictWith(stored: readonly GatewayConfig[], saving: GatewayConfig) {
  const namesake = stored.find((one) => one.slug === saving.slug);

  if (namesake !== undefined) {
    return ipcFailure(
      'name-conflict',
      `Another gateway already holds the name "${namesake.displayName}".`,
    );
  }

  const holder = stored.find((one) => one.port === saving.port);

  if (holder !== undefined) {
    return ipcFailure('port-conflict', `${holder.slug} already holds this port.`);
  }

  return null;
}

async function saveGateway(
  ctx: StorageIpcContext,
  paths: StoragePaths,
  config: IpcRequest<'gateways:save'>,
) {
  try {
    const stored = await listGatewayConfigs(paths.gatewaysDir, ctx.onCorrupt);
    const conflict = conflictWith(stored, config);

    if (conflict !== null) {
      return conflict;
    }

    const serving = await engineGatewayOf(ctx.userDataPath, ctx.onCorrupt, config);

    await saveGatewayConfig(paths.gatewaysDir, config);
    noteGatewayWrite(ctx, config);
    ctx.startGateway(serving);

    return { ok: true as const, value: await listGatewayConfigs(paths.gatewaysDir, ctx.onCorrupt) };
  } catch (error) {
    return storageFailure(error, ctx.homeFolder);
  }
}

function restartIfServing(ctx: StorageIpcContext, serving: EngineGateway): void {
  if (ctx.isServing(serving.slug)) {
    ctx.restartGateway(serving);
  }
}

function noSuchGateway(slug: string, consequence = 'has nothing to rewrite') {
  return ipcFailure(
    'storage-failed',
    `recompose stores no gateway under the slug "${slug}", so it ${consequence}.`,
  );
}

async function servedRewrite(
  ctx: StorageIpcContext,
  paths: StoragePaths,
  rewritten: GatewayConfig,
) {
  const serving = await engineGatewayOf(ctx.userDataPath, ctx.onCorrupt, rewritten);

  await saveGatewayConfig(paths.gatewaysDir, rewritten);
  noteGatewayWrite(ctx, rewritten);
  restartIfServing(ctx, serving);

  return { ok: true as const, value: await listGatewayConfigs(paths.gatewaysDir, ctx.onCorrupt) };
}

/**
 * Rewrites the document a stored gateway already has, and serves what it now says.
 *
 * @summary A definition lands here rather than on the save, because the save exists to refuse a
 * slug already taken and that refusal is exactly what a second virtual model must not read. The
 * snapshot resolves before the write for the same reason the save resolves before its own: a
 * registry that cannot be read must leave the stored document alone.
 *
 * The port written is the stored one, never the arriving one, because this channel does not own
 * that field: the move lane does. A caller whose copy of the document predates a move would
 * otherwise reverse it, and refusing them instead would send a person to fix a port they never
 * touched. The answer carries the whole stored list, so a stale caller is corrected rather than
 * quietly overruled.
 *
 * A gateway already serving restarts, because the snapshot in front of it is now stale. One a
 * person stopped is left stopped: a save starts what it stored and a move restarts what it moved
 * because serving is the point of both acts, and editing a definition is not, so this must not be
 * the one write that contradicts an explicit stop.
 */
async function updateGateway(
  ctx: StorageIpcContext,
  paths: StoragePaths,
  config: IpcRequest<'gateways:update'>,
) {
  try {
    const stored = await listGatewayConfigs(paths.gatewaysDir, ctx.onCorrupt);
    const held = stored.find((one) => one.slug === config.slug);

    if (held === undefined) {
      return noSuchGateway(config.slug);
    }

    return await servedRewrite(ctx, paths, { ...config, port: held.port });
  } catch (error) {
    return storageFailure(error, ctx.homeFolder);
  }
}

/**
 * Moves a stored gateway onto the port a person chose, and serves it there if it was serving.
 *
 * @summary The chosen port refuses a seat another gateway already holds, exactly as the save
 * refuses one. A serving gateway restarts because the port is the one field the running engine
 * cannot follow in place; a stopped one just keeps the new number for its next start.
 */
async function setGatewayPort(
  ctx: StorageIpcContext,
  paths: StoragePaths,
  request: IpcRequest<'gateways:set-port'>,
) {
  try {
    const stored = await listGatewayConfigs(paths.gatewaysDir, ctx.onCorrupt);
    const held = stored.find((one) => one.slug === request.slug);

    if (held === undefined) {
      return ipcFailure(
        'storage-failed',
        `recompose stores no gateway under the slug "${request.slug}", so it has no port to move.`,
      );
    }

    if (held.port === request.port) {
      return { ok: true as const, value: stored };
    }

    const holder = stored.find((one) => one.port === request.port);

    if (holder !== undefined) {
      return ipcFailure('port-conflict', `${holder.slug} already holds this port.`);
    }

    return await servedRewrite(ctx, paths, { ...held, port: request.port });
  } catch (error) {
    return storageFailure(error, ctx.homeFolder);
  }
}

async function stopServingBeforeRemoval(ctx: StorageIpcContext, slug: string): Promise<void> {
  if (ctx.removeGatewayRuntime === undefined) {
    ctx.stopGateway(slug);

    return;
  }

  await ctx.removeGatewayRuntime(slug);
}

/**
 * Removes a stored gateway for good, stopping what it serves before its document leaves.
 *
 * @summary The stop lands before the delete, because an engine serving a gateway whose document
 * has already gone is a server nothing on disk explains. The answer carries the remaining stored
 * list, so the caller learns in one reading whether any gateway still stands.
 */
async function removeGateway(
  ctx: StorageIpcContext,
  paths: StoragePaths,
  request: IpcRequest<'gateways:remove'>,
) {
  try {
    const stored = await listGatewayConfigs(paths.gatewaysDir, ctx.onCorrupt);
    const held = stored.find((one) => one.slug === request.slug);

    if (held === undefined) {
      return noSuchGateway(request.slug, 'has nothing to remove');
    }

    if (ctx.isServing(held.slug)) {
      await stopServingBeforeRemoval(ctx, held.slug);
    } else {
      ctx.forgetGateway?.(held.slug);
    }

    await removeGatewayConfig(paths.gatewaysDir, held.slug);

    return { ok: true as const, value: await listGatewayConfigs(paths.gatewaysDir, ctx.onCorrupt) };
  } catch (error) {
    return storageFailure(error, ctx.homeFolder);
  }
}

/**
 * Every channel that reads or writes the gateways directory.
 *
 * @summary Both writes take the lane the move takes too, because all three list the directory
 * before deciding what to put back and the one that does not share it is the one that loses a
 * write.
 */
export function createGatewayStorageHandlers(
  ctx: StorageIpcContext,
  paths: StoragePaths,
): GatewayStorageHandlers {
  return {
    'gateways:list': async () => listGateways(ctx, paths),
    'gateways:save': async (config) =>
      inGatewayWriteOrder(async () => saveGateway(ctx, paths, config)),
    'gateways:update': async (config) =>
      inGatewayWriteOrder(async () => updateGateway(ctx, paths, config)),
    'gateways:remove': async (request) =>
      inGatewayWriteOrder(async () => removeGateway(ctx, paths, request)),
    'gateways:set-port': async (request) =>
      inGatewayWriteOrder(async () => setGatewayPort(ctx, paths, request)),
  };
}
