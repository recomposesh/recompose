import type { CredentialedAccount } from '@recompose/contracts';

export const stored: CredentialedAccount = {
  id: 'a1',
  provider: 'anthropic',
  kind: 'api-key',
  label: 'build',
  credentialRef: 'c1',
  keyTail: '7f2c',
};

export const storedBeforeTheMask: CredentialedAccount = {
  id: 'a1',
  provider: 'anthropic',
  kind: 'api-key',
  label: 'build',
  credentialRef: 'c1',
};

export const addressedByHand: CredentialedAccount = {
  id: 'a4',
  provider: 'models-example',
  kind: 'aggregator',
  label: 'house pool',
  credentialRef: 'c4',
  keyTail: '4d1a',
  endpoint: { origin: 'https://models.example.com', dialect: 'chat-completions' },
};
