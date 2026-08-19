import type { Page } from '@playwright/test';

import type { GatewayAnswer } from './gateway-client';

import { sendTurnUnder } from './gateway-client';
import { recordExchange } from './gateway-exchanges';
import { gatewayAddress } from './gateway-screen';
import { theRoutedModelName } from './routed-gateway';
import { focusedGateway } from './scenario-memory';

/** Where an Anthropic client sends a turn, which is the path these scenarios ask under. */
const TURN_PATH = '/v1/messages';

/** The header a client names its own conversation in, which outranks any reading of the words. */
const CONVERSATION_KEY = 'x-session-id';

/** The words a request opens with where a scenario cares only that one arrived. */
const AN_ORDINARY_ASK = 'Say hello.';

/** How one request a scenario sends differs from the plain one. */
export type TurnAsked = {
  /** The caller's own words, which are also what a fingerprint falls back to reading. */
  opening?: string;
  /** The key a client names its conversation by, where the scenario is about a conversation. */
  conversation?: string;
  /**
   * The turn a provider is asked to carry on from, which seals the request to one account.
   *
   * @summary A request naming an earlier response is opaque to every account but the one that minted
   * it, so a router that spread it would hand a second account a token it cannot read. Naming one is
   * the whole of what a server-state turn is on the wire.
   */
  resumes?: string;
};

function bodyOf(model: string, asked: TurnAsked): unknown {
  return {
    model,
    max_tokens: 64,
    messages: [{ role: 'user', content: asked.opening ?? AN_ORDINARY_ASK }],
    ...(asked.resumes === undefined ? {} : { previous_response_id: asked.resumes }),
  };
}

/**
 * Asks the gateway for one turn under its judged name, the way a command-line client would.
 *
 * @summary The model name is read back off the stored gateway rather than written here, so a
 * scenario that named its definition once in the Given never repeats the name in a step. The answer
 * is kept where every step file reads one, because these scenarios pair their own When with the
 * shipped Then that reads what came back.
 */
export async function aTurnArrives(page: Page, asked: TurnAsked = {}): Promise<GatewayAnswer> {
  const gateway = focusedGateway(page);
  const address = await gatewayAddress(page, gateway);
  const model = await theRoutedModelName(page);
  const answer = await sendTurnUnder(
    address,
    TURN_PATH,
    bodyOf(model, asked),
    asked.conversation === undefined ? {} : { [CONVERSATION_KEY]: asked.conversation },
  );

  recordExchange(page, gateway, answer);

  return answer;
}
