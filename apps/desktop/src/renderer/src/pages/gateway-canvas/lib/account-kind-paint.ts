import type { AccountKind } from '../../../entities/account';

export const accountKindNodeTint: Record<AccountKind, string> = {
  subscription: 'node-tint-subscription',
  'api-key': 'node-tint-api-key',
  aggregator: 'node-tint-aggregator',
  local: 'node-tint-local',
};

export const accountKindTextTint: Record<AccountKind, string> = {
  subscription: 'text-subscription',
  'api-key': 'text-api-key',
  aggregator: 'text-aggregator',
  local: 'text-local',
};

/**
 * The ink a kind's own words take, which is darker than the tint its chip and frame are drawn in.
 *
 * @summary A tint chosen to read as a fill behind a glyph runs too light to carry ten-pixel bold
 * text: purple at the chip's weight sits at 4.1 against a light card, under the 4.5 that small text
 * owes a reader. Both live here so a card cannot take one where it meant the other.
 */
export const accountKindInkTint: Record<AccountKind, string> = {
  subscription: 'text-subscription-ink',
  'api-key': 'text-api-key-ink',
  aggregator: 'text-aggregator-ink',
  local: 'text-local-ink',
};
