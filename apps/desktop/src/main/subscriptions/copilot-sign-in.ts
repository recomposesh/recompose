import type { DeviceFlowVendor } from './device-flow';
import type { DeviceSignIn, DeviceSignInPort } from './device-sign-in-port';

import { signedInAs } from './copilot-credential';

/**
 * Where GitHub's device authorization runs, and the client it runs under.
 *
 * @summary The client identity is Visual Studio Code's own, which is what every shipped Copilot
 * bridge uses because GitHub registers no other for a terminal. CC Switch names the same one in
 * `src-tauri/src/proxy/providers/copilot_auth.rs`.
 */
export const copilotVendor: DeviceFlowVendor = {
  name: 'GitHub',
  deviceCode: 'https://github.com/login/device/code',
  token: 'https://github.com/login/oauth/access_token',
  clientId: 'Iv1.b507a08c87ecfe98',
  scope: 'read:user',
};

/**
 * @summary The vault holds the long-lived credential GitHub issued, because that is what buys the
 * short-lived one a turn carries. The row reads as whoever signed in, so a person with two GitHub
 * accounts can tell their rows apart.
 */
export function copilotSignIn(port: DeviceSignInPort): DeviceSignIn {
  return {
    vendor: copilotVendor,
    yieldOf: async (credential) => ({
      credential,
      signedInAs: await signedInAs(port.fetchLike, credential),
    }),
  };
}
