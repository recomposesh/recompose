import type { Account, GatewayConfig, VirtualModel } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { useSuspenseQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

import type { IconName } from '../../../../shared/ui';
import type { SettledDefinition } from '../../lib/model-draft';
import type { ServedModel } from '../../model/served-models';

import { accountKindTitle, accountName } from '../../../../entities/account';
import {
  accountsQueryOptions,
  engineStatesQueryOptions,
  gatewayStateIn,
} from '../../../../shared/api';
import { subscribeToPanelWidths } from '../../../../shared/lib';
import { CopyButton, Icon, stateMark, stateWord } from '../../../../shared/ui';
import { inspectorWidth } from '../../lib/inspector-width';
import { servedModels, servesTally } from '../../model/served-models';
import { DraftInspector } from '../draft-inspector/draft-inspector';
import { ServedModelRow } from '../served-model-row/served-model-row';

/** What stands selected on the canvas, which is the one thing the inspector speaks for. */
export type InspectorSubject =
  | { kind: 'gateway' }
  | { kind: 'virtual-model'; modelId: string }
  | { kind: 'cable'; modelId: string }
  | { kind: 'target'; accountId: string }
  | { kind: 'ghost-target'; accountId: string }
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
  /** Receives the definition the moment a draft saved through the inspector graduates. */
  onDraftDefined: (definition: SettledDefinition) => void;
};

type SubjectHead = { glyph: IconName; kicker: string; name: string; line: string };

function subjectHead({ glyph, kicker, name, line }: SubjectHead): ReactNode {
  return (
    <header className="flex items-center gap-2.5 px-4 pt-4 pb-1">
      <span className="flex size-7.5 shrink-0 items-center justify-center rounded-control bg-accent text-highlight-ink">
        <Icon className="size-4" name={glyph} />
      </span>
      <div className="min-w-0">
        <p className="text-footnote font-bold tracking-wider text-ink-secondary uppercase">
          {kicker}
        </p>
        <h2 className="truncate text-heading text-ink">{name}</h2>
        <p className="truncate font-mono text-mono-value text-accent-ink">{line}</p>
      </div>
    </header>
  );
}

function factRow(label: string, value: ReactNode, control?: ReactNode): ReactNode {
  return (
    <div className="flex min-h-sheet-row items-center gap-2 border-t border-line-faint px-3 py-1.5 first:border-t-0">
      <span className="shrink-0 text-control text-ink">{label}</span>
      <span className="ms-auto truncate font-mono text-mono-value text-ink">{value}</span>
      {control}
    </div>
  );
}

function endpointBox(gateway: GatewayConfig, status: 'running' | 'stopped'): ReactNode {
  const baseUrl = `http://localhost:${String(gateway.port)}`;

  return (
    <div className="field-box">
      {factRow('Base URL', baseUrl, <CopyButton label="Copy base URL" value={baseUrl} />)}
      <div className="flex min-h-sheet-row items-center gap-2 border-t border-line-faint px-3 py-1.5">
        <span className="text-control text-ink">Status</span>
        <span className="ms-auto flex items-center gap-1.5 text-detail text-ink">
          <span aria-hidden className={`size-1.75 shrink-0 rounded-pill ${stateMark[status]}`} />
          {stateWord[status]}
        </span>
      </div>
    </div>
  );
}

function sectionHeading(title: string, tally?: ReactNode): ReactNode {
  return (
    <h3 className="mt-3.5 mb-1.5 flex min-w-0 items-center gap-1.5 px-1 text-caption font-bold text-ink-secondary">
      <span className="shrink-0">{title}</span>
      {tally}
    </h3>
  );
}

function servesBox(served: readonly ServedModel[]): ReactNode {
  if (served.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 field-box px-4 py-5 text-center">
        <p className="text-control font-semibold text-ink-secondary">Nothing serves yet</p>
        <p className="text-detail text-ink-secondary">
          Pull a cable from the gateway&apos;s port to add a virtual model.
        </p>
      </div>
    );
  }

  return (
    <ul className="field-box">
      {served.map((model) => (
        <ServedModelRow key={model.id} served={model} />
      ))}
    </ul>
  );
}

function subjectShell(head: SubjectHead, body: ReactNode): ReactNode {
  return (
    <>
      {subjectHead(head)}
      <div className="flex-1 overflow-y-auto px-3.5 pb-4">{body}</div>
    </>
  );
}

function servesTallyLine(served: readonly ServedModel[]): ReactNode {
  return served.length === 0 ? null : (
    <span className="min-w-0 truncate font-medium text-ink-secondary">
      · {servesTally(served.length)}
    </span>
  );
}

function gatewayBody(
  gateway: GatewayConfig,
  served: readonly ServedModel[],
  status: 'running' | 'stopped',
): ReactNode {
  return subjectShell(
    { glyph: 'network', kicker: 'Gateway', name: gateway.displayName, line: gateway.slug },
    <>
      {sectionHeading('Endpoint')}
      {endpointBox(gateway, status)}
      {sectionHeading('Serves', servesTallyLine(served))}
      {servesBox(served)}
    </>,
  );
}

function modelBody(
  model: VirtualModel,
  account: Account | undefined,
  kicker: 'Virtual model' | 'Binding',
): ReactNode {
  return subjectShell(
    { glyph: 'spark', kicker, name: model.displayName, line: model.id },
    <div className="mt-3.5 field-box">
      {factRow('Model id', model.id, <CopyButton label="Copy model id" value={model.id} />)}
      {factRow('Target', account === undefined ? model.target.accountId : accountName(account))}
      {factRow('Model', model.target.providerModel)}
    </div>,
  );
}

function targetBody(account: Account): ReactNode {
  return subjectShell(
    { glyph: 'network', kicker: 'Target', name: accountName(account), line: account.provider },
    <div className="mt-3.5 field-box">
      {factRow('Provider', account.provider)}
      {factRow('Kind', accountKindTitle(account.kind))}
    </div>,
  );
}

function ghostBody(accountId: string): ReactNode {
  return subjectShell(
    { glyph: 'close', kicker: 'Removed', name: accountId, line: 'not in the registry' },
    <p className="mt-3.5 field-box px-3 py-2.5 text-detail text-ink-secondary">
      This account left the registry. The binding holds until a cable gesture repairs it.
    </p>,
  );
}

type DrawerWorld = {
  gateway: GatewayConfig;
  accounts: readonly Account[];
  onDraftDefined: (definition: SettledDefinition) => void;
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

  return modelBody(model, account, subject.kind === 'cable' ? 'Binding' : 'Virtual model');
}

function accountSubjectBody(world: DrawerWorld, accountId: string): ReactNode | undefined {
  const account = world.accounts.find((held) => held.id === accountId);

  return account === undefined ? undefined : targetBody(account);
}

function cardSubjectBody(subject: InspectorSubject, world: DrawerWorld): ReactNode | undefined {
  if (subject.kind === 'virtual-model' || subject.kind === 'cable') {
    return bindingSubjectBody(world, subject);
  }

  if (subject.kind === 'target') {
    return accountSubjectBody(world, subject.accountId);
  }

  return subject.kind === 'ghost-target' ? ghostBody(subject.accountId) : undefined;
}

function draftBody(world: DrawerWorld): ReactNode {
  const { gateway, onDraftDefined } = world;

  return (
    <>
      {subjectHead({
        glyph: 'spark',
        kicker: 'Draft',
        name: 'Virtual model',
        line: 'not stored yet',
      })}
      <DraftInspector gateway={gateway} onDefined={onDraftDefined} />
    </>
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
  onDraftDefined,
}: GatewayDrawerProps) {
  const { data: registry } = useSuspenseQuery(accountsQueryOptions);
  const { data: states } = useSuspenseQuery(engineStatesQueryOptions);
  const width = useSyncExternalStore(subscribeToPanelWidths, inspectorWidth);
  const world: DrawerWorld = { gateway, accounts: registry.accounts, onDraftDefined };

  const body =
    subject.kind === 'draft'
      ? draftBody(world)
      : (cardSubjectBody(subject, world) ??
        gatewayBody(
          gateway,
          servedModels(gateway.virtualModels, registry.accounts),
          gatewayStateIn(states, gateway.slug).status,
        ));

  return (
    <aside
      data-panel-control=""
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
