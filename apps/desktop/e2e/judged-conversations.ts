import type { Page } from '@playwright/test';

import { expect } from '@playwright/test';

import type { JudgeStub } from './judge-stub';
import type { TurnAsked } from './judged-traffic';
import type { ScriptedProvider } from './scripted-provider';

import { childBehindTheBranch, theStandInsForgetTheOpening } from './judged-gateway';
import { aTurnArrives } from './judged-traffic';

/** What a later turn of one conversation has to carry for the gateway to know it as the same one. */
export type Conversation = Pick<TurnAsked, 'conversation' | 'opening' | 'system'>;

/** The stand-ins a conversation is opened against, which one scenario holds one of each. */
export type StandIns = { judge: JudgeStub; provider: ScriptedProvider };

const underway = new WeakMap<Page, readonly Conversation[]>();

/** Remembers the conversations a scenario means to carry on, before any of them has spoken. */
export function rememberConversations(page: Page, held: readonly Conversation[]): void {
  underway.set(page, held);
}

export function conversationsUnderway(page: Page): readonly Conversation[] {
  const held = underway.get(page);

  if (held === undefined) {
    throw new Error('no step in this scenario opened a conversation to carry on');
  }

  return held;
}

/** The one conversation the scenario opened, refused where it opened several instead. */
export function conversationUnderway(page: Page): Conversation {
  const held = conversationsUnderway(page);
  const [only] = held;

  if (held.length !== 1 || only === undefined) {
    throw new Error(`this scenario opened ${String(held.length)} conversations rather than one`);
  }

  return only;
}

/**
 * Opens one conversation on the branch a scenario names, and puts the opening turn out of sight.
 *
 * @summary The turn is what earns the pin, so it has to really travel: a scenario cannot say a
 * conversation already holds a branch without the judge having named one. Its cost is then taken
 * back off both stand-ins, because a later step counting classification calls or reading which
 * child served would otherwise count this turn's as that step's own. The judge is left reading
 * requests the same way it just did, so a scenario that expects a fresh judgment gets exactly one
 * call rather than the retry an unscripted judge would earn.
 */
export async function aConversationEarns(
  page: Page,
  stands: StandIns,
  label: string,
  held: Conversation = {},
): Promise<void> {
  stands.judge.names(label);

  await aTurnArrives(page, held);

  expect(stands.provider.modelsAsked(), `the opening turn earned no "${label}" branch`).toEqual([
    childBehindTheBranch(label),
  ]);

  theStandInsForgetTheOpening(stands);
  stands.judge.names(label);
  rememberConversations(page, [held]);
}
