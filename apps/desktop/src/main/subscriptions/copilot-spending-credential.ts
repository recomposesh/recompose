import { buyACopilotToken, copilotRefreshMarginMs } from './copilot-credential';

type Held = { credential: string; expiresAtMs: number };

export type CopilotTradePort = {
  fetchLike: typeof fetch;
  nowMs: () => number;
};

const held = new Map<string, Held>();

export function forgetCopilotCredentials(): void {
  held.clear();
}

function stillGood(kept: Held | undefined, nowMs: number): kept is Held {
  return kept !== undefined && kept.expiresAtMs - copilotRefreshMarginMs > nowMs;
}

/**
 * The short-lived credential one Copilot account's turn carries.
 *
 * @summary The vault holds what GitHub issued, and a turn spends what that buys. The bought one
 * is kept until a minute before it lapses, because a credential that expires part way through
 * fails a request a person is watching, and buying one per turn would ask GitHub on every call.
 * A refused trade answers nothing, so the account reads as missing its credential rather than
 * serving a turn that cannot succeed.
 */
export async function copilotSpendingCredential(
  port: CopilotTradePort,
  accountId: string,
  githubCredential: string,
): Promise<string | null> {
  const nowMs = port.nowMs();
  const kept = held.get(accountId);

  if (stillGood(kept, nowMs)) {
    return kept.credential;
  }

  const traded = await buyACopilotToken(port.fetchLike, githubCredential);

  if (traded.verdict === 'refused') {
    held.delete(accountId);

    return null;
  }

  held.set(accountId, { credential: traded.credential, expiresAtMs: traded.expiresAtMs });

  return traded.credential;
}

/**
 * The short-lived credential a turn carries, bought against the live clock and network.
 *
 * @summary The wiring reaches for this rather than building the port at the call site, so the
 * one place that names the real clock and the real fetch stands beside the trade it feeds.
 */
export async function boughtCopilotCredential(
  accountId: string,
  githubCredential: string,
): Promise<string | null> {
  return copilotSpendingCredential(
    { fetchLike: fetch, nowMs: () => Date.now() },
    accountId,
    githubCredential,
  );
}
