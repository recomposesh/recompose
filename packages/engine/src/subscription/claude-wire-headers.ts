import type { ClaudeDeviceProfile } from './claude-device-profile';

export type ClaudeRequestIds = {
  sessionId: string;
  requestId: string;
  /** The caller's own subagent and remote-environment headers, which reach Anthropic unchanged. */
  carriedHeaders?: readonly [string, string][] | undefined;
};

function claudeWireHeaders(
  accessToken: string,
  sessionId: string,
  requestId: string,
  beta: string,
  profile: ClaudeDeviceProfile,
  carried: readonly [string, string][] = [],
): [string, string][] {
  return [
    ...carried,
    ['Accept', 'application/json'],
    ['Authorization', `Bearer ${accessToken}`],
    ['Content-Type', 'application/json'],
    ['User-Agent', profile.userAgent],
    ['X-Claude-Code-Session-Id', sessionId],
    ['X-Stainless-Arch', profile.arch],
    ['X-Stainless-Lang', 'js'],
    ['X-Stainless-OS', profile.os],
    ['X-Stainless-Package-Version', profile.packageVersion],
    ['X-Stainless-Retry-Count', '0'],
    ['X-Stainless-Runtime', 'node'],
    ['X-Stainless-Runtime-Version', profile.runtimeVersion],
    ['X-Stainless-Timeout', profile.timeout],
    ['anthropic-beta', beta],
    ['anthropic-dangerous-direct-browser-access', 'true'],
    ['anthropic-version', '2023-06-01'],
    ['x-app', 'cli'],
    ['x-client-request-id', requestId],
    ['Connection', 'keep-alive'],
    ['Accept-Encoding', 'gzip, deflate, br, zstd'],
  ];
}

/** The wire headers one request wears, read off the ids the turn already settled. */
export function claudeWireHeadersFor(
  accessToken: string,
  ids: ClaudeRequestIds,
  beta: string,
  profile: ClaudeDeviceProfile,
): [string, string][] {
  return claudeWireHeaders(
    accessToken,
    ids.sessionId,
    ids.requestId,
    beta,
    profile,
    ids.carriedHeaders ?? [],
  );
}
