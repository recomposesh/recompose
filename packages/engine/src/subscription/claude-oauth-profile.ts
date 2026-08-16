import type { AccountTransportPolicy } from '@recompose/contracts';

import { fetch as wreqFetch } from 'node-wreq';

import type { SubscriptionWireFetch } from './provider-transport';

import { isJsonObject } from '../gateway-wire';
import { controlPlaneUrl } from '../loopback-override';
import { decodeClaudeResponse } from './claude-compression';
import { subscriptionRefreshTransportOptions, webResponseFrom } from './provider-transport';

const CLAUDE_PROFILE_URL = 'https://api.anthropic.com/api/oauth/profile';

/**
 * The account identity Anthropic's OAuth profile endpoint answers with.
 *
 * @summary The uuid is what a serving request carries and the address is what a person recognizes
 * their own account by. Only the uuid is guaranteed, so a response naming no address leaves the
 * account unnamed rather than refused.
 */
export type ClaudeProfile = {
  account: { uuid: string; email?: string };
};

export async function fetchClaudeProfile(
  accessToken: string,
  fetchLike: SubscriptionWireFetch = wreqFetch,
  policy?: AccountTransportPolicy,
): Promise<ClaudeProfile> {
  const profileUrl = controlPlaneUrl(CLAUDE_PROFILE_URL);
  const upstream = await fetchLike(profileUrl, {
    ...subscriptionRefreshTransportOptions(CLAUDE_PROFILE_URL, policy),
    method: 'GET',
    headers: [
      ['Accept', 'application/json, text/plain, */*'],
      ['Authorization', `Bearer ${accessToken}`],
      ['Content-Type', 'application/json'],
      ['Cache-Control', 'no-cache'],
      ['User-Agent', 'axios/1.15.2'],
      ['Accept-Encoding', 'gzip, compress, deflate, br'],
      ['Connection', 'close'],
    ],
    retry: 0,
    throwHttpErrors: false,
  });
  const response = await decodeClaudeResponse(webResponseFrom(upstream));

  if (!response.ok) {
    throw new Error(`fetch Claude OAuth profile failed with status ${response.status}`);
  }

  return claudeProfileFrom(await response.json());
}

function spokenIn(account: unknown, key: string): string | undefined {
  const said = isJsonObject(account) ? account[key] : undefined;

  return typeof said === 'string' && said.trim() !== '' ? said.trim() : undefined;
}

function claudeProfileFrom(value: unknown): ClaudeProfile {
  const account = isJsonObject(value) ? value['account'] : undefined;
  const uuid = spokenIn(account, 'uuid');

  if (uuid === undefined) {
    throw new Error('fetch Claude OAuth profile: response account UUID is empty');
  }

  const email = spokenIn(account, 'email');

  return { account: { uuid, ...(email === undefined ? {} : { email }) } };
}

/**
 * The address behind one access token, or nothing where the far end would not say.
 *
 * @summary A sign-in the app delegated to Claude Code leaves no address anywhere on the machine:
 * the config home carries settings and the keychain carries the plan. The address exists only at
 * the far end, so it is asked for the way CLIProxyAPI asks for it. A refusal answers with nothing
 * rather than carrying out, because an account is still an account when this call cannot reach.
 */
export async function claudeAddressBehind(
  accessToken: string,
): Promise<{ address?: string } | Record<string, never>> {
  const email = await fetchClaudeProfile(accessToken)
    .then((profile) => profile.account.email)
    .catch(() => undefined);

  return email === undefined ? {} : { address: email };
}
