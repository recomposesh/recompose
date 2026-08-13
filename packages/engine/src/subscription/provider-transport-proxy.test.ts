import { expect, test } from 'vitest';

import {
  subscriptionRefreshTransportOptions,
  subscriptionTransportOptions,
} from './provider-transport';

test('TestNewCodexAuthWithProxyURL_OverrideDirectDisablesProxy', () => {
  expect(subscriptionTransportOptions('openai', { mode: 'direct' })).toMatchObject({
    proxy: false,
  });
  expect(
    subscriptionRefreshTransportOptions('https://auth.openai.com/oauth/token', {
      mode: 'direct',
    }),
  ).toMatchObject({ proxy: false });
});

test('TestNewCodexAuthWithProxyURL_OverrideProxyTakesPrecedence', () => {
  const policy = { mode: 'proxy', url: 'http://override.example.com:8081' } as const;

  expect(subscriptionTransportOptions('openai', policy)).toMatchObject({ proxy: policy.url });
  expect(
    subscriptionRefreshTransportOptions('https://auth.openai.com/oauth/token', policy),
  ).toMatchObject({ proxy: policy.url });
});

test('TestNewClaudeAuthWithProxyURL_OverrideDirectTakesPrecedence', () => {
  expect(subscriptionTransportOptions('anthropic', { mode: 'direct' })).toMatchObject({
    proxy: false,
  });
  expect(
    subscriptionRefreshTransportOptions('https://platform.claude.com/v1/oauth/token', {
      mode: 'direct',
    }),
  ).toMatchObject({ proxy: false });
});

test('TestNewClaudeAuthWithProxyURL_OverrideProxyAppliedWithoutConfig', () => {
  const policy = { mode: 'proxy', url: 'socks5://proxy.example.com:1080' } as const;

  expect(subscriptionTransportOptions('anthropic', policy)).toMatchObject({ proxy: policy.url });
  expect(
    subscriptionRefreshTransportOptions('https://platform.claude.com/v1/oauth/token', policy),
  ).toMatchObject({ proxy: policy.url });
});
