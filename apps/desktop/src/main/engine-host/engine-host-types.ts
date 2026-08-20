import type {
  EngineDirective,
  EngineGateway,
  EngineSpendGrant,
  EngineStates,
  EngineSubscriptionCredentialUpdated,
  GatewayBranchPins,
  GatewayCooldowns,
  GatewayEngineState,
  GatewayTraffic,
  KeyCheckReport,
  KeyProviderId,
  LocalProviderId,
  LogBatch,
  LogRow,
  LookCustody,
  ModelListing,
  RuntimeReachability,
  SubscriptionProviderId,
} from '@recompose/contracts';

import type { SpendGrantFor } from './engine-spend';

export type EngineChild = {
  postMessage: (
    message: EngineDirective | EngineSpendGrant | EngineSubscriptionCredentialUpdated,
  ) => void;
  onMessage: (listener: (message: unknown) => void) => void;
  onExit: (listener: (code: number) => void) => void;
  kill: () => void;
};

export type EngineHostDeps = {
  knownSlugs: readonly string[];
  spawnChild: () => EngineChild;
  grantFor: SpendGrantFor;
  storeSubscriptionCredential?: (
    provider: SubscriptionProviderId,
    accountId: string,
    credential: string,
  ) => Promise<void>;
  onTraffic?: (traffic: GatewayTraffic) => void;
  onBranchPins?: (pinning: GatewayBranchPins) => void;
  onCooldowns?: (cooling: GatewayCooldowns) => void;
  onLogs?: (batch: LogBatch) => void;
  onSettledRow?: (row: LogRow) => void;
};

export type EngineHost = {
  start: (gateway: EngineGateway) => Promise<GatewayEngineState>;
  stop: (slug: string) => Promise<GatewayEngineState>;
  restart: (gateway: EngineGateway) => Promise<GatewayEngineState>;
  probe: (provider: KeyProviderId, key: string) => Promise<KeyCheckReport>;
  probeRuntime: (address: string, provider: LocalProviderId) => Promise<RuntimeReachability>;
  listModels: (origin: string, custody: LookCustody) => Promise<ModelListing>;
  /**
   * The address one Claude access token signed in as, or nothing where the far end would not say.
   *
   * @summary Claude Code leaves no address in a config home this app pointed it at, so the only
   * place it exists is behind the token, and the child is the one process that spends a credential.
   */
  claudeAddress: (accessToken: string) => Promise<string | undefined>;
  states: () => EngineStates;
  retainedLogRows: () => readonly LogRow[];
  /**
   * Sends the retained request log to the windows again, as backfill runs.
   *
   * @summary A renderer binds fresh on every reload and on every new window, holding no rows, while
   * main sits on the whole history. Nothing about that is a gateway restart, so the ask has to be
   * its own act rather than a side effect of starting.
   */
  replayLogs: () => void;
  /** Forgets every in-memory reading owned by a gateway removed from storage. */
  forget?: ((slug: string) => void) | undefined;
  onStatesChanged: (listener: (states: EngineStates) => void) => () => void;
  dispose: () => void;
};
