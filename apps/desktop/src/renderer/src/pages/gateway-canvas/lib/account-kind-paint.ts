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
