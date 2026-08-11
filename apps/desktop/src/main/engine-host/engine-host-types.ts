import type {
  EngineDirective,
  EngineGateway,
  EngineSpendGrant,
  EngineStates,
  EngineSubscriptionCredentialUpdated,
  GatewayEngineState,
  GatewayTraffic,
  KeyCheckReport,
  KeyProviderId,
  LogBatch,
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
  onLogs?: (batch: LogBatch) => void;
};

export type EngineHost = {
  start: (gateway: EngineGateway) => Promise<GatewayEngineState>;
  stop: (slug: string) => Promise<GatewayEngineState>;
  restart: (gateway: EngineGateway) => Promise<GatewayEngineState>;
  probe: (provider: KeyProviderId, key: string) => Promise<KeyCheckReport>;
  probeRuntime: (address: string) => Promise<RuntimeReachability>;
  listModels: (origin: string, custody: LookCustody) => Promise<ModelListing>;
  states: () => EngineStates;
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
