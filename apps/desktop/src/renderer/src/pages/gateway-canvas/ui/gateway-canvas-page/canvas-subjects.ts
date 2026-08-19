import type { GatewayConfig } from '@recompose/contracts';

import type { RouteAddress } from '../../lib/route-addresses';

import { addressUnder, addressWritten, routeNodeIn } from '../../lib/route-addresses';
import { walkedRouteNodes } from '../../lib/route-graph';
import { modelIdOf, targetAccountIdIn } from './canvas-wiring';

const DRAFT_CARD = 'draft';

/**
 * What stands selected on the canvas, which is the one thing the inspector speaks for.
 *
 * @summary It lives beside the pair that reads a card into one and names a card back out of one,
 * so a surface speaking about a subject asks that pair for the card rather than spelling an id of
 * its own: a surface holding the address but naming only the model would speak about the entry
 * whichever card a person actually selected.
 */
export type InspectorSubject =
  | { kind: 'gateway' }
  | { kind: 'virtual-model'; modelId: string }
  | ({ kind: 'cable' } & RouteAddress)
  | ({ kind: 'router' } & RouteAddress)
  | ({ kind: 'judge' } & RouteAddress)
  | ({ kind: 'target'; accountId: string } & RouteAddress)
  | ({ kind: 'ghost-target'; accountId: string } & RouteAddress)
  | { kind: 'draft' };

function modelSubject(selection: string): InspectorSubject | undefined {
  const modelId = modelIdOf(selection);

  return modelId === undefined ? undefined : { kind: 'virtual-model', modelId };
}

function cableSubject(selection: string): InspectorSubject | undefined {
  const address = addressUnder(['cable:'], selection);

  return address === undefined ? undefined : { kind: 'cable', ...address };
}

function targetSubject(gateway: GatewayConfig, selection: string): InspectorSubject | undefined {
  const address = addressUnder(['target:', 'ghost:'], selection);
  const accountId = targetAccountIdIn(gateway, selection);

  if (address === undefined || accountId === undefined) {
    return undefined;
  }

  return selection.startsWith('ghost:')
    ? { kind: 'ghost-target', accountId, ...address }
    : { kind: 'target', accountId, ...address };
}

function routerSubject(gateway: GatewayConfig, selection: string): InspectorSubject | undefined {
  const address = addressUnder(['route:'], selection);

  if (address === undefined || routeNodeIn(gateway, address)?.kind !== 'router') {
    return undefined;
  }

  return { kind: 'router', ...address };
}

/**
 * Whether one route node stands as a judge, which is what tells an advisor from a plain target.
 *
 * @summary The canvas reads it off the same walk the cards come from rather than off the id alone,
 * because a card prefix is a name a caller can spell and a person selecting a child would then
 * meet the judge's body instead of the target's.
 */
function standsAsAJudge(gateway: GatewayConfig, address: RouteAddress): boolean {
  const model = gateway.virtualModels.find((held) => held.id === address.modelId);

  if (model === undefined) {
    return false;
  }

  return walkedRouteNodes(model.routing).some(
    (walked) => walked.routeNodeId === address.routeNodeId && walked.advises !== undefined,
  );
}

function judgeSubject(gateway: GatewayConfig, selection: string): InspectorSubject | undefined {
  const address = addressUnder(['judge:'], selection);

  if (address === undefined || !standsAsAJudge(gateway, address)) {
    return undefined;
  }

  return { kind: 'judge', ...address };
}

function prefixedSubject(gateway: GatewayConfig, selection: string): InspectorSubject | undefined {
  return (
    modelSubject(selection) ??
    cableSubject(selection) ??
    routerSubject(gateway, selection) ??
    judgeSubject(gateway, selection) ??
    targetSubject(gateway, selection)
  );
}

/**
 * The subject the inspector speaks for, read off whatever stands selected.
 *
 * @summary Nothing selected reads as the gateway, because the gateway is what the whole screen is
 * about, and a selection with no body of its own falls back the same way rather than standing the
 * inspector in front of nothing. A target card names the binding it serves, so the account behind
 * it reads through the gateway rather than out of the card's id.
 */
export function subjectOf(gateway: GatewayConfig, selection: string | undefined): InspectorSubject {
  if (selection === undefined) {
    return { kind: 'gateway' };
  }

  if (selection === DRAFT_CARD) {
    return { kind: 'draft' };
  }

  return prefixedSubject(gateway, selection) ?? { kind: 'gateway' };
}

function modelCardOf(subject: InspectorSubject): string | undefined {
  if (subject.kind === 'virtual-model') {
    return `model:${subject.modelId}`;
  }

  return subject.kind === 'cable' ? `cable:${addressWritten(subject)}` : undefined;
}

function routeCardOf(subject: InspectorSubject): string | undefined {
  if (subject.kind === 'router') {
    return `route:${addressWritten(subject)}`;
  }

  if (subject.kind === 'judge') {
    return `judge:${addressWritten(subject)}`;
  }

  if (subject.kind === 'target') {
    return `target:${addressWritten(subject)}`;
  }

  return subject.kind === 'ghost-target' ? `ghost:${addressWritten(subject)}` : undefined;
}

/**
 * The card a subject stands for, or nothing where the subject is the gateway itself.
 *
 * @summary The inverse of `subjectOf`, so a surface that speaks about a subject can move the one
 * canvas selection onto it without spelling a card id out for itself. The two live side by side on
 * purpose: a change to how a card is named has to move both, and the round trip is what proves it
 * did. The gateway stands for no card, because selecting nothing is what reads as the gateway.
 */
export function nodeIdOf(subject: InspectorSubject): string | undefined {
  return subject.kind === 'draft' ? DRAFT_CARD : (modelCardOf(subject) ?? routeCardOf(subject));
}
