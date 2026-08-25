import type { MachineCredentialReading, SubscriptionProviderId } from '@recompose/contracts';

import { localRuntimes } from '@recompose/contracts';

import type { AccountKind } from '../../../entities/account';

import { keyShapeHintFor, providerName, subscriptionTitleFor } from '../../../entities/provider';

/** One source the sources step offers, whether the machine held it or a person connected it. */
export type FoundSource = {
  /** What keeps this row apart from every other, which is the account id where one exists. */
  id: string;
  /** The catalog provider this row stands for, which is what it is drawn with. */
  provider: string;
  /** Which column of the catalog this source belongs to. */
  kind: AccountKind;
  /** What the row reads as. */
  title: string;
  /** What tells this source apart from another of the same provider. */
  identity: string;
  /** Whether marking this row still has to record the account, or the app already holds it. */
  adoptable: boolean;
};

/** What a stored account looks like to this step, which is less than the whole document. */
export type StoredSource = {
  id: string;
  provider: string;
  kind: AccountKind;
  label: string;
  keyTail?: string | undefined;
  address?: string | undefined;
};

/** What one provider's own tool left on this machine, under the provider it belongs to. */
type MachineLook = {
  provider: SubscriptionProviderId;
  reading: MachineCredentialReading;
};

type Look = {
  /** What each provider's own tool left on this machine, in the order the step offers them. */
  machineReadings: readonly MachineLook[];
  /** Whether a local runtime answers on its documented port. */
  ollamaAnswering: boolean;
  /** The accounts the app already holds. */
  accounts: readonly StoredSource[];
};

const OLLAMA_HOST = new URL(localRuntimes.ollama.address).host;

function identityOf(account: StoredSource): string {
  if (account.address !== undefined) {
    return new URL(account.address).host;
  }

  const hint = keyShapeHintFor(account.provider);

  return account.keyTail === undefined || hint === undefined
    ? account.label
    : `${hint}${account.keyTail}`;
}

function titleOf(account: StoredSource): string {
  return account.kind === 'subscription'
    ? subscriptionTitleFor(account.provider)
    : providerName(account.provider);
}

function stored(accounts: readonly StoredSource[]): readonly FoundSource[] {
  return accounts.map((account) => ({
    id: account.id,
    provider: account.provider,
    kind: account.kind,
    title: titleOf(account),
    identity: identityOf(account),
    adoptable: false,
  }));
}

/**
 * The plan a provider's own tool is already signed into, where it left one behind.
 *
 * @summary The row reads as the plan rather than as the tool, because a person recognizes what
 * they pay for. Two providers keep credentials on this machine and both are offered, so a machine
 * running Codex is not told recompose found nothing.
 */
function planOnThisMachine({ provider, reading }: MachineLook): FoundSource | undefined {
  return reading.holds === 'account'
    ? {
        id: `machine:${provider}`,
        provider,
        kind: 'subscription',
        title: `Your ${subscriptionTitleFor(provider)} plan`,
        identity: reading.signedInAs ?? subscriptionTitleFor(provider),
        adoptable: true,
      }
    : undefined;
}

function ollamaOnThisMachine(answering: boolean): FoundSource | undefined {
  return answering
    ? {
        id: 'machine:ollama',
        provider: 'ollama',
        kind: 'local',
        title: localRuntimes.ollama.name,
        identity: OLLAMA_HOST,
        adoptable: true,
      }
    : undefined;
}

/**
 * Every source the step offers, each one keeping the place the look gave it.
 *
 * @summary A plan the machine signs into and the same plan already stored are one source, not
 * two, so a provider the app already holds never arrives twice. A credential store that refused
 * to open reports nothing rather than an empty machine, because the two are different answers and
 * offering a sign-in for a store nobody could read would be guessing.
 *
 * The stored account takes the machine row's own place rather than landing at the end of the
 * list. Marking a row is what records it, so a list ordered by where a row came from would move
 * the row a person just pressed, and they would watch their answer jump somewhere else.
 */
function seatFor(
  candidate: FoundSource,
  storedRows: readonly FoundSource[],
): readonly FoundSource[] {
  const takenOver = storedRows.filter((row) => row.provider === candidate.provider);

  return takenOver.length > 0 ? takenOver : [candidate];
}

export function foundSources({ machineReadings, ollamaAnswering, accounts }: Look): FoundSource[] {
  const onThisMachine = [
    ...machineReadings.map(planOnThisMachine),
    ollamaOnThisMachine(ollamaAnswering),
  ].filter((candidate) => candidate !== undefined);
  const storedRows = stored(accounts);
  const seated = new Set(onThisMachine.map((candidate) => candidate.provider));

  return [
    ...onThisMachine.flatMap((candidate) => seatFor(candidate, storedRows)),
    ...storedRows.filter((row) => !seated.has(row.provider)),
  ];
}

const COUNTED = ['no', 'One', 'Two', 'Three', 'Four'] as const;

/**
 * The line under the heading, which reports the look rather than promising what it found.
 *
 * @summary A look that turned up nothing has to ask rather than report, because "no sources are
 * already here" reads as a fault on a machine that simply runs nothing yet.
 */
export function lookReads(found: number): string {
  if (found === 0) {
    return 'recompose found nothing on this machine yet. Pick a provider below to connect one.';
  }

  const counted = COUNTED[found] ?? String(found);
  const are = found === 1 ? 'source is' : 'sources are';

  return `recompose looked at this machine. ${counted} ${are} already here.`;
}
