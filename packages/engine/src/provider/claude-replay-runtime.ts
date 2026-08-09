import type { Crossing, JsonObject } from '../gateway-wire';

import { isJsonObject } from '../gateway-wire';
import { observingSseLines } from '../subscription/observing-sse';
import { ClaudeThinkingReplay } from './claude-thinking-replay';
import { KimiStreamReplayAccumulator } from './kimi-stream-replay';
import { replayableKimiThinkingContent } from './kimi-thinking-replay';

type ReplaySession = { model: string; scope: string };

const replay = new ClaudeThinkingReplay();
const applied = new WeakSet<Crossing>();

function replaySession(crossing: Crossing): ReplaySession | undefined {
  const { callerFingerprint, dialect, providerModel, replayScopeId } = crossing;

  if (dialect !== 'anthropic' || replayScopeId === undefined || callerFingerprint === undefined) {
    return undefined;
  }

  return { model: providerModel, scope: `${callerFingerprint}:${replayScopeId}` };
}

export function prepareClaudeReplay(crossing: Crossing, body: JsonObject): JsonObject {
  const session = replaySession(crossing);

  if (session === undefined) return body;

  const injection = replay.inject(session.model, session.scope, body);

  if (injection.applied) applied.add(crossing);

  return injection.body;
}

function commitFinalTurn(session: ReplaySession, content: unknown[]): void {
  if (replayableKimiThinkingContent(content)) {
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
): Promise<Response> {
  const session = replaySession(crossing);

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
