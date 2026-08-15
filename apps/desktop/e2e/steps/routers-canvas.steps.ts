import type { Page } from '@playwright/test';
import type { RouteNode, Routing } from '@recompose/contracts';

import { expect } from '@playwright/test';
import { modelAliasFromName } from '@recompose/contracts';

import { draftNamed, letGoOnEmptyCanvas } from '../canvas-composition';
import { fitCanvasToView } from '../canvas-gestures';
import { standsAt, theDropPoint } from '../canvas-memory';
import { bindingKindAsk, pickTheTargetKind } from '../canvas-picker';
import {
  cableBetween,
  canvasCable,
  canvasNode,
  DRAFT_NODE,
  modelNodeId,
  nodeTreatment,
  openGatewayCanvas,
} from '../canvas-screen';
import { Given, Then, When } from '../fixtures';
import { sendTurn, turnUnder } from '../gateway-client';
import { gatewayAddress, storedGateway } from '../gateway-screen';
import { aRoutedModelStands, FIRST_TARGET, SECOND_TARGET } from '../routed-gateway';
import { focusedGateway } from '../scenario-memory';
import { gatewayTargetingAKey } from '../stored-target-accounts';

const MESSAGES_PATH = '/v1/messages';

const ANSWERED = 200;

const RATE_LIMITED = 429;

/**
 * What the first child promises before it can serve again, which is what moves the walk along.
 *
 * @summary A rate limit is the plainest thing a target says no with that leaves the ladder free to
 * try the next one, so the scenario's hand-off is a routing decision rather than a transport
 * accident. The time it promises is never read here; only the walking is.
 */
const FIRST_TARGET_COOLS_FOR = 90;

/** The stroke every cable wears its standing in, ahead of the standing's own name. */
const STANDING_STROKE = 'stroke-cable-';

/** The definition a routers canvas scenario acts on, read as the router it enters through. */
type RoutedEntry = {
  modelId: string;
  routing: Routing;
  entry: Extract<RouteNode, { kind: 'router' }>;
};

/**
 * Every definition the focused gateway holds that enters through a router, named by id.
 *
 * @summary It answers a list rather than refusing, so a step can wait on a write that has not
 * landed yet, and so a scenario naming the definition it expects proves that one alone stands.
 */
async function routedModelIds(page: Page): Promise<string[]> {
  const { virtualModels } = await storedGateway(page, focusedGateway(page));

  return virtualModels
    .filter((model) => model.routing.nodes[model.routing.entry]?.kind === 'router')
    .map((model) => model.id);
}

async function theRoutedModel(page: Page): Promise<RoutedEntry> {
  const gateway = await storedGateway(page, focusedGateway(page));

  for (const model of gateway.virtualModels) {
    const entry = model.routing.nodes[model.routing.entry];

    if (entry?.kind === 'router') {
      return { modelId: model.id, routing: model.routing, entry };
    }
  }

  throw new Error(`no virtual model on "${gateway.displayName}" enters through a router`);
}

/**
 * The address one route node's card and its incoming cable are both named by.
 *
 * @summary The entry answers in the virtual model's own name and every node below it adds the id
 * its ladder holds it by. A route node id is minted rather than authored, so reading the address
 * off the stored table is the only way a step can name a card the canvas wrote.
 */
function addressNamed(routed: RoutedEntry, routeNodeId: string): string {
  return routeNodeId === routed.routing.entry ? routed.modelId : `${routed.modelId}:${routeNodeId}`;
}

function routeCard(routed: RoutedEntry, routeNodeId: string): string {
  return `route:${addressNamed(routed, routeNodeId)}`;
}

function entryCard(routed: RoutedEntry): string {
  return routeCard(routed, routed.routing.entry);
}

/**
 * The cable feeding the child that serves one real model.
 *
 * @summary Both children reach one origin under one dialect, so the real model a child names is
 * what tells the two apart, on the wire and here alike. Counting rungs instead would pass just as
 * well on a ladder that had quietly reordered itself.
 */
function cableInto(routed: RoutedEntry, providerModel: string): string {
  for (const [routeNodeId, node] of Object.entries(routed.routing.nodes)) {
    if (node.kind === 'target' && node.providerModel === providerModel) {
      return `cable:${addressNamed(routed, routeNodeId)}`;
    }
  }

  throw new Error(`the router under "${routed.modelId}" holds no child serving "${providerModel}"`);
}

/**
 * The standing a cable paints, read off the stroke its own line wears.
 *
 * @summary The halo and the pulse ride the same path under strokes of their own, so the reading
 * comes off the line the flow marks as the edge itself rather than off whatever else was drawn
 * there. A cable wearing no standing at all is the break this reports, rather than a quiet default.
 */
async function cablePaints(page: Page, cable: string): Promise<string> {
  const worn = await canvasCable(page, cable)
    .locator('.react-flow__edge-path')
    .evaluate(
      (line, prefix) => [...line.classList].find((name) => name.startsWith(prefix)),
      STANDING_STROKE,
    );

  if (worn === undefined) {
    throw new Error(`the cable "${cable}" paints no standing the canvas can be read by`);
  }

  return worn.slice(STANDING_STROKE.length);
}

/** Answers the binding ask with a router, scoped to the ask so no card behind it answers instead. */
async function pickTheRouterKind(page: Page): Promise<void> {
  await bindingKindAsk(page)
    .getByRole('button', { name: /^Router/u })
    .click();
}

Given(
  'the ask open from a cable dragged out of {string} and dropped on empty canvas',
  async ({ page }, name: string) => {
    await gatewayTargetingAKey(page);
    await draftNamed(page, name);
    await letGoOnEmptyCanvas(page, DRAFT_NODE);

    await expect(bindingKindAsk(page)).toBeVisible();
  },
);

Given(
  'a router node standing wired to a virtual model {string}',
  async ({ page, scriptedProvider }, name: string) => {
    await aRoutedModelStands(page, scriptedProvider, {
      model: modelAliasFromName(name),
      mode: 'failover',
      targets: [],
    });
    await openGatewayCanvas(page, focusedGateway(page));

    await expect(canvasNode(page, entryCard(await theRoutedModel(page)))).toBeVisible();
  },
);

When('the person picks the target', async ({ page }) => {
  await pickTheTargetKind(page);
});

When('the person picks the router', async ({ page }) => {
  await pickTheRouterKind(page);
});

When(
  "the person drags a cable from the router's port, drops it on empty canvas, and picks the router",
  async ({ page }) => {
    await fitCanvasToView(page);
    await letGoOnEmptyCanvas(page, entryCard(await theRoutedModel(page)));

    await expect(bindingKindAsk(page)).toBeVisible();
    await pickTheRouterKind(page);
  },
);

/**
 * One turn the first child turns away and the second answers, which is a hand-off down the ladder.
 *
 * @summary Both children were armed to serve as the definition landed, so overriding the first is
 * the whole of what this step changes. The reading proves the walk truly moved along rather than
 * the scenario merely hoping it did: the client got an answer, and both children carried a request
 * in the order the ladder declares them.
 */
When(
  'a request under {string} fails over from the first target to the second',
  async ({ page, scriptedProvider }, name: string) => {
    scriptedProvider.refuses(FIRST_TARGET.providerModel, {
      status: RATE_LIMITED,
      kind: 'rate_limit_error',
      retryAfterSeconds: FIRST_TARGET_COOLS_FOR,
    });

    const answer = await sendTurn(
      await gatewayAddress(page, focusedGateway(page)),
      MESSAGES_PATH,
      turnUnder(name),
    );

    expect(answer.status).toBe(ANSWERED);
    expect(scriptedProvider.modelsAsked()).toEqual([
      FIRST_TARGET.providerModel,
      SECOND_TARGET.providerModel,
    ]);
  },
);

Then('a router node stands wired to {string} at the drop point', async ({ page }, name: string) => {
  const modelId = modelAliasFromName(name);

  await expect.poll(async () => routedModelIds(page)).toEqual([modelId]);

  const card = entryCard(await theRoutedModel(page));

  await expect(canvasNode(page, card)).toBeVisible();
  expect(await nodeTreatment(page, card)).toBe('router');
  await expect(cableBetween(page, modelNodeId(modelId), card)).toHaveCount(1);
  await standsAt(canvasNode(page, card), theDropPoint(page));
});

Then('it holds no child', async ({ page }) => {
  const routed = await theRoutedModel(page);

  expect(routed.entry.children).toEqual([]);
  await expect(canvasNode(page, entryCard(routed))).toContainText('no child');
});

Then("a second router stands wired as the first router's child", async ({ page }) => {
  await expect
    .poll(async () => {
      const held = await theRoutedModel(page);

      return held.entry.children.map((child) => held.routing.nodes[child]?.kind ?? 'nothing');
    })
    .toEqual(['router']);

  const routed = await theRoutedModel(page);
  const [childId] = routed.entry.children;

  if (childId === undefined) {
    throw new Error(`the router under "${routed.modelId}" took no child`);
  }

  const nested = routeCard(routed, childId);

  await expect(canvasNode(page, nested)).toBeVisible();
  expect(await nodeTreatment(page, nested)).toBe('router');
  await expect(cableBetween(page, entryCard(routed), nested)).toHaveCount(1);
});

Then("the first target's cable paints as failed", async ({ page }) => {
  const routed = await theRoutedModel(page);

  await expect
    .poll(async () => cablePaints(page, cableInto(routed, FIRST_TARGET.providerModel)))
    .toBe('failed');
});

Then("the second target's cable paints as served", async ({ page }) => {
  const routed = await theRoutedModel(page);

  await expect
    .poll(async () => cablePaints(page, cableInto(routed, SECOND_TARGET.providerModel)))
    .toBe('served');
});
