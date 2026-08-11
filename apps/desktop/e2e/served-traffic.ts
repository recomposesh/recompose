import type { Page } from '@playwright/test';

import type { GatewayAnswer } from './gateway-client';

import { sendTurn, turnUnder } from './gateway-client';
import { gatewayAddress } from './gateway-screen';
import { SERVING_GATEWAY } from './served-gateway';

/** Where an Anthropic client sends a turn, which is the path every telemetry scenario asks on. */
const TURN_PATH = '/v1/messages';

/** What one client app calls itself, so a second one can be counted apart from it. */
export const ONE_CLIENT_APP = 'acme-cli/1.0';

/** What the other client app calls itself. */
export const ANOTHER_CLIENT_APP = 'other-cli/2.0';

const answersHeld = new WeakMap<Page, GatewayAnswer[]>();

/** Every answer the gateway gave this scenario, in the order the turns were sent. */
export function answersGiven(page: Page): GatewayAnswer[] {
  return answersHeld.get(page) ?? [];
}

/**
 * Asks the gateway for a turn under one of its names, the way a command-line client would.
 *
 * @summary The wire body is the real one a client sends, so the request travels the whole serving
 * path and lands as a row the surfaces read rather than as a fact the test wrote for them.
 */
export async function turnThrough(
  page: Page,
  model: string,
  clientApp?: string,
): Promise<GatewayAnswer> {
  const address = await gatewayAddress(page, SERVING_GATEWAY);
  const answer = await sendTurn(address, TURN_PATH, turnUnder(model), clientApp);

  answersHeld.set(page, [...answersGiven(page), answer]);

  return answer;
}

/**
 * Asks for a run of turns under one name, one after another.
 *
 * @summary The turns go in order rather than at once, because the gateway keys its rows by the
 * instant it answered and a scenario reading a run newest-first needs that order to be the one it
 * sent them in.
 */
export async function turnsThrough(page: Page, model: string, count: number): Promise<void> {
  const address = await gatewayAddress(page, SERVING_GATEWAY);
  const given: GatewayAnswer[] = [];

  for (let sent = 0; sent < count; sent += 1) {
    given.push(await sendTurn(address, TURN_PATH, turnUnder(model)));
  }

  answersHeld.set(page, [...answersGiven(page), ...given]);
}

/** The wire body a client sends when it asks for a turn carrying words of its own. */
function turnCarrying(model: string, prompt: string): unknown {
  return { model, max_tokens: 64, messages: [{ role: 'user', content: prompt }] };
}

/** Asks for a turn whose prompt carries words no surface may ever print. */
export async function turnCarryingPrompt(
  page: Page,
  model: string,
  prompt: string,
): Promise<GatewayAnswer> {
  const address = await gatewayAddress(page, SERVING_GATEWAY);
  const answer = await sendTurn(address, TURN_PATH, turnCarrying(model, prompt));

  answersHeld.set(page, [...answersGiven(page), answer]);

  return answer;
}
