import { expect } from '@playwright/test';

import { Given, Then, When } from '../fixtures';
import {
  aConversationEarns,
  conversationsUnderway,
  conversationUnderway,
  rememberConversations,
} from '../judged-conversations';
import { CODE_BRANCH } from '../judged-gateway';
import { theRouterRejudgesEveryRequest } from '../judged-policy';
import { aTurnArrives } from '../judged-traffic';
import { PIN_RESTS_FOR_MS } from '../launch-environment';

/** How long a resting conversation is left alone, past the window its app launched under. */
const LONGER_THAN_THE_PIN_RESTS_MS = PIN_RESTS_FOR_MS + 1_000;

/** What the conversation keyed by its own key opens with, before it asks the same thing again. */
const WHAT_THE_KEYED_CONVERSATION_OPENED_WITH = 'Why does this build fail?';

/** The same question in other words, which no reading of content alone would pair with the first. */
const THE_SAME_QUESTION_REWORDED = 'The compiler is unhappy and I cannot see why.';

/** Words two conversations happen to share, so only their keys stand to tell them apart. */
const AN_OPENING_TWO_CONVERSATIONS_SHARE = 'Say hello.';

const THE_MORNING_CONVERSATION = 'sess-morning';

const THE_EVENING_CONVERSATION = 'sess-evening';

/** What a conversation that belongs on the everyday branch opens with. */
const AN_EVERYDAY_OPENING = 'How was your weekend?';

const CLOCK_AT_THE_EARLIER_TURN = '2026-08-19T09:14:03Z';

const CLOCK_AT_THE_NEXT_TURN = '2026-08-19T11:52:41Z';

/** The turn a provider carries on from, which is opaque to every account but the one that minted it. */
const A_TURN_ONE_ACCOUNT_HOLDS = 'resp_68c1f4a20b3e';

/** A system prompt of the shape a coding client sends, carrying the clock that moves every turn. */
function stampedSystemPrompt(at: string): string {
  return `You are a coding assistant. The current time is ${at}.`;
}

/**
 * @summary Both sentences describe one arrangement: a conversation that has already been judged
 * once and holds the branch that judgment named. The scenario picks its wording to suit what it
 * goes on to prove, and one step answers either.
 */
Given(
  /^a conversation whose (?:first request|earlier turn) earned the "(.+)" branch$/u,
  async ({ judge, page, scriptedProvider }, label: string) => {
    await aConversationEarns(page, { judge, provider: scriptedProvider }, label);
  },
);

Given(
  'a conversation carrying a caller-supplied key whose first request earned the {string} branch',
  async ({ judge, page, scriptedProvider }, label: string) => {
    await aConversationEarns(page, { judge, provider: scriptedProvider }, label, {
      conversation: THE_MORNING_CONVERSATION,
      opening: WHAT_THE_KEYED_CONVERSATION_OPENED_WITH,
    });
  },
);

Given(
  'a conversation pinned to the {string} branch whose system prompt stamps the current time into every turn',
  async ({ judge, page, scriptedProvider }, label: string) => {
    await aConversationEarns(page, { judge, provider: scriptedProvider }, label, {
      opening: AN_EVERYDAY_OPENING,
      system: stampedSystemPrompt(CLOCK_AT_THE_EARLIER_TURN),
    });
  },
);

/**
 * @summary The judge reads both conversations the same way, because the scenario is about their
 * keys telling them apart rather than about anything the judge said. An unscripted judge would
 * answer nothing, earn a retry on each request, and turn a count of conversations into a count of
 * retries.
 */
Given(
  'two conversations carrying different caller-supplied keys and identical opening messages',
  ({ judge, page }) => {
    judge.names(CODE_BRANCH.label);

    rememberConversations(page, [
      { conversation: THE_MORNING_CONVERSATION, opening: AN_OPENING_TWO_CONVERSATIONS_SHARE },
      { conversation: THE_EVENING_CONVERSATION, opening: AN_OPENING_TWO_CONVERSATIONS_SHARE },
    ]);
  },
);

Given('re-judge every request enabled on the router', async ({ page }) => {
  await theRouterRejudgesEveryRequest(page);
});

/**
 * @summary The rest is real waiting rather than a moved clock, because a pin ages on the engine
 * child's own reading of the time and nothing outside that process can move it. The window the app
 * launched under is what makes the rest a few seconds instead of ten minutes.
 */
Given("the conversation then rested idle past the pin's expiry", async ({ page }) => {
  await page.waitForTimeout(LONGER_THAN_THE_PIN_RESTS_MS);
});

When('a second request arrives carrying the same conversation fingerprint', async ({ page }) => {
  await aTurnArrives(page, conversationUnderway(page));
});

When('its next turn arrives', async ({ page }) => {
  await aTurnArrives(page, conversationUnderway(page));
});

When(
  'its second request arrives under the same key with a reworded opening message',
  async ({ page }) => {
    await aTurnArrives(page, {
      ...conversationUnderway(page),
      opening: THE_SAME_QUESTION_REWORDED,
    });
  },
);

When('its next turn arrives wearing a fresh timestamp', async ({ page }) => {
  await aTurnArrives(page, {
    ...conversationUnderway(page),
    system: stampedSystemPrompt(CLOCK_AT_THE_NEXT_TURN),
  });
});

When(
  "each conversation's first request arrives under {string}",
  async ({ page }, model: string) => {
    for (const held of conversationsUnderway(page)) {
      await aTurnArrives(page, { ...held, model });
    }
  },
);

When(
  'a second request arrives that the judge classifies as {string}',
  async ({ judge, page }, label: string) => {
    judge.names(label);

    await aTurnArrives(page, conversationUnderway(page));
  },
);

When('a request arrives that resumes state a provider holds for one account', async ({ page }) => {
  await aTurnArrives(page, { ...conversationUnderway(page), resumes: A_TURN_ONE_ACCOUNT_HOLDS });
});

When(
  'a request resuming state a provider holds arrives that the judge classifies as {string}',
  async ({ judge, page }, label: string) => {
    judge.names(label);

    await aTurnArrives(page, { ...conversationUnderway(page), resumes: A_TURN_ONE_ACCOUNT_HOLDS });
  },
);

Then('the judge receives one classification call for each conversation', ({ judge, page }) => {
  expect(judge.classificationsAsked()).toHaveLength(conversationsUnderway(page).length);
});

Then('the judge receives a fresh classification call', ({ judge }) => {
  expect(judge.classificationsAsked()).toHaveLength(1);
});
