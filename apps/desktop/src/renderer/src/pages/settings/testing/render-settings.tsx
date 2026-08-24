import type { SystemState } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { Suspense } from 'react';

import type { BridgeParameters } from '../../../shared/testing';

import { renderUnderTheBridge } from '../../../shared/browser-testing';

const observed: SystemState = {
  fileBrowser: 'finder',
  windowControls: 'leading',
  shortcutKey: 'command',
  loginItem: 'available',
  loginItemEnabled: false,
  menuBarVisible: false,
  configFolder: '~/Library/Application Support/recompose',
  version: '0.3.0',
};

/**
 * Bridge parameters that make the app report the system state a case needs.
 *
 * @summary Reach for it in any settings spec whose component reads `system:get`.
 */
export function reportingSystem(state: Partial<SystemState> = {}): BridgeParameters {
  return {
    overrides: {
      'system:get': async () =>
        Promise.resolve({ ok: true as const, value: { ...observed, ...state } }),
    },
  };
}

/**
 * Mounts a settings surface against the fake bridge, inside the providers it expects.
 *
 * @summary Reach for it instead of rebuilding the query client and suspense boundary per spec.
 */
export async function renderAgainstBridge(surface: ReactNode, parameters: BridgeParameters = {}) {
  return renderUnderTheBridge(<Suspense fallback={null}>{surface}</Suspense>, parameters);
}
