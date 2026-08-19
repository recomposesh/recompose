import type { Account, AccountKind } from '@recompose/contracts';
import type { ReactNode } from 'react';

import type { IconName } from '../../../../shared/ui';
import type { CanvasNode } from '../../lib/node-graph';

import {
  accountDetail,
  accountKindName,
  accountMark,
  accountProductName,
} from '../../../../entities/account';
import { BrandMark } from '../../../../shared/ui';
import { accountKindNodeTint, accountKindTextTint } from '../../lib/account-kind-paint';
import { NodeCard } from '../node-card/node-card';

/** What a target card stands as: a stored account, one that left the registry, or one being picked. */
export type TargetNodeData = Extract<
  CanvasNode,
  { kind: 'target' | 'ghost-target' | 'pending-target' }
>;

type TargetNodeProps = {
  /** What the card reads itself off, which is the node the graph derived for this column. */
  data: TargetNodeData & { takesCableFrom?: ((from: string) => boolean) | undefined };
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
  subtitle: string | undefined;
  footnote: string | undefined;
  frame: string;
  tint: string;
};

const kindGlyphs: Record<AccountKind, IconName> = {
  subscription: 'renew',
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
      kicker: accountKindName(data.account.kind),
      chipTint: accountKindTextTint[data.account.kind],
      kickerTint: accountKindTextTint[data.account.kind],
      chipGlyph: kindGlyphs[data.account.kind],
      chipMark: vendorMark(data.account),
      name: accountProductName(data.account),
      nameInk: 'text-ink',
      subtitle: data.detail ?? accountDetail(data.account),
      footnote: data.providerModel,
      frame: '',
      tint: accountKindNodeTint[data.account.kind],
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
      subtitle: 'no longer connected',
      footnote: undefined,
      frame: 'border-dashed',
      tint: 'node-tint-danger',
    };
  }

  return {
    kicker: 'Pending',
    chipTint: 'text-ink-secondary',
    kickerTint: 'text-ink-secondary',
    chipGlyph: 'plus',
    chipMark: undefined,
    name: 'Pick a target',
    nameInk: 'text-ink-secondary',
    subtitle: undefined,
    footnote: undefined,
    frame: 'border-dashed',
    tint: 'node-tint-ink-tertiary',
  };
}

/**
 * Where a request finally lands, drawn as the account behind it or as the gap one left.
 *
 * @summary Reach for it as the canvas card for the target column, whichever of its three standings
 * a card arrives in. A stored target leads with its connection kind and provider mark, names the
 * provider product, and reads the account identity beneath it, while its frame takes that kind's
 * tint. An account that left the registry keeps its card and dashes it rather than vanishing,
 * because a broken binding is what a person came back to repair. A card waiting on a pick dashes
 * the same way and says so. Nothing leaves a target, which is why it carries no outgoing port.
 */
export function TargetNode({ data, selected }: TargetNodeProps) {
  const reading = readingOf(data);

  return (
    <NodeCard
      chipGlyph={reading.chipGlyph}
      chipMark={reading.chipMark}
      chipTint={reading.chipTint}
      footnote={reading.footnote}
      frame={reading.frame}
      incoming
      kicker={reading.kicker}
      kickerTint={reading.kickerTint}
      name={reading.name}
      nameInk={reading.nameInk}
      outgoing={undefined}
      selected={selected}
      subtitle={reading.subtitle}
      subtitleFace="prose"
      subtitleInk="text-ink-secondary"
      takesCableFrom={data.takesCableFrom}
      tint={reading.tint}
    />
  );
}
