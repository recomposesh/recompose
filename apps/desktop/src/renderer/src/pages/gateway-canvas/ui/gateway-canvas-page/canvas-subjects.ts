import type { GatewayConfig } from '@recompose/contracts';

import type { InspectorSubject } from '../gateway-drawer/gateway-drawer';

import { modelIdOf, targetAccountIdIn } from './canvas-wiring';
import { routeNodeIn, seatUnder, seatWritten } from './route-seats';

const DRAFT_CARD = 'draft';

function modelSubject(selection: string): InspectorSubject | undefined {
  const modelId = modelIdOf(selection);

  return modelId === undefined ? undefined : { kind: 'virtual-model', modelId };
}

function cableSubject(selection: string): InspectorSubject | undefined {
  const seat = seatUnder(['cable:'], selection);

  return seat === undefined ? undefined : { kind: 'cable', ...seat };
}

function targetSubject(gateway: GatewayConfig, selection: string): InspectorSubject | undefined {
  const seat = seatUnder(['target:', 'ghost:'], selection);
  const accountId = targetAccountIdIn(gateway, selection);

  if (seat === undefined || accountId === undefined) {
    return undefined;
  }

  return selection.startsWith('ghost:')
    ? { kind: 'ghost-target', accountId, ...seat }
    : { kind: 'target', accountId, ...seat };
}

function routerSubject(gateway: GatewayConfig, selection: string): InspectorSubject | undefined {
  const seat = seatUnder(['route:'], selection);

  if (seat === undefined || routeNodeIn(gateway, seat)?.kind !== 'router') {
    return undefined;
  }

  return { kind: 'router', ...seat };
}

function prefixedSubject(gateway: GatewayConfig, selection: string): InspectorSubject | undefined {
  return (
    modelSubject(selection) ??
    cableSubject(selection) ??
    routerSubject(gateway, selection) ??
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

  return subject.kind === 'cable' ? `cable:${seatWritten(subject)}` : undefined;
}

function routeCardOf(subject: InspectorSubject): string | undefined {
  if (subject.kind === 'router') {
    return `route:${seatWritten(subject)}`;
  }

  if (subject.kind === 'target') {
    return `target:${seatWritten(subject)}`;
  }

  return subject.kind === 'ghost-target' ? `ghost:${seatWritten(subject)}` : undefined;
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
