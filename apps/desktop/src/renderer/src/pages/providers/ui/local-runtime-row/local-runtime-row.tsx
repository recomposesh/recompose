import type { LocalAccount, RuntimeReachability } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import {
  refusalSentence,
  runtimeStandingQueryOptions,
  useMoveLocalRuntime,
  useRemoveAccount,
  withRefusal,
} from '../../../../shared/api';
import { BrandMark, Icon, OverflowMenu, StatusChip } from '../../../../shared/ui';
import { localLeadFor, localRuntimeName } from '../../model/local-catalog';
import { MoveRuntimeDialog } from '../move-runtime-dialog/move-runtime-dialog';

type LocalRuntimeRowProps = {
  /** The stored runtime as the registry holds it, which is a name and an address alone. */
  account: LocalAccount;
};

const standingWords: Record<
  RuntimeReachability['verdict'],
  { word: string; tone: 'positive' | 'attention' | 'inert' }
> = {
  answers: { word: 'Running', tone: 'positive' },
  unreachable: { word: 'Not running', tone: 'inert' },
  unrecognized: { word: 'Another server answered', tone: 'attention' },
};

function observedStanding(
  looking: boolean,
  reachability: RuntimeReachability | undefined,
): ReactNode {
  if (looking) {
    return <span className="text-detail text-ink-secondary">Checking</span>;
  }

  if (reachability === undefined) {
    return null;
  }

  const standing = standingWords[reachability.verdict];

  return <StatusChip tone={standing.tone} word={standing.word} />;
}

type RowActs = {
  onCheckAgain: () => void;
  onMove: () => void;
  onForget: () => void;
};

function actsFor(acts: RowActs) {
  return [
    {
      label: 'Check again',
      icon: 'renew' as const,
      tone: 'accent' as const,
      onSelect: acts.onCheckAgain,
    },
    {
      label: 'Move to another port',
      icon: 'network' as const,
      tone: 'accent' as const,
      onSelect: acts.onMove,
    },
    { label: 'Remove', icon: 'trash' as const, tone: 'danger' as const, onSelect: acts.onForget },
  ];
}

/**
 * One stored runtime, read leading to trailing as who it is and whether it answers right now.
 *
 * @summary The standing is an observation rather than a stored fact: the row looks again on every
 * mount and on every Check again, and a remount forgets the last answer, so no row carries a claim
 * older than its own screen. All three acts live behind the overflow, because none is part of
 * reading the row, and removing releases nothing since a local account holds no secret. Moving
 * keeps the row, because a port is where a server answers today rather than a fact about the row.
 */
function useTheMove(account: LocalAccount) {
  const move = withRefusal(useMoveLocalRuntime());
  const [asking, setAsking] = useState(false);

  return {
    refusal: move.refusal,
    ask: () => {
      setAsking(true);
    },
    dialog: (name: string) => (
      <MoveRuntimeDialog
        address={account.address}
        name={name}
        onCancel={() => {
          setAsking(false);
        }}
        onMove={(port) => {
          setAsking(false);
          move.mutate({ id: account.id, port });
        }}
        open={asking}
      />
    ),
  };
}

export function LocalRuntimeRow({ account }: LocalRuntimeRowProps) {
  const standing = useQuery(runtimeStandingQueryOptions(account.id));
  const forget = withRefusal(useRemoveAccount());
  const move = useTheMove(account);

  const lead = localLeadFor(account.provider);
  const name = localRuntimeName(account.provider, account.label);
  const refusal =
    standing.error === null ? (move.refusal ?? forget.refusal) : refusalSentence(standing.error);

  return (
    <li className="flex min-h-row items-center gap-3 rounded-card border border-line-subtle bg-surface-card px-4 py-2.5">
      {'mark' in lead ? (
        <BrandMark name={lead.mark} />
      ) : (
        <Icon className="size-4.5 text-ink-secondary" name={lead.glyph} />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-card-title text-ink">{name}</span>
        <span className="font-mono text-mono-value text-ink-secondary">{account.address}</span>
        {refusal === undefined ? null : (
          <span className="text-detail text-danger-ink" role="alert">
            {refusal}
          </span>
        )}
      </div>
      {observedStanding(standing.isFetching, standing.data)}
      <OverflowMenu
        items={actsFor({
          onCheckAgain: () => {
            void standing.refetch();
          },
          onMove: move.ask,
          onForget: () => {
            forget.mutate({ id: account.id });
          },
        })}
        label={`Actions for ${name}`}
      />
      {move.dialog(name)}
    </li>
  );
}
