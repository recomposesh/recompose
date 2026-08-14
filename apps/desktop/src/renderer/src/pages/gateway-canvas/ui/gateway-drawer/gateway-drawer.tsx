import type { ReactNode } from 'react';

import {
  DEFAULT_GATEWAY_BIND_ADDRESS,
  targetTheEntryNames,
  type Account,
  type GatewayConfig,
  type SubscriptionAccountView,
  type VirtualModel,
} from '@recompose/contracts';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

import type { SettledDefinition } from '../../lib/model-draft';
import type { ServedModel } from '../../model/served-models';

import {
  accountsQueryOptions,
  engineStatesQueryOptions,
  gatewayStateIn,
  settingsQueryOptions,
  subscriptionsQueryOptions,
} from '../../../../shared/api';
import { subscribeToPanelWidths } from '../../../../shared/lib';
import { inspectorWidth } from '../../lib/inspector-width';
import { servedModels } from '../../model/served-models';
import { DraftInspector } from '../draft-inspector/draft-inspector';
import {
  gatewayBody,
  ghostBody,
  modelBody,
  routerBody,
  targetBody,
} from '../subject-bodies/subject-bodies';
import { glyph, subjectHead } from '../subject-shell/subject-shell';

/**
 * Where in a virtual model's routing a selected card or cable seats.
 *
 * @summary The entry carries no id of its own in a card's name, because every card a gateway stood
 * before routers existed keeps the name it stood under, so nothing here reads as the entry.
 */
type SeatedInRouting = { modelId: string; routeNodeId?: string | undefined };

/** What stands selected on the canvas, which is the one thing the inspector speaks for. */
export type InspectorSubject =
  | { kind: 'gateway' }
  | { kind: 'virtual-model'; modelId: string }
  | ({ kind: 'cable' } & SeatedInRouting)
  | ({ kind: 'router' } & SeatedInRouting)
  | ({ kind: 'target'; accountId: string } & SeatedInRouting)
  | ({ kind: 'ghost-target'; accountId: string } & SeatedInRouting)
  | { kind: 'draft' };

type GatewayDrawerProps = {
  /** The gateway the drawer speaks for, which is the one the route selected. */
  gateway: GatewayConfig;
  /** The selection subject the body reads, which is the gateway itself when nothing stands. */
  subject: InspectorSubject;
  /** The sentence a refused write left behind, or nothing while every write landed. */
  refusal: string | undefined;
  /** Whether the drawer is on its way off screen, which is what plays its exit. */
  leaving?: boolean;
  /** Opens the confirmation for the gateway, virtual model, or target the drawer reads. */
  onAskRemoval: (nodeId: string) => void;
  /** Receives the definition the moment a draft saved through the inspector graduates. */
  onDraftDefined: (definition: SettledDefinition) => void;
  /** Hears the model id a rename settled on, so the selection can follow the definition. */
  onModelRenamed: (modelId: string) => void;
};

type DrawerWorld = {
  gateway: GatewayConfig;
  accounts: readonly Account[];
  subscriptions: readonly SubscriptionAccountView[];
  onAskRemoval: (nodeId: string) => void;
  onDraftDefined: (definition: SettledDefinition) => void;
  onModelRenamed: (modelId: string) => void;
};

function modelHeldBy(world: DrawerWorld, modelId: string): VirtualModel | undefined {
  return world.gateway.virtualModels.find((held) => held.id === modelId);
}

function bindingSubjectBody(
  world: DrawerWorld,
  subject: Extract<InspectorSubject, { modelId: string }>,
): ReactNode | undefined {
  const model = modelHeldBy(world, subject.modelId);

  if (model === undefined) {
    return undefined;
  }

  const bound = targetTheEntryNames(model.routing);
  const account = world.accounts.find((held) => held.id === bound?.accountId);

  return modelBody(
    world.gateway,
    model,
    account,
    world.subscriptions,
    subject.kind === 'cable' ? 'Binding' : 'Virtual model',
    () => {
      world.onAskRemoval(`model:${model.id}`);
    },
    world.onModelRenamed,
  );
}

function accountSubjectBody(
  world: DrawerWorld,
  accountId: string,
  modelId: string,
): ReactNode | undefined {
  const account = world.accounts.find((held) => held.id === accountId);
  const models = world.gateway.virtualModels.filter(
    (model) => targetTheEntryNames(model.routing)?.accountId === accountId,
  );

  return account === undefined
    ? undefined
    : targetBody(account, world.subscriptions, models, () => {
        world.onAskRemoval(`target:${modelId}`);
      });
}

function routerSubjectBody(
  world: DrawerWorld,
  subject: Extract<InspectorSubject, { kind: 'router' }>,
): ReactNode | undefined {
  const model = modelHeldBy(world, subject.modelId);

  if (model === undefined) {
    return undefined;
  }

  const seat = subject.routeNodeId ?? model.routing.entry;
  const node = model.routing.nodes[seat];

  return node?.kind === 'router'
    ? routerBody(world.gateway, model, seat, node, world.accounts)
    : undefined;
}

function routedSubjectBody(subject: InspectorSubject, world: DrawerWorld): ReactNode | undefined {
  if (subject.kind === 'virtual-model' || subject.kind === 'cable') {
    return bindingSubjectBody(world, subject);
  }

  return subject.kind === 'router' ? routerSubjectBody(world, subject) : undefined;
}

function boundSubjectBody(subject: InspectorSubject, world: DrawerWorld): ReactNode | undefined {
  if (subject.kind === 'target') {
    return accountSubjectBody(world, subject.accountId, subject.modelId);
  }

  return subject.kind === 'ghost-target' ? ghostBody(subject.accountId) : undefined;
}

function cardSubjectBody(subject: InspectorSubject, world: DrawerWorld): ReactNode | undefined {
  return routedSubjectBody(subject, world) ?? boundSubjectBody(subject, world);
}

function draftBody(world: DrawerWorld): ReactNode {
  const { gateway, onDraftDefined } = world;

  return (
    <>
      {subjectHead({
        lead: glyph('spark'),
        leadClasses: 'bg-virtual-model text-highlight-ink',
        kicker: 'Draft',
        name: 'Virtual model',
      })}
      <DraftInspector gateway={gateway} onDefined={onDraftDefined} />
    </>
  );
}

type ServingFacts = {
  served: readonly ServedModel[];
  status: 'running' | 'stopped';
  bindAddress: string;
};

function subjectBody(
  subject: InspectorSubject,
  world: DrawerWorld,
  serving: ServingFacts,
): ReactNode {
  if (subject.kind === 'draft') {
    return draftBody(world);
  }

  return (
    cardSubjectBody(subject, world) ??
    gatewayBody(world.gateway, serving.served, serving.status, serving.bindAddress, () => {
      world.onAskRemoval('gateway');
    })
  );
}

function refusedWrite(refusal: string | undefined): ReactNode {
  return refusal === undefined ? null : (
    <p
      className="mx-3.5 mt-2 rounded-control border border-danger/30 bg-danger/10 px-2.5 py-2 text-caption text-ink"
      role="alert"
    >
      {refusal}
    </p>
  );
}

/**
 * The inspector beside the canvas, holding one body per selection subject.
 *
 * @summary The subject decides what the drawer says: the gateway reads as its endpoint and what
 * serves, a virtual model and a cable read as the binding they share, a target reads as the
 * account behind it, and a draft edits right here. Adding a virtual model has no button in this
 * panel, because the plus on the canvas is the one add path.
 */
export function GatewayDrawer({
  gateway,
  subject,
  refusal,
  leaving = false,
  onAskRemoval,
  onDraftDefined,
  onModelRenamed,
}: GatewayDrawerProps) {
  const { data: registry } = useSuspenseQuery(accountsQueryOptions);
  const { data: states } = useSuspenseQuery(engineStatesQueryOptions);
  const { data: settings } = useSuspenseQuery(settingsQueryOptions);
  const { data: subscriptions } = useSuspenseQuery(subscriptionsQueryOptions);
  const width = useSyncExternalStore(subscribeToPanelWidths, inspectorWidth);
  const world: DrawerWorld = {
    gateway,
    accounts: registry.accounts,
    subscriptions,
    onAskRemoval,
    onDraftDefined,
    onModelRenamed,
  };

  const body = subjectBody(subject, world, {
    served: servedModels(gateway.virtualModels, registry.accounts),
    status: gatewayStateIn(states, gateway.slug).status,
    bindAddress: settings.bindAddress ?? DEFAULT_GATEWAY_BIND_ADDRESS,
  });

  return (
    <aside
      aria-label="Inspector"
      data-panel-control=""
      data-focus-group=""
      className={`shrink-0 overflow-hidden border-s border-line-subtle bg-surface-toolbar ${leaving ? 'inspector-panel-leaving' : 'inspector-panel'}`}
      style={{ width }}
    >
      <div className="flex h-full shrink-0 flex-col" style={{ width }}>
        {refusedWrite(refusal)}
        {body}
      </div>
    </aside>
  );
}
