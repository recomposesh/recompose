import type { Account, AccountKind } from '@recompose/contracts';
import type { ReactNode } from 'react';

import type { IconName } from '../../../../shared/ui';
import type { CanvasNode } from '../../lib/node-graph';

import { accountMark, accountName } from '../../../../entities/account';
import { BrandMark } from '../../../../shared/ui';
import { NodeCard } from '../node-card/node-card';

/** What a target card stands as: a stored account, one that left the registry, or one being picked. */
export type TargetNodeData = Extract<
  CanvasNode,
  { kind: 'target' | 'ghost-target' | 'pending-target' }
>;

type TargetNodeProps = {
  /** What the card reads itself off, which is the node the graph derived for this column. */
  data: TargetNodeData;
  /** Whether the card stands selected, which is what rings it and puts the inspector on it. */
  selected: boolean;
};

type CardReading = {
  kicker: string;
  chipTint: string;
  kickerTint: string;
  chipGlyph: IconName;
  chipMark: ReactNode | undefined;
  name: string;
  nameInk: string;
  subtitle: string;
  frame: string;
};

const kindTints: Record<AccountKind, string> = {
  subscription: 'text-subscription',
  'api-key': 'text-api-key',
  aggregator: 'text-aggregator',
  local: 'text-local',
};

const kindGlyphs: Record<AccountKind, IconName> = {
  subscription: 'person',
  'api-key': 'key',
  aggregator: 'network',
  local: 'cube',
};

function vendorMark(account: Account): ReactNode | undefined {
  const mark = accountMark(account);

  return mark === undefined ? undefined : (
    <BrandMark className="size-2.75" name={mark} variant="mono" />
  );
}

function readingOf(data: TargetNodeData): CardReading {
  if (data.kind === 'target') {
    return {
      kicker: 'Target',
      chipTint: kindTints[data.account.kind],
      kickerTint: 'text-target-ink',
      chipGlyph: kindGlyphs[data.account.kind],
      chipMark: vendorMark(data.account),
      name: accountName(data.account),
      nameInk: 'text-ink',
      subtitle: data.account.provider,
      frame: '',
    };
  }

  if (data.kind === 'ghost-target') {
    return {
      kicker: 'Removed',
      chipTint: 'text-danger',
      kickerTint: 'text-danger-ink',
      chipGlyph: 'close',
      chipMark: undefined,
      name: data.accountId,
      nameInk: 'text-ink',
      subtitle: 'not in the registry',
      frame: 'border-dashed',
    };
  }

  return {
    kicker: 'Target',
    chipTint: 'text-target',
    kickerTint: 'text-target-ink',
    chipGlyph: 'plus',
    chipMark: undefined,
    name: 'Choose a target',
    nameInk: 'text-ink-secondary',
    subtitle: 'waiting on a pick',
    frame: 'border-dashed',
  };
}

/**
 * Where a request finally lands, drawn as the account behind it or as the gap one left.
 *
 * @summary Reach for it as the canvas card for the target column, whichever of its three standings
 * a card arrives in. An account that left the registry keeps its card and dashes it rather than
 * vanishing, because a broken binding is what a person came back to repair. A card waiting on a
 * pick dashes the same way and says so, so the spot a cable was let go at never reads as finished.
 * Nothing leaves a target, which is why it carries no outgoing port at all.
 */
export function TargetNode({ data, selected }: TargetNodeProps) {
  const reading = readingOf(data);

  return (
    <NodeCard
      chipGlyph={reading.chipGlyph}
      chipMark={reading.chipMark}
      chipTint={reading.chipTint}
      frame={reading.frame}
      incoming
      kicker={reading.kicker}
      kickerTint={reading.kickerTint}
      name={reading.name}
      nameInk={reading.nameInk}
      outgoing={undefined}
      selected={selected}
      subtitle={reading.subtitle}
      subtitleInk="text-ink-secondary"
      tint="node-tint-target"
    />
  );
}
