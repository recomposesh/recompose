import type { Crossing, JsonObject } from '../gateway-wire';

import { isJsonObject } from '../gateway-wire';
import { observingSseLines } from '../subscription/observing-sse';
import { ClaudeThinkingReplay } from './claude-thinking-replay';
import { KimiStreamReplayAccumulator } from './kimi-stream-replay';
import { replayableThinkingContent } from './kimi-thinking-replay';

type ReplaySession = { model: string; scope: string };

const replay = new ClaudeThinkingReplay();
const applied = new WeakSet<Crossing>();

/**
 * The slot one conversation keeps its signed thinking in.
 *
 * @summary The account names the slot alongside the caller and the conversation, because a router
 * ladder can serve one virtual model from two Anthropic accounts and a signed thinking block is
 * minted by the account that served the turn. Anthropic documents the block as encrypted content
 * the server decrypts to rebuild the prompt, and documents no account scope either way, so handing
 * one account's block to another rests on behavior no vendor page promises. An account the grant
 * cannot name earns no slot at all, since nothing else tells it apart from the next one.
 */
function replayScope(crossing: Crossing, accountId: string | undefined): string | undefined {
  const { callerFingerprint, replayScopeId } = crossing;

  if (accountId === undefined || callerFingerprint === undefined || replayScopeId === undefined) {
    return undefined;
  }

  return `${accountId}\0${callerFingerprint}:${replayScopeId}`;
}

function replaySession(
  crossing: Crossing,
  accountId: string | undefined,
): ReplaySession | undefined {
  if (crossing.isCompat !== true || crossing.dialect !== 'anthropic') return undefined;

  const scope = replayScope(crossing, accountId);

  return scope === undefined ? undefined : { model: crossing.providerModel, scope };
}

export function prepareClaudeReplay(
  crossing: Crossing,
  body: JsonObject,
  accountId: string | undefined,
): JsonObject {
  const session = replaySession(crossing, accountId);

  if (session === undefined) return body;

  const injection = replay.inject(session.model, session.scope, body);

  if (injection.applied) applied.add(crossing);

  return injection.body;
}

function commitFinalTurn(session: ReplaySession, content: unknown[]): void {
  if (replayableThinkingContent(content, 'other')) {
    replay.commit(session.model, session.scope, content);
  } else {
    replay.clear(session.model, session.scope);
  }
}

async function recordMessageAnswer(session: ReplaySession, response: Response): Promise<void> {
  const message = await response
    .clone()
    .json()
    .catch(() => undefined);

  if (!isJsonObject(message) || !Array.isArray(message['content'])) return;

  commitFinalTurn(session, message['content']);
}

function observeStreamAnswer(
  crossing: Crossing,
  session: ReplaySession,
  response: Response,
): Response {
  if (response.body === null) return response;

  const accumulator = new KimiStreamReplayAccumulator();
  const streamFinished = (): void => {
    const content = accumulator.content();

    if (content !== undefined) {
      commitFinalTurn(session, content);
    } else if (accumulator.upstreamError && applied.has(crossing)) {
      replay.clear(session.model, session.scope);
    }
  };
  const observed = observingSseLines(
    response.body,
    (line) => {
      accumulator.observeLine(line);
    },
    streamFinished,
  );
  const { status, statusText, headers } = response;

  return new Response(observed, { status, statusText, headers });
}

function streamingAnswer(response: Response): boolean {
  return response.headers.get('content-type')?.includes('text/event-stream') === true;
}

function clearRejectedSession(
  crossing: Crossing,
  session: ReplaySession,
  response: Response,
): void {
  if (!applied.has(crossing) || ![400, 422].includes(response.status)) return;

  replay.clear(session.model, session.scope);
}

export async function observeClaudeReplay(
  crossing: Crossing,
  response: Response,
  accountId: string | undefined,
): Promise<Response> {
  const session = replaySession(crossing, accountId);

  if (session === undefined) return response;

  clearRejectedSession(crossing, session, response);

  if (!response.ok) return response;
  if (streamingAnswer(response)) return observeStreamAnswer(crossing, session, response);

  await recordMessageAnswer(session, response);

  return response;
}

export function clearClaudeReplayCache(): void {
  replay.clearAll();
}
