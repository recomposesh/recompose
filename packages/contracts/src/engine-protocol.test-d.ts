import { describe, expectTypeOf, test } from 'vitest';

import type {
  EngineDirective,
  EngineGateway,
  EngineReport,
  EngineRouteNode,
  EngineRouting,
  EngineSpendGrant,
  EngineSpendRequest,
  EngineVirtualModel,
  GatewayEngineState,
  KeyCheckVerdict,
  KeyCustody,
  KeyProviderId,
  LocalProviderId,
  LookCustody,
  ProviderDialect,
  RuntimeReachability,
  SpendGrant,
  SubscriptionProviderId,
} from './index';

type ProbeDirective = Extract<EngineDirective, { kind: 'probe' }>;

type EngineTargetNode = Extract<EngineRouteNode, { kind: 'target' }>;

type BoundTarget = Extract<EngineTargetNode['standing'], { standing: 'bound' }>;

type RemovedTarget = Extract<EngineTargetNode['standing'], { standing: 'removed' }>;

type ResolvedGrant = Extract<SpendGrant, { verdict: 'resolved' }>;

type RefusedGrant = Exclude<SpendGrant, { verdict: 'resolved' }>;

type GrantedSpend = ResolvedGrant['spend'];

type CredentialedSpend = Extract<GrantedSpend, { custody: 'credentialed' }>;

type OpenSpend = Extract<GrantedSpend, { custody: 'open' }>;

type SubscriptionSpend = Extract<GrantedSpend, { custody: 'subscription' }>;

type SubscriptionLook = Extract<LookCustody, { custody: 'subscription' }>;

type RuntimeProbeDirective = Extract<EngineDirective, { kind: 'probe-runtime' }>;

type KeyCheckReportArm = Extract<EngineReport, { kind: 'key-check' }>;

type RuntimeCheckReportArm = Extract<EngineReport, { kind: 'runtime-check' }>;

describe('the protocol the two processes speak', () => {
  test('a directive is a start, a stop, a probe, a model-list look, or an address look', () => {
    expectTypeOf<EngineDirective['kind']>().toEqualTypeOf<
      'start' | 'stop' | 'probe' | 'probe-runtime' | 'list-models' | 'claude-address'
    >();
  });

  test('the child hears what serving needs, and the one secret it has to compare against', () => {
    expectTypeOf<EngineGateway>().toEqualTypeOf<{
      slug: string;
      displayName: string;
      port: number;
      bindAddress?: string | undefined;
      apiKey?: string | undefined;
      virtualModels: EngineVirtualModel[];
    }>();
  });

  test('the snapshot carries no requirement flag, because the parent resolves it before sending', () => {
    expectTypeOf<EngineGateway>().not.toHaveProperty('apiKeyRequired');
    expectTypeOf<EngineGateway>().not.toHaveProperty('requireApiKey');
  });

  test('the probe carries its key in the custody that spells it', () => {
    expectTypeOf<ProbeDirective['custody']>().toEqualTypeOf<KeyCustody>();
    expectTypeOf<ProbeDirective>().not.toHaveProperty('key');
    expectTypeOf<Extract<EngineDirective, { kind: 'start' }>>().not.toHaveProperty('key');
    expectTypeOf<Extract<EngineDirective, { kind: 'stop' }>>().not.toHaveProperty('key');
  });

  test('a probe names where the key is spent rather than the vendor it was pasted for', () => {
    expectTypeOf<keyof ProbeDirective>().toEqualTypeOf<'kind' | 'id' | 'origin' | 'custody'>();
    expectTypeOf<ProbeDirective['origin']>().toEqualTypeOf<string>();
  });

  test('a key custody is either a first-party header or the bearer every other vendor reads', () => {
    expectTypeOf<KeyCustody['custody']>().toEqualTypeOf<'provider-key' | 'bearer'>();
    expectTypeOf<
      Extract<KeyCustody, { custody: 'provider-key' }>['provider']
    >().toEqualTypeOf<KeyProviderId>();
    expectTypeOf<Extract<KeyCustody, { custody: 'bearer' }>['provider']>().toEqualTypeOf<string>();
  });

  test('a runtime probe carries the address, the server it expects, and the id it answers', () => {
    expectTypeOf<keyof RuntimeProbeDirective>().toEqualTypeOf<
      'kind' | 'id' | 'address' | 'provider'
    >();
    expectTypeOf<RuntimeProbeDirective['address']>().toEqualTypeOf<string>();
    expectTypeOf<RuntimeProbeDirective['provider']>().toEqualTypeOf<LocalProviderId>();
  });

  test('a runtime probe carries no credential, because a server on this machine asks for none', () => {
    expectTypeOf<RuntimeProbeDirective>().not.toHaveProperty('key');
    expectTypeOf<RuntimeProbeDirective>().not.toHaveProperty('secret');
  });
});

describe('the report the child sends home', () => {
  test('a report is a state, a check, a model list, or an address, told apart by its kind', () => {
    expectTypeOf<EngineReport['kind']>().toEqualTypeOf<
      'state' | 'key-check' | 'runtime-check' | 'model-list' | 'claude-address'
    >();
  });

  test('a state report carries one gateway and the same state every surface reads', () => {
    expectTypeOf<
      Extract<EngineReport, { kind: 'state' }>['state']
    >().toEqualTypeOf<GatewayEngineState>();
  });

  test('a key check carries the verdict, the status, and the directive it answers, and nothing else', () => {
    expectTypeOf<keyof KeyCheckReportArm>().toEqualTypeOf<
      'kind' | 'answers' | 'verdict' | 'status'
    >();
    expectTypeOf<KeyCheckReportArm['verdict']>().toEqualTypeOf<KeyCheckVerdict>();
    expectTypeOf<KeyCheckReportArm['status']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<KeyCheckReportArm['answers']>().toEqualTypeOf<string>();
  });

  test('a key check carries no gateway and no field a vendor body could fill', () => {
    expectTypeOf<KeyCheckReportArm>().not.toHaveProperty('slug');
    expectTypeOf<KeyCheckReportArm>().not.toHaveProperty('state');
    expectTypeOf<KeyCheckReportArm>().not.toHaveProperty('body');
    expectTypeOf<KeyCheckReportArm>().not.toHaveProperty('key');
  });

  test('a runtime check carries the reading and the directive it answers, and nothing else', () => {
    expectTypeOf<keyof RuntimeCheckReportArm>().toEqualTypeOf<
      'kind' | 'answers' | 'reachability'
    >();
    expectTypeOf<RuntimeCheckReportArm['reachability']>().toEqualTypeOf<RuntimeReachability>();
    expectTypeOf<RuntimeCheckReportArm['answers']>().toEqualTypeOf<string>();
  });

  test('a runtime check speaks its own verdicts rather than the key-check triad', () => {
    expectTypeOf<RuntimeCheckReportArm['reachability']['verdict']>().toEqualTypeOf<
      'answers' | 'unrecognized' | 'unreachable'
    >();
    expectTypeOf<
      Extract<RuntimeCheckReportArm['reachability']['verdict'], KeyCheckVerdict>
    >().toEqualTypeOf<never>();
  });

  test('a runtime check carries no gateway, no address, and no body it read', () => {
    expectTypeOf<RuntimeCheckReportArm>().not.toHaveProperty('slug');
    expectTypeOf<RuntimeCheckReportArm>().not.toHaveProperty('address');
    expectTypeOf<RuntimeCheckReportArm>().not.toHaveProperty('body');
    expectTypeOf<RuntimeCheckReportArm>().not.toHaveProperty('verdict');
  });
});

describe('the binding snapshot the child serves a listing from', () => {
  test('a binding carries the id, the name, and the route table, and nothing else', () => {
    expectTypeOf<keyof EngineVirtualModel>().toEqualTypeOf<'id' | 'displayName' | 'routing'>();
    expectTypeOf<EngineVirtualModel['id']>().toEqualTypeOf<string>();
    expectTypeOf<EngineVirtualModel['displayName']>().toEqualTypeOf<string>();
  });

  test('a binding carries no credential under any name', () => {
    expectTypeOf<EngineVirtualModel>().not.toHaveProperty('credential');
    expectTypeOf<EngineVirtualModel>().not.toHaveProperty('key');
    expectTypeOf<EngineVirtualModel>().not.toHaveProperty('accountId');
  });

  test('a binding carries no target of its own, because the table holds every one', () => {
    expectTypeOf<EngineVirtualModel>().not.toHaveProperty('target');
    expectTypeOf<EngineVirtualModel['routing']>().toEqualTypeOf<EngineRouting>();
  });

  test('a target either stands bound to a real model or stands removed', () => {
    expectTypeOf<EngineTargetNode['standing']['standing']>().toEqualTypeOf<'bound' | 'removed'>();
    expectTypeOf<keyof BoundTarget>().toEqualTypeOf<'standing' | 'providerModel'>();
    expectTypeOf<BoundTarget['providerModel']>().toEqualTypeOf<string>();
    expectTypeOf<keyof RemovedTarget>().toEqualTypeOf<'standing'>();
  });
});

describe('the grant lane one spend rides', () => {
  test('a spend request names the gateway, the virtual model, and the node it is about to try', () => {
    expectTypeOf<keyof EngineSpendRequest>().toEqualTypeOf<
      'kind' | 'id' | 'slug' | 'virtualModel' | 'routeNode'
    >();
    expectTypeOf<EngineSpendRequest['kind']>().toEqualTypeOf<'spend-request'>();
    expectTypeOf<EngineSpendRequest['routeNode']>().toEqualTypeOf<string>();
  });

  test('a spend request carries no credential, because it is the ask for one', () => {
    expectTypeOf<EngineSpendRequest>().not.toHaveProperty('credential');
    expectTypeOf<EngineSpendRequest>().not.toHaveProperty('key');
  });

  test('a grant is resolved, a missing target, or a missing credential', () => {
    expectTypeOf<SpendGrant['verdict']>().toEqualTypeOf<
      'resolved' | 'missing-target' | 'missing-credential'
    >();
  });

  test('a resolved grant carries the origin and the spend it authorizes, and nothing else', () => {
    expectTypeOf<keyof ResolvedGrant>().toEqualTypeOf<'verdict' | 'providerOrigin' | 'spend'>();
    expectTypeOf<ResolvedGrant['providerOrigin']>().toEqualTypeOf<string>();
    expectTypeOf<ResolvedGrant>().not.toHaveProperty('credential');
  });

  test('a refusal names its state and carries no sentence and no credential', () => {
    expectTypeOf<keyof RefusedGrant>().toEqualTypeOf<'verdict'>();
    expectTypeOf<RefusedGrant['verdict']>().toEqualTypeOf<
      'missing-target' | 'missing-credential'
    >();
    expectTypeOf<RefusedGrant>().not.toHaveProperty('message');
    expectTypeOf<RefusedGrant>().not.toHaveProperty('credential');
  });

  test('a grant answers the spend request that asked and carries one grant', () => {
    expectTypeOf<keyof EngineSpendGrant>().toEqualTypeOf<'kind' | 'answers' | 'grant'>();
    expectTypeOf<EngineSpendGrant['kind']>().toEqualTypeOf<'spend-grant'>();
    expectTypeOf<EngineSpendGrant['answers']>().toEqualTypeOf<string>();
    expectTypeOf<EngineSpendGrant['grant']>().toEqualTypeOf<SpendGrant>();
  });
});

describe('the spend a resolved grant authorizes', () => {
  test('a spend names credentialed, open, or subscription custody', () => {
    expectTypeOf<GrantedSpend['custody']>().toEqualTypeOf<
      'credentialed' | 'open' | 'subscription'
    >();
  });

  test('a credentialed spend carries its provider, credential, and optional account identity', () => {
    expectTypeOf<keyof CredentialedSpend>().toEqualTypeOf<
      'custody' | 'provider' | 'credential' | 'accountId' | 'isCompat' | 'dialect'
    >();
    expectTypeOf<CredentialedSpend['dialect']>().toEqualTypeOf<ProviderDialect | undefined>();
    expectTypeOf<CredentialedSpend['provider']>().toEqualTypeOf<string>();
    expectTypeOf<CredentialedSpend['credential']>().toEqualTypeOf<string>();
    expectTypeOf<CredentialedSpend['accountId']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<CredentialedSpend['isCompat']>().toEqualTypeOf<boolean | undefined>();
  });

  test('an open spend admits no credential key at all, rather than an absent one', () => {
    expectTypeOf<OpenSpend>().toEqualTypeOf<{ custody: 'open' }>();
    expectTypeOf<keyof OpenSpend>().toEqualTypeOf<'custody'>();
    expectTypeOf<OpenSpend>().not.toHaveProperty('credential');
  });

  test('a subscription spend carries the provider account and whole credential document', () => {
    expectTypeOf<keyof SubscriptionSpend>().toEqualTypeOf<
      'custody' | 'provider' | 'accountId' | 'credential' | 'renewal' | 'transportPolicy'
    >();
  });

  test('a subscription spend names who renews its credential, and never leaves the answer out', () => {
    expectTypeOf<SubscriptionSpend['renewal']>().toEqualTypeOf<'app' | 'owning-tool'>();
    expectTypeOf<{
      custody: 'subscription';
      provider: SubscriptionProviderId;
      accountId: string;
      credential: string;
    }>().not.toExtend<SubscriptionSpend>();
  });

  test('a look at a subscription carries the same renewal owner the spend does', () => {
    expectTypeOf<SubscriptionLook['renewal']>().toEqualTypeOf<'app' | 'owning-tool'>();
    expectTypeOf<keyof SubscriptionLook>().toEqualTypeOf<keyof SubscriptionSpend>();
  });

  test('no other spend names a renewal owner, because only a subscription credential expires', () => {
    expectTypeOf<CredentialedSpend>().not.toHaveProperty('renewal');
    expectTypeOf<OpenSpend>().not.toHaveProperty('renewal');
  });

  test('a refusal authorizes no spend', () => {
    expectTypeOf<RefusedGrant>().not.toHaveProperty('spend');
  });
});
