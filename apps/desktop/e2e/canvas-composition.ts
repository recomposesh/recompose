import type { Page } from '@playwright/test';

import { expect } from '@playwright/test';
import { modelAliasFromName } from '@recompose/contracts';

import { dropCableOnEmptyCanvas, takeUpThePortAsk } from './canvas-gestures';
import { rememberDropPoint, rememberVirtualModel } from './canvas-memory';
import {
  DRAFT_NODE,
  GATEWAY_NODE,
  modelNodeId,
  nodeTreatment,
  openGatewayCanvas,
  sourcePort,
  standingNodes,
} from './canvas-screen';
import { draftNameField } from './gateway-drawer';
import { focusedGateway } from './scenario-memory';

/** The card a name stands as: the stored definition, or the draft while it holds no provider yet. */
export async function cardNamed(page: Page, name: string): Promise<string> {
  const standing = await standingNodes(page);
  const stored = modelNodeId(modelAliasFromName(name));

  rememberVirtualModel(page, name);

  if (standing.includes(stored)) {
    return stored;
  }

  if (standing.includes(DRAFT_NODE)) {
    return DRAFT_NODE;
  }

  throw new Error(`no card on the canvas stands for the virtual model "${name}"`);
}

/** Stands a definition a person began and left unbound, the one shape holding no target at all. */
export async function draftNamed(page: Page, name: string): Promise<void> {
  await openGatewayCanvas(page, focusedGateway(page));
  await takeUpThePortAsk(page, GATEWAY_NODE);
  await expect(draftNameField(page)).toBeVisible();
  await draftNameField(page).fill(name);
  rememberVirtualModel(page, name);

  await expect.poll(async () => standingNodes(page)).toContain(DRAFT_NODE);
  expect(await nodeTreatment(page, DRAFT_NODE)).toBe('draft-model');
}

/** Pulls a cable out of a card's port and lets it go where nothing stands, keeping the spot. */
export async function letGoOnEmptyCanvas(page: Page, nodeId: string): Promise<void> {
  rememberDropPoint(page, await dropCableOnEmptyCanvas(page, sourcePort(page, nodeId)));
}
