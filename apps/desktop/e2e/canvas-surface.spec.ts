import type { Page } from '@playwright/test';

import { expect } from '@playwright/test';

import {
  dragCableOnto,
  dragCardBy,
  dropCableAt,
  emptyCanvasSpot,
  fitCanvasToView,
  pullCableTo,
  releaseCable,
} from './canvas-gestures';
import {
  accountPicker,
  cableBetween,
  cableGrabEnd,
  cableId,
  canvasCable,
  canvasNode,
  canvasTool,
  completeThePick,
  DRAFT_CABLE,
  DRAFT_NODE,
  GATEWAY_NODE,
  ghostNodeId,
  minimap,
  minimapCards,
  modelNodeId,
  nodeSeat,
  nodeSeats,
  nodeTreatment,
  openGatewayCanvas,
  PENDING_CABLE,
  PENDING_NODE,
  pickProviderModel,
  plusOn,
  politelySaid,
  providerModelPicker,
  removalConfirmation,
  cancelRemoval,
  confirmRemoval,
  sourcePort,
  standingCables,
  standingNodes,
  storedBinding,
  targetNodeId,
  targetPort,
  urgentlySaid,
  viewportZoom,
  wireBetween,
} from './canvas-screen';
import { test } from './fixtures';
import {
  accountHeldAs,
  GATEWAY_A_SCENARIO_ACTS_ON,
  gatewayTargetingAKey,
  KEY_ACCOUNT,
} from './stored-target-accounts';
import { bindingOf, seedVirtualModels } from './stored-virtual-models';

const GATEWAY = GATEWAY_A_SCENARIO_ACTS_ON;

const MODEL = 'fast';

const OTHER_MODEL = 'slow';

const SERVED = 'claude-sonnet-5';

/** An account id no registry holds, which is what leaves a binding standing on a ghost. */
const GONE = 'nowhere';

async function gatewayHoldingABrokenBinding(page: Page): Promise<string> {
  await gatewayTargetingAKey(page);

  const key = await accountHeldAs(page, 'api-key');

  await seedVirtualModels(page, GATEWAY, [
    bindingOf(MODEL, GONE, SERVED),
    bindingOf(OTHER_MODEL, key.id, SERVED),
  ]);
  await openGatewayCanvas(page, GATEWAY);

  return key.id;
}

test('the gateway plus births a draft card wired to the gateway', async ({ page }) => {
  await gatewayTargetingAKey(page);
  await openGatewayCanvas(page, GATEWAY);
  await plusOn(page, GATEWAY_NODE).click();

  await expect.poll(async () => standingNodes(page)).toContain(DRAFT_NODE);
  expect(await nodeTreatment(page, DRAFT_NODE)).toBe('draft-model');
  expect(await standingCables(page)).toContain(DRAFT_CABLE);
  await expect(cableBetween(page, GATEWAY_NODE, DRAFT_NODE)).toHaveCount(1);
  await expect(wireBetween(page, GATEWAY_NODE, DRAFT_NODE)).toHaveCount(1);
});

test('the plus on a virtual model opens the picker and a completed pick binds it', async ({
  page,
}) => {
  await gatewayTargetingAKey(page);
  await seedVirtualModels(page, GATEWAY, [bindingOf(MODEL, GONE, SERVED)]);
  await openGatewayCanvas(page, GATEWAY);
  await plusOn(page, modelNodeId(MODEL)).click();

  await expect(accountPicker(page)).toBeVisible();

  await completeThePick(page, KEY_ACCOUNT, SERVED);

  await expect
    .poll(async () => (await storedBinding(page, GATEWAY, MODEL))?.accountId)
    .not.toBe(GONE);
  await expect(politelySaid(page)).not.toBeEmpty();
});

test('a cable let go on empty canvas stands a pending card under the picker', async ({ page }) => {
  await gatewayTargetingAKey(page);
  await seedVirtualModels(page, GATEWAY, [bindingOf(MODEL, GONE, SERVED)]);
  await openGatewayCanvas(page, GATEWAY);
  await dropCableAt(page, sourcePort(page, modelNodeId(MODEL)), await emptyCanvasSpot(page));

  await expect.poll(async () => standingNodes(page)).toContain(PENDING_NODE);
  await expect.poll(async () => standingCables(page)).toContain(PENDING_CABLE);
  await expect(accountPicker(page)).toBeVisible();
});

test('Esc cancels a cable in flight and the composition stands unchanged', async ({ page }) => {
  await gatewayTargetingAKey(page);
  await seedVirtualModels(page, GATEWAY, [bindingOf(MODEL, GONE, SERVED)]);
  await openGatewayCanvas(page, GATEWAY);

  const before = await standingNodes(page);

  await pullCableTo(page, sourcePort(page, modelNodeId(MODEL)), await emptyCanvasSpot(page));
  await page.keyboard.press('Escape');
  await releaseCable(page);

  await expect(accountPicker(page)).toBeHidden();
  expect(await standingNodes(page)).toEqual(before);
});

test('a cable dropped on a stored target asks only for the provider model', async ({ page }) => {
  const keyId = await gatewayHoldingABrokenBinding(page);

  await dragCableOnto(
    page,
    sourcePort(page, modelNodeId(MODEL)),
    targetPort(page, targetNodeId(keyId)),
  );

  await expect(providerModelPicker(page)).toBeVisible();

  await pickProviderModel(page, SERVED);

  await expect.poll(async () => (await storedBinding(page, GATEWAY, MODEL))?.accountId).toBe(keyId);
});

test('a cable from the gateway onto a target refuses and interrupts', async ({ page }) => {
  const keyId = await gatewayHoldingABrokenBinding(page);

  await dragCableOnto(page, sourcePort(page, GATEWAY_NODE), targetPort(page, targetNodeId(keyId)));

  await expect(urgentlySaid(page)).not.toBeEmpty();
});

test('dragging a broken cable onto a stored target repairs the binding', async ({ page }) => {
  const keyId = await gatewayHoldingABrokenBinding(page);

  expect(await nodeTreatment(page, ghostNodeId(GONE))).toBe('ghost-target');
  await expect(canvasCable(page, cableId(MODEL))).toBeVisible();

  await fitCanvasToView(page);
  await dragCableOnto(
    page,
    cableGrabEnd(page, cableId(MODEL), 'target'),
    targetPort(page, targetNodeId(keyId)),
  );
  await pickProviderModel(page, SERVED);

  await expect.poll(async () => standingNodes(page)).not.toContain(ghostNodeId(GONE));
});

test('a card keeps a dragged seat and every card reads its own', async ({ page }) => {
  await gatewayTargetingAKey(page);
  await seedVirtualModels(page, GATEWAY, [bindingOf(MODEL, GONE, SERVED)]);
  await openGatewayCanvas(page, GATEWAY);

  const seated = await nodeSeats(page);
  const before = await nodeSeat(page, modelNodeId(MODEL));

  await dragCardBy(page, canvasNode(page, modelNodeId(MODEL)), { x: 90, y: 70 });

  await expect
    .poll(async () => (await nodeSeat(page, modelNodeId(MODEL))).x)
    .toBeGreaterThan(before.x);

  expect(Object.keys(await nodeSeats(page))).toEqual(Object.keys(seated));
});

test('Delete on a virtual model asks first and answers both ways', async ({ page }) => {
  await gatewayTargetingAKey(page);
  await seedVirtualModels(page, GATEWAY, [bindingOf(MODEL, GONE, SERVED)]);
  await openGatewayCanvas(page, GATEWAY);
  await canvasNode(page, modelNodeId(MODEL)).click();
  await page.keyboard.press('Delete');

  await expect(removalConfirmation(page, MODEL)).toBeVisible();

  await cancelRemoval(page, MODEL);

  await expect(canvasNode(page, modelNodeId(MODEL))).toBeVisible();

  await canvasNode(page, modelNodeId(MODEL)).click();
  await page.keyboard.press('Delete');
  await confirmRemoval(page, MODEL);

  await expect.poll(async () => standingNodes(page)).not.toContain(modelNodeId(MODEL));
});

test('the corner furniture magnifies the view and mirrors the composition', async ({ page }) => {
  await gatewayTargetingAKey(page);
  await seedVirtualModels(page, GATEWAY, [bindingOf(MODEL, GONE, SERVED)]);
  await openGatewayCanvas(page, GATEWAY);

  const resting = await viewportZoom(page);

  await canvasTool(page, 'Zoom in').click();

  await expect.poll(async () => viewportZoom(page)).toBeGreaterThan(resting);
  await expect(minimap(page)).toBeVisible();
  expect(await minimapCards(page)).toBeGreaterThan(0);
});
