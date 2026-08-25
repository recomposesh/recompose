import type { CredentialedAccount, KeyCheckVerdict } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { useState } from 'react';

import { checkableKey, keyTitleFor, markFor, readerKeyAskFor } from '../../../../entities/provider';
import {
  useClearReaderKey,
  useRemoveAccount,
  useVerifyKey,
  withRefusal,
} from '../../../../shared/api';
import { OverflowMenu, UsageSummaryLink, VendorMark } from '../../../../shared/ui';
import { AccountRow } from '../account-row/account-row';
import { ReaderKeySheet } from '../reader-key-sheet/reader-key-sheet';

type KeyAccountRowProps = {
  /** The stored key as the registry holds it, which is everything the row may read. */
  account: CredentialedAccount;
};

const answered: Record<KeyCheckVerdict, { sentence: string; ink: string }> = {
  authenticates: {
    sentence: 'This key worked at the last check.',
    ink: 'text-ink',
  },
  'not-accepted': {
    sentence: 'The provider rejected this key at the last check.',
    ink: 'text-attention-ink',
  },
  'could-not-check': {
    sentence: "Couldn't reach the provider, so this key is unverified.",
    ink: 'text-ink-secondary',
  },
};

const maskedBullets = '••••';

function keyMask(keyTail: string | undefined): ReactNode {
  if (keyTail !== undefined) {
    return <span className="font-mono text-mono-value">{`${maskedBullets}${keyTail}`}</span>;
  }

  return (
    <span className="font-mono text-mono-value">
      <span aria-hidden>{maskedBullets}</span>
      <span className="sr-only">a stored key</span>
    </span>
  );
}

/**
 * The address a person handed a row, which only a row they addressed themselves carries.
 *
 * @summary Naming it claims nothing about what the key reaches, because the person chose the address
 * rather than the app: that is why an aggregator row may show one at all while it still offers no
 * check. Every other row reads its host from the provider directory and has none of its own to name.
 */
function addressedHost(account: CredentialedAccount): ReactNode {
  return account.endpoint === undefined ? null : (
    <span className="truncate font-mono text-mono-value">{account.endpoint.origin}</span>
  );
}

function keyIdentity(
  account: CredentialedAccount,
  refusal: string | undefined,
  verdict: KeyCheckVerdict | undefined,
): ReactNode {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="text-card-title text-ink">{keyTitleFor(account.provider)}</span>
      <span className="flex min-w-0 items-center gap-2 text-detail text-ink-secondary">
        <span className="truncate">{account.label}</span>
        {keyMask(account.keyTail)}
        {addressedHost(account)}
      </span>
      {refusal === undefined ? null : (
        <span className="text-detail text-danger-ink" role="alert">
          {refusal}
        </span>
      )}
      {verdict === undefined ? null : (
        <span className={`text-detail ${answered[verdict].ink}`} role="status">
          {answered[verdict].sentence}
        </span>
      )}
    </div>
  );
}

type RowActs = {
  account: CredentialedAccount;
  checking: boolean;
  onVerify: () => void;
  onRemove: () => void;
  onAddReaderKey: () => void;
  onForgetReaderKey: () => void;
};

/**
 * The read-only key acts this row offers, which only a provider that asks for one ever shows.
 *
 * @summary Forgetting stands apart from replacing because the two are different answers to a lost
 * key: one hands over a new one, the other says this account should stop reading a balance at all.
 * A row holding none offers only the first, since there is nothing yet to forget.
 */
function readerKeyActs(account: CredentialedAccount, acts: RowActs) {
  if (readerKeyAskFor(account.provider) === undefined) {
    return [];
  }

  const held = account.readerCredentialRef !== undefined;

  return [
    {
      label: held ? 'Replace credits key' : 'Add credits key',
      icon: 'key' as const,
      onSelect: acts.onAddReaderKey,
    },
    ...(held
      ? [{ label: 'Forget credits key', icon: 'trash' as const, onSelect: acts.onForgetReaderKey }]
      : []),
  ];
}

function quieterActions(acts: RowActs) {
  const { account, checking, onVerify, onRemove } = acts;

  return [
    ...(checkableKey(account)
      ? [
          {
            label: 'Verify',
            icon: 'shield' as const,
            tone: 'positive' as const,
            disabled: checking,
            onSelect: onVerify,
          },
        ]
      : []),
    ...readerKeyActs(account, acts),
    { label: 'Remove', icon: 'trash' as const, tone: 'danger' as const, onSelect: onRemove },
  ];
}

/**
 * One stored key, read leading to trailing as the product it reaches and the key it holds.
 *
 * @summary The row is the whole surface for a key, because a key is never edited once stored: it
 * is replaced. It holds two lines, the product its catalog entry was picked as and the name beside
 * the mask, so a person tells two keys of one provider apart without the secret reaching the
 * screen. The bullets stand on every key row, so a card always says a key stands there, and a key
 * stored before the mask existed reads the name beside the bare bullets. Both acts live behind the
 * overflow and behind a right-click on the row, because neither is part of reading the row, and
 * Verify appears there only where a probe knows the provider well enough to answer.
 */
export function KeyAccountRow({ account }: KeyAccountRowProps) {
  const check = withRefusal(useVerifyKey());
  const forget = withRefusal(useRemoveAccount());
  const forgetReader = useClearReaderKey();
  const [askingForReaderKey, setAskingForReaderKey] = useState(false);

  const mark = markFor(account.provider);
  const readerAsk = readerKeyAskFor(account.provider);

  const acts = quieterActions({
    account,
    checking: check.isPending,
    onVerify: () => {
      check.mutate({ id: account.id });
    },
    onRemove: () => {
      forget.mutate({ id: account.id });
    },
    onAddReaderKey: () => {
      setAskingForReaderKey(true);
    },
    onForgetReaderKey: () => {
      forgetReader.mutate({ id: account.id });
    },
  });

  return (
    <AccountRow items={acts} layout="flex min-h-row items-center gap-3">
      <VendorMark name={mark} />
      {keyIdentity(account, check.refusal ?? forget.refusal, check.data?.verdict)}
      <UsageSummaryLink scope={{ param: 'providers', value: account.id }} />
      <OverflowMenu items={acts} label={`Actions for ${account.label}`} />
      {readerAsk === undefined ? null : (
        <ReaderKeySheet
          accountId={account.id}
          ask={readerAsk}
          onOpenChange={setAskingForReaderKey}
          open={askingForReaderKey}
        />
      )}
    </AccountRow>
  );
}
