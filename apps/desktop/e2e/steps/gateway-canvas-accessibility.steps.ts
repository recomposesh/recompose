import type { Locator, Page } from '@playwright/test';

import { expect } from '@playwright/test';
import { modelAliasFromName } from '@recompose/contracts';

import { dragCableOnto, fitCanvasToView, takeUpThePortAsk } from '../canvas-gestures';
import { rememberComposition, virtualModelInFocus } from '../canvas-memory';
import {
  accountPicker,
  bindingKindAsk,
  completeThePick,
  providerModelPicker,
} from '../canvas-picker';
import {
  cableBetween,
  cableGrabEnd,
  DRAFT_NODE,
  GATEWAY_NODE,
  hitTarget,
  modelNodeId,
  nodeTreatment,
  politelySaid,
  sourcePort,
  standingCables,
  standingNodes,
  targetNodeId,
  targetPort,
  urgentlySaid,
} from '../canvas-screen';
import { Then, When } from '../fixtures';
import { pickWithTheKeyboard } from '../keyboard-walk';
import { accountHeldAs, KEY_ACCOUNT } from '../stored-target-accounts';

/** The real model the stored Anthropic key account serves, which every binding here names. */
const SERVED_MODEL = 'claude-sonnet-5';

/** The words the canvas refuses a landing with, which the live region carries whole. */
const REFUSAL = 'A cable binds a virtual model or a router to a provider it does not already hold.';

/** The card a name stands as, which is its stored definition or the draft still holding its seat. */
async function cardStandingFor(page: Page, name: string): Promise<string> {
  const stored = modelNodeId(modelAliasFromName(name));

  return (await standingNodes(page)).includes(stored) ? stored : DRAFT_NODE;
}

/** One control a pointer has to be able to meet, and the measure it offers a pointer at. */
type PointerTarget = { named: string; kind: 'port' | 'cable end'; width: number; height: number };

/** A control a pointer has to be able to meet, before anything has been measured about it. */
type OfferedTarget = { named: string; kind: PointerTarget['kind']; control: Locator };

/** Every port and cable end the standing composition offers a pointer, named as a person reads it. */
function everyOfferedTarget(
  page: Page,
  nodes: readonly string[],
  cables: readonly string[],
): OfferedTarget[] {
  return [
    ...nodes.flatMap((nodeId): OfferedTarget[] => [
      {
        named: `the outgoing port of "${nodeId}"`,
        kind: 'port',
        control: sourcePort(page, nodeId),
      },
      {
        named: `the incoming port of "${nodeId}"`,
        kind: 'port',
        control: targetPort(page, nodeId),
      },
    ]),
    ...cables.flatMap((cable): OfferedTarget[] => [
      {
        named: `the source end of "${cable}"`,
        kind: 'cable end',
        control: cableGrabEnd(page, cable, 'source'),
      },
      {
        named: `the target end of "${cable}"`,
        kind: 'cable end',
        control: cableGrabEnd(page, cable, 'target'),
      },
    ]),
  ];
}

/**
 * Measures every port and cable end that actually stands on the canvas.
 *
 * @summary A card carries only the ports its kind has, and a structural wire carries no grab end
 * at all, so each offer is measured only where it stands rather than asserted into existence.
 */
async function everyStandingTarget(page: Page): Promise<PointerTarget[]> {
  const offered = everyOfferedTarget(page, await standingNodes(page), await standingCables(page));
  const standing: PointerTarget[] = [];

  for (const { named, kind, control } of offered) {
    if ((await control.count()) === 1) {
      standing.push({ named, kind, ...(await hitTarget(control)) });
    }
  }

  return standing;
}

When(
  'the person, with the keyboard alone, takes up the ask of {string}, picking the stored Anthropic key account and the provider model {string}',
  async ({ page }, name: string, providerModel: string) => {
    await takeUpThePortAsk(page, await cardStandingFor(page, name));

    await pickWithTheKeyboard(
      page,
      bindingKindAsk(page).getByRole('button', { name: /^Provider/u }),
      'the target kind',
    );
    await pickWithTheKeyboard(
      page,
      accountPicker(page).getByRole('button', { name: KEY_ACCOUNT }),
      `the stored account "${KEY_ACCOUNT}"`,
    );
    await pickWithTheKeyboard(
      page,
      providerModelPicker(page).getByRole('button', { name: providerModel }),
      `the provider model "${providerModel}"`,
    );

    await expect(providerModelPicker(page)).toBeHidden();
  },
);

When(
  'the person binds {string} to the stored Anthropic key account',
  async ({ page }, name: string) => {
    await takeUpThePortAsk(page, await cardStandingFor(page, name));
    await completeThePick(page, KEY_ACCOUNT, SERVED_MODEL);
  },
);

const COMPANION = 'steady';

When("the person drops a cable from the gateway's port onto that node", async ({ page }) => {
  await rememberComposition(page);
  await fitCanvasToView(page);
  await dragCableOnto(
    page,
    sourcePort(page, GATEWAY_NODE),
    targetPort(page, targetNodeId(COMPANION)),
  );
});

Then('the account stands wired as a target node', async ({ page }) => {
  const alias = modelAliasFromName(virtualModelInFocus(page));

  await expect.poll(async () => standingNodes(page)).toContain(targetNodeId(alias));
  expect(await nodeTreatment(page, targetNodeId(alias))).toBe('target');
  await expect(cableBetween(page, modelNodeId(alias), targetNodeId(alias))).toHaveCount(1);
});

Then('the live region announces the new binding', async ({ page }) => {
  const key = await accountHeldAs(page, 'api-key');

  await expect(politelySaid(page)).toHaveText(
    `Bound the virtual model "${virtualModelInFocus(page)}" to "${key.label}".`,
  );
  await expect(urgentlySaid(page)).toBeEmpty();
});

Then('the live region announces the refusal', async ({ page }) => {
  await expect(urgentlySaid(page)).toHaveText(`Refused the binding. ${REFUSAL}`);
  await expect(politelySaid(page)).toBeEmpty();
});

Then('the live region announces the removed binding', async ({ page }) => {
  await expect(politelySaid(page)).toHaveText(
    `Unbound the virtual model "${virtualModelInFocus(page)}", which now holds no target.`,
  );
  await expect(urgentlySaid(page)).toBeEmpty();
});

When('the person resets the zoom to one hundred percent', async ({ page }) => {
  await page.getByRole('button', { name: 'Reset zoom' }).click();
});

Then(
  'every port and cable endpoint offers a hit target of at least {int} by {int} pixels',
  async ({ page }, across: number, down: number) => {
    const standing = await everyStandingTarget(page);

    expect(standing.map(({ kind }) => kind)).toEqual(expect.arrayContaining(['port', 'cable end']));
    expect(standing.filter(({ width, height }) => width < across || height < down)).toEqual([]);
  },
);
