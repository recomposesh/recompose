import type { DeviceFlowProviderId } from '@recompose/contracts';

import type { DeviceSignIn, DeviceSignInPort } from './device-sign-in-port';

import { copilotSignIn } from './copilot-sign-in';
import { kimiSignIn } from './kimi-sign-in';

const deviceSignIns: Record<DeviceFlowProviderId, (port: DeviceSignInPort) => DeviceSignIn> = {
  copilot: copilotSignIn,
  kimi: kimiSignIn,
};

/**
 * @summary This stands apart from the flow that reads it so a plan can name the flow's own types
 * without the flow importing the plan back.
 */
export function deviceSignInFor(
  provider: DeviceFlowProviderId,
  port: DeviceSignInPort,
): DeviceSignIn {
  return deviceSignIns[provider](port);
}
