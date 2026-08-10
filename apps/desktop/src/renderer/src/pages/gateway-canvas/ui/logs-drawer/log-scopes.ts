import type { Account, GatewayConfig } from '@recompose/contracts';

import type { InspectorSubject } from '../gateway-drawer/gateway-drawer';

import { accountName } from '../../../../entities/account';
import { nodeIdOf } from '../gateway-canvas-page/canvas-wiring';

/** The scope every request falls under, which is the gateway itself. */
export const EVERY_REQUEST = 'all';

/**
 * How many exclusive scopes the header keeps in reach before the rest go behind the overflow.
 *
 * @summary The whole-gateway scope counts toward it, so a gateway serving four virtual models reads
 * as one strip and a busier one reads as a strip plus a menu rather than a strip nobody can see the
 * end of.
 */
const SCOPES_IN_THE_HEADER = 5;

/** One exclusive scope the header offers, which is a canvas card said as a segment. */
export type Scope = { value: string; label: string; tint?: 'virtual-model' | 'target' | undefined };

/**
 * Which subject a scope stands for, once the two that narrow nothing new are folded in.
 *
 * @summary A cable stands for the virtual model it binds, because the requests a cable carried are
 * that model's requests and a cable of its own would be a second scope for one set of rows. A draft
 * stands for the gateway, because a draft has served nothing to narrow to.
 */
function scopedSubject(subject: InspectorSubject): InspectorSubject {
  if (subject.kind === 'cable') {
    return { kind: 'virtual-model', modelId: subject.modelId };
  }

  return subject.kind === 'draft' ? { kind: 'gateway' } : subject;
}

/**
 * Which scope a subject stands for, which is the very card the canvas selects for it.
 *
 * @summary The segment values are canvas card ids read through `nodeIdOf`, so pressing a segment and
 * selecting its card move the one selection either way round without this surface ever spelling out
 * how a card is named. A subject standing for no card reads as the whole gateway, which is what a
 * person sees before they have narrowed anything.
 */
export function scopeOf(subject: InspectorSubject): string {
  return nodeIdOf(scopedSubject(subject)) ?? EVERY_REQUEST;
}

export function modelScopes(gateway: GatewayConfig): readonly Scope[] {
  return gateway.virtualModels.map((model) => ({
    value: scopeOf({ kind: 'virtual-model', modelId: model.id }),
    label: model.displayName,
    tint: 'virtual-model' as const,
  }));
}

/**
 * The scope a selected target stands, for as long as that selection holds.
 *
 * @summary A target is not a standing scope the way a virtual model is, so its segment arrives with
 * the selection and leaves with it. A target that has left the registry reads as removed rather than
 * carrying a name nothing answers to any more.
 */
export function targetScope(
  subject: InspectorSubject,
  accounts: readonly Account[],
): Scope | undefined {
  if (subject.kind === 'ghost-target') {
    return { value: scopeOf(subject), label: 'Removed', tint: 'target' };
  }

  if (subject.kind !== 'target') {
    return undefined;
  }

  const account = accounts.find((held) => held.id === subject.accountId);

  return {
    value: scopeOf(subject),
    label: account === undefined ? subject.accountId : accountName(account),
    tint: 'target',
  };
}

type ScopeStrip = { shown: readonly Scope[]; hidden: readonly Scope[] };

/**
 * The scopes the header shows and the ones it hands the overflow.
 *
 * @summary Whatever scope stands is always in reach, even where the header had already run out of
 * room for it, because a strip that hid the standing scope would read as though nothing were
 * narrowed at all.
 */
export function scopeStrip(scopes: readonly Scope[], lit: string): ScopeStrip {
  if (scopes.length <= SCOPES_IN_THE_HEADER) {
    return { shown: scopes, hidden: [] };
  }

  const kept = scopes.slice(0, SCOPES_IN_THE_HEADER);
  const standing = scopes.find((scope) => scope.value === lit);
  const shown =
    standing === undefined || kept.includes(standing) ? kept : [...kept.slice(0, -1), standing];
  const inTheHeader = new Set(shown);

  return { shown, hidden: scopes.filter((scope) => !inTheHeader.has(scope)) };
}
