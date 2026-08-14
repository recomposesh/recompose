import type {
  Account,
  EngineGateway,
  EngineRouteNode,
  EngineRouting,
  EngineTargetStanding,
  EngineVirtualModel,
  GatewayConfig,
  RouteNode,
  RouteTarget,
  Routing,
  VirtualModel,
} from '@recompose/contracts';

import { DEFAULT_GATEWAY_BIND_ADDRESS, enforcedApiKey } from '@recompose/contracts';

import { storagePathsFor } from '../ipc/storage-context';
import { loadAccountsFile } from '../storage/accounts-store';
import { listGatewayConfigs } from '../storage/gateway-store';
import { loadSettingsFile } from '../storage/settings-store';

function standingOf(accounts: readonly Account[], target: RouteTarget): EngineTargetStanding {
  const held = accounts.find((account) => account.id === target.accountId);

  return held === undefined
    ? { standing: 'removed' }
    : { standing: 'bound', providerModel: target.providerModel };
}

/**
 * One stored node as the child sees it: a target worn to its standing, or a router carried whole.
 *
 * @summary A target names the account paying for it, and that name is the one thing the lane must
 * never carry, so it is spent here and dropped. A router keeps its mode and its declared order,
 * because those two are the walk's entire instruction.
 */
function mirroredNode(accounts: readonly Account[], node: RouteNode): EngineRouteNode {
  if (node.kind === 'target') {
    return { kind: 'target', standing: standingOf(accounts, node) };
  }

  return {
    kind: 'router',
    ...(node.displayName === undefined ? {} : { displayName: node.displayName }),
    policy: node.policy,
    children: node.children,
  };
}

function mirroredRouting(accounts: readonly Account[], routing: Routing): EngineRouting {
  const nodes: Record<string, EngineRouteNode> = {};

  for (const [id, node] of Object.entries(routing.nodes)) {
    nodes[id] = mirroredNode(accounts, node);
  }

  return { entry: routing.entry, nodes };
}

function mintedAgainst(
  accounts: readonly Account[],
  stored: readonly VirtualModel[],
): EngineVirtualModel[] {
  return stored.map((model) => ({
    id: model.id,
    displayName: model.displayName,
    routing: mirroredRouting(accounts, model.routing),
  }));
}

/**
 * The engine's view of one gateway document, with every target resolved against the registry.
 *
 * @summary A stored target names an account, and the account may be gone by the time the gateway
 * serves, so the standing is minted here rather than trusted from the document. The snapshot says
 * which names serve and which refuse, and it carries no provider credential, because a turn asks for
 * one per request.
 *
 * The gateway's own key is the one secret that travels, and only where the gateway enforces it. A key
 * a person stored and then stopped requiring stays in the parent, so the child never holds a value it
 * must not act on.
 */
export async function engineGatewayOf(
  userDataPath: string,
  onCorrupt: (quarantinedPath: string) => void,
  config: GatewayConfig,
): Promise<EngineGateway> {
  const [registry, settings] = await Promise.all([
    loadAccountsFile(storagePathsFor(userDataPath).accountsFile, onCorrupt),
    loadSettingsFile(storagePathsFor(userDataPath).settingsFile, onCorrupt),
  ]);

  const enforced = enforcedApiKey(config);

  return {
    slug: config.slug,
    displayName: config.displayName,
    port: config.port,
    ...(settings.bindAddress === undefined || settings.bindAddress === DEFAULT_GATEWAY_BIND_ADDRESS
      ? {}
      : { bindAddress: settings.bindAddress }),
    ...(enforced === undefined ? {} : { apiKey: enforced }),
    virtualModels: mintedAgainst(registry.accounts, config.virtualModels),
  };
}

/**
 * The engine's view of the stored gateway under a slug, or nothing when no document carries it.
 *
 * @summary Main is the single reader of the gateways directory, so the toolbar, the menu bar,
 * and the move recovery all learn a gateway's port the same way.
 */
export async function storedEngineGateway(
  userDataPath: string,
  onCorrupt: (quarantinedPath: string) => void,
  slug: string,
): Promise<EngineGateway | undefined> {
  const stored = await listGatewayConfigs(storagePathsFor(userDataPath).gatewaysDir, onCorrupt);
  const found = stored.find((config) => config.slug === slug);

  if (found === undefined) {
    return undefined;
  }

  return engineGatewayOf(userDataPath, onCorrupt, found);
}
