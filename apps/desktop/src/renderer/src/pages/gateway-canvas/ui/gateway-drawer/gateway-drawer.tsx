import type { ReactNode } from 'react';

import {
  DEFAULT_GATEWAY_BIND_ADDRESS,
  type Account,
  type GatewayConfig,
  type SubscriptionAccountView,
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
import { gatewayBody, ghostBody, modelBody, targetBody } from '../subject-bodies/subject-bodies';
import { glyph, subjectHead } from '../subject-shell/subject-shell';

/** What stands selected on the canvas, which is the one thing the inspector speaks for. */
export type InspectorSubject =
  | { kind: 'gateway' }
  | { kind: 'virtual-model'; modelId: string }
  | { kind: 'cable'; modelId: string }
  | { kind: 'target'; accountId: string; modelId: string }
  | { kind: 'ghost-target'; accountId: string; modelId: string }
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

function bindingSubjectBody(
  world: DrawerWorld,
  subject: Extract<InspectorSubject, { modelId: string }>,
): ReactNode | undefined {
  const model = world.gateway.virtualModels.find((held) => held.id === subject.modelId);

  if (model === undefined) {
    return undefined;
  }

  const account = world.accounts.find((held) => held.id === model.target.accountId);

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
    (model) => model.target.accountId === accountId,
  );

  return account === undefined
    ? undefined
    : targetBody(account, world.subscriptions, models, () => {
        world.onAskRemoval(`target:${modelId}`);
      });
}

function cardSubjectBody(subject: InspectorSubject, world: DrawerWorld): ReactNode | undefined {
  if (subject.kind === 'virtual-model' || subject.kind === 'cable') {
    return bindingSubjectBody(world, subject);
  }

  if (subject.kind === 'target') {
    return accountSubjectBody(world, subject.accountId, subject.modelId);
  }

  return subject.kind === 'ghost-target' ? ghostBody(subject.accountId) : undefined;
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
