import type { SpendGrant } from '@recompose/contracts';

import type { JsonObject, ProxyDialect } from '../gateway-wire';
import type { AntigravityReasoningReplay } from './antigravity-replay';
import type { ClaudeDiagnostics } from './claude-diagnostics';
import type { CodexReasoningReplay } from './codex-replay';

import {
  antigravityReplayKey,
  antigravityUsesReplay,
  observeAntigravityReasoning,
} from './antigravity-replay';
import { observeClaudeDiagnostics } from './claude-diagnostics';
import { observeCodexReasoning } from './codex-replay';

type ResolvedGrant = Extract<SpendGrant, { verdict: 'resolved' }>;
type SubscriptionSpend = Extract<ResolvedGrant['spend'], { custody: 'subscription' }>;
type ObservationRuntime = {
  diagnostics: ClaudeDiagnostics;
  codexReplay?: CodexReasoningReplay;
  antigravityReplay?: AntigravityReasoningReplay;
};
type ObservationScope = {
  sessionId: string;
  sourceDialect: ProxyDialect;
  replayScopeId: string;
};

export function subscriptionDiagnosticsKey(grant: ResolvedGrant, sessionId: string): string {
  return grant.spend.custody === 'subscription'
    ? `${grant.spend.accountId}\0${sessionId}`
    : sessionId;
}

/**
 * The slot a Codex turn's sealed reasoning is kept in, which one account alone can read.
 *
 * @summary Encrypted reasoning is opaque to every account but the one that minted it, so the account
 * is part of the slot rather than a fact about it. Without it, two accounts on one provider model
 * share a slot, and a walk that moved to the second replays the first account's seal into a request
 * it cannot open. The key is built here and read at both ends, so what the injector looks under is
 * the same thing the observer wrote, by construction rather than by two functions agreeing.
 */
export function codexReplayKey(accountId: string, body: JsonObject, sessionId: string): string {
  const model = typeof body['model'] === 'string' ? body['model'] : '';

  return `${accountId}\0${model}\0${sessionId}`;
}

async function observeClaudeAnswer(
  grant: ResolvedGrant,
  answer: Response,
  runtime: ObservationRuntime,
  sessionId: string,
): Promise<Response> {
  if (grant.spend.custody !== 'subscription' || grant.spend.provider !== 'anthropic') {
    return answer;
  }

  const key = subscriptionDiagnosticsKey(grant, sessionId);

  return observeClaudeDiagnostics(answer, (messageId) => {
    runtime.diagnostics.commit(key, messageId);
  });
}

function codexSpendFor(
  grant: ResolvedGrant,
  runtime: ObservationRuntime,
  sourceDialect: ProxyDialect,
): SubscriptionSpend | null {
  const spend = grant.spend;

  if (spend.custody !== 'subscription' || spend.provider !== 'openai') return null;

  return sourceDialect === 'anthropic' && runtime.codexReplay !== undefined ? spend : null;
}

function antigravitySpendFor(
  grant: ResolvedGrant,
  runtime: ObservationRuntime,
  body: JsonObject,
): SubscriptionSpend | null {
  const spend = grant.spend;

  if (spend.custody !== 'subscription' || spend.provider !== 'antigravity') return null;

  return runtime.antigravityReplay !== undefined && antigravityUsesReplay(body) ? spend : null;
}

export async function observeSubscriptionAnswer(
  grant: ResolvedGrant,
  body: JsonObject,
  answer: Response,
  runtime: ObservationRuntime,
  scope: ObservationScope,
): Promise<Response> {
  const antigravitySpend = antigravitySpendFor(grant, runtime, body);

  if (antigravitySpend !== null) {
    const key = antigravityReplayKey(antigravitySpend.accountId, body, scope.replayScopeId);

    return observeAntigravityReasoning(
      answer,
      (items) => runtime.antigravityReplay?.commit(key, items),
      () => runtime.antigravityReplay?.clear(key),
      runtime.antigravityReplay?.snapshot(key),
    );
  }

  const codexSpend = codexSpendFor(grant, runtime, scope.sourceDialect);

  if (codexSpend === null) {
    return observeClaudeAnswer(grant, answer, runtime, scope.sessionId);
  }

  const key = codexReplayKey(codexSpend.accountId, body, scope.replayScopeId);

  return observeCodexReasoning(
    answer,
    (output) => runtime.codexReplay?.commit(key, output, body),
    () => runtime.codexReplay?.clear(key),
  );
}
