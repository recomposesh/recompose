const CARRIED = [
  'X-Claude-Code-Agent-Id',
  'X-Claude-Code-Parent-Agent-Id',
  'X-Claude-Remote-Container-Id',
  'X-Claude-Remote-Session-Id',
  'X-Client-App',
  'X-Anthropic-Additional-Protection',
] as const;

/**
 * The headers a caller sends that reach Anthropic unchanged, and nothing beside them.
 *
 * @summary These six say which subagent is asking, which agent spawned it, and which remote
 * container it runs in. Anthropic reads them to place the request, so a proxy that drops them makes
 * a whole subagent tree look like one flat conversation. The list is closed rather than a prefix
 * match, because everything else on the wire is this app's own identity: forwarding a caller's
 * `Authorization` or `User-Agent` would either leak a credential or claim to be a tool this is not.
 */
function sentUnder(
  headers: Readonly<Record<string, readonly string[]>>,
  name: string,
): string | undefined {
  const sent = headers[name.toLowerCase()]?.[0];

  return sent === '' ? undefined : sent;
}

export function claudeHeadersCarriedFrom(
  headers: Readonly<Record<string, readonly string[]>> | undefined,
): [string, string][] {
  if (headers === undefined) return [];

  const carried: [string, string][] = [];

  for (const name of CARRIED) {
    const sent = sentUnder(headers, name);

    if (sent !== undefined) carried.push([name, sent]);
  }

  return carried;
}
