import type {
  Account,
  GatewayConfig,
  SubscriptionAccountView,
  VirtualModel,
} from '@recompose/contracts';
import type { ReactNode } from 'react';

import { nameOfRouter, targetTheEntryNames } from '@recompose/contracts';

import type { IconName } from '../../../../shared/ui';
import type { ServedModel } from '../../model/served-models';
import type { StoredRouter } from '../router-inspector/router-inspector';

import { accountKindName, accountMark, accountProductName } from '../../../../entities/account';
import { openConnectSheet } from '../../../../shared/lib';
import { BrandMark, Button, CopyButton } from '../../../../shared/ui';
import { accountKindTextTint } from '../../lib/account-kind-paint';
import { servesTally } from '../../model/served-models';
import { EndpointBox } from '../endpoint-box/endpoint-box';
import { GatewayAccess } from '../gateway-access/gateway-access';
import { GatewayGeneralInfo } from '../gateway-general-info/gateway-general-info';
import { ModelGeneralInfo } from '../model-general-info/model-general-info';
import { RouterInspector } from '../router-inspector/router-inspector';
import { ServesBox } from '../serves-box/serves-box';
import { factRow, glyph, sectionHeading, subjectShell } from '../subject-shell/subject-shell';

function servesTallyLine(served: readonly ServedModel[]): ReactNode {
  return served.length === 0 ? null : (
    <span className="min-w-0 truncate font-medium text-ink-secondary">
      · {servesTally(served.length)}
    </span>
  );
}

/**
 * The way into the connect guide, offered wherever a person reads what a gateway serves.
 *
 * @summary The toolbar carries the same control, and a person standing in the drawer is already
 * looking at the address and the model ids the guide writes its blocks from, which is where the
 * question of how to reach them comes up.
 */
function instructionsControl(): ReactNode {
  return (
    <Button fullWidth glyph="book" onPress={openConnectSheet} variant="secondary">
      See instructions
    </Button>
  );
}

/** The gateway subject's body: its own facts, the endpoint, and what serves. */
export function gatewayBody(
  gateway: GatewayConfig,
  served: readonly ServedModel[],
  status: 'running' | 'stopped',
  bindAddress: string,
  onDelete: () => void,
): ReactNode {
  return subjectShell(
    {
      lead: glyph('network'),
      leadClasses: 'bg-gateway text-highlight-ink',
      kicker: 'Gateway',
      name: gateway.displayName,
    },
    <>
      <GatewayGeneralInfo gateway={gateway} />
      <GatewayAccess gateway={gateway} />
      {sectionHeading('Endpoint')}
      <EndpointBox bindAddress={bindAddress} gateway={gateway} status={status} />
      {sectionHeading('Serves', servesTallyLine(served))}
      <ServesBox served={served} />
    </>,
    { label: 'Delete gateway', onPress: onDelete },
    instructionsControl(),
  );
}

const accountGlyphs: Record<Account['kind'], IconName> = {
  subscription: 'renew',
  'api-key': 'key',
  aggregator: 'network',
  local: 'cube',
};

function accountLead(account: Account): ReactNode {
  const mark = accountMark(account);

  return mark === undefined ? (
    glyph(accountGlyphs[account.kind])
  ) : (
    <BrandMark className="size-4" name={mark} variant="mono" />
  );
}

function subscriptionEmail(
  account: Extract<Account, { kind: 'subscription' }>,
  subscriptions: readonly SubscriptionAccountView[],
): string {
  return subscriptions.find((view) => view.id === account.id)?.signedInAs ?? account.label;
}

function encryptedKey(account: Extract<Account, { kind: 'api-key' | 'aggregator' }>): ReactNode {
  return (
    <span className="font-mono text-mono-value">
      <span aria-hidden>{`••••${account.keyTail ?? ''}`}</span>
      <span className="sr-only">an encrypted key</span>
    </span>
  );
}

function accountSpecificRow(
  account: Account,
  subscriptions: readonly SubscriptionAccountView[],
): ReactNode {
  if (account.kind === 'subscription') {
    return factRow('Email', subscriptionEmail(account, subscriptions));
  }

  if (account.kind === 'local') {
    return factRow('Address', account.address);
  }

  return factRow('Encrypted key', encryptedKey(account));
}

/** The three rows every account reads as in the drawer, whichever body is asking. */
export function targetFacts(
  account: Account,
  subscriptions: readonly SubscriptionAccountView[],
): ReactNode {
  return (
    <>
      {factRow('Provider type', accountKindName(account.kind))}
      {factRow('Provider', accountProductName(account))}
      {accountSpecificRow(account, subscriptions)}
    </>
  );
}

/** The virtual model subject's body: the definition, and the target it goes to. */
export function modelBody(
  gateway: GatewayConfig,
  model: VirtualModel,
  account: Account | undefined,
  subscriptions: readonly SubscriptionAccountView[],
  kicker: 'Virtual model' | 'Binding',
  onDelete: () => void,
  onRenamed: (modelId: string) => void,
): ReactNode {
  const bound = targetTheEntryNames(model.routing);

  return subjectShell(
    {
      lead: glyph('spark'),
      leadClasses: 'bg-virtual-model text-highlight-ink',
      kicker,
      name: model.displayName,
    },
    <>
      <ModelGeneralInfo gateway={gateway} model={model} onRenamed={onRenamed} />
      {account === undefined || bound === undefined ? null : (
        <>
          {sectionHeading('Goes to')}
          <div className="field-box">
            {targetFacts(account, subscriptions)}
            {factRow('Model', bound.providerModel)}
          </div>
        </>
      )}
    </>,
    { label: 'Delete virtual model', onPress: onDelete },
    instructionsControl(),
  );
}

/**
 * The router subject's body: how it spreads its requests, and the children it spreads over.
 *
 * @summary It carries the deletion footer every other card subject carries, because a router is a
 * card a person put on the canvas and the Delete key alone would leave the pointer with no way off
 * it. The question the link raises names the router and what leaves with it, the same way the key's
 * does, so the two paths differ in nothing but which hand a person reached with.
 */
export function routerBody(
  gateway: GatewayConfig,
  model: VirtualModel,
  routeNodeId: string,
  router: StoredRouter,
  accounts: readonly Account[],
  acts: { onDelete: () => void; onSelectNode: (nodeId: string) => void },
): ReactNode {
  const { onSelectNode } = acts;

  return subjectShell(
    {
      lead: glyph('branch'),
      leadClasses: 'bg-router text-highlight-ink',
      kicker: 'Router',
      name: nameOfRouter(router.policy.mode, router.displayName),
    },
    <RouterInspector
      accounts={accounts}
      gateway={gateway}
      model={model}
      onSelectNode={onSelectNode}
      routeNodeId={routeNodeId}
      router={router}
    />,
    { label: 'Delete router', onPress: acts.onDelete },
  );
}

/** The target subject's body: the stored account, and the definitions behind it. */
export function targetBody(
  account: Account,
  subscriptions: readonly SubscriptionAccountView[],
  models: readonly VirtualModel[],
  onDelete: () => void,
): ReactNode {
  const tint = accountKindTextTint[account.kind];

  return subjectShell(
    {
      lead: accountLead(account),
      leadClasses: `bg-current/12 ${tint}`,
      kicker: accountKindName(account.kind),
      name: accountProductName(account),
    },
    <>
      {sectionHeading('General info')}
      <div className="field-box">{targetFacts(account, subscriptions)}</div>
      {models.length === 0 ? null : (
        <>
          {sectionHeading('Serves')}
          <div className="flex flex-col gap-2">
            {models.map((model) => (
              <div className="field-box" key={model.id}>
                {factRow('Model name', model.displayName)}
                {factRow(
                  'Model id',
                  model.id,
                  <CopyButton label="Copy model id" value={model.id} />,
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </>,
    { label: 'Delete provider', onPress: onDelete },
  );
}

/** The removed subject's body: the gap an account left behind, and what repairs it. */
export function ghostBody(accountId: string): ReactNode {
  return subjectShell(
    {
      lead: glyph('close'),
      leadClasses: 'bg-danger text-highlight-ink',
      kicker: 'Removed',
      name: accountId,
    },
    <p className="mt-3.5 field-box px-3 py-2.5 text-detail text-ink-secondary">
      This account left the registry. The binding holds until a cable gesture repairs it.
    </p>,
  );
}
