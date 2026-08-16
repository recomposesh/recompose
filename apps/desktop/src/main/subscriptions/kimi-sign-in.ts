import type { DeviceFlowVendor } from './device-flow';
import type { DeviceSignIn, DeviceSignInPort } from './device-sign-in-port';

/**
 * Where Kimi Code's device authorization runs, and the client it runs under.
 *
 * @summary The addresses and the client identity are Kimi Code's own, read from CLIProxyAPI's
 * `internal/auth/kimi/kimi.go`, which is the port this app already carries the rest of. Kimi takes
 * no scope on the device request and answers a pending sign-in with a plain 200, both of which the
 * shared wait already allows for.
 */
const kimiVendor: DeviceFlowVendor = {
  name: 'Kimi',
  deviceCode: 'https://auth.kimi.com/api/oauth/device_authorization',
  token: 'https://auth.kimi.com/api/oauth/token',
  clientId: '17e5f671-d194-4dfb-9706-5516cb48c098',
};

/**
 * @summary Kimi's own tool names the caller, the machine and the install on every ask, and refuses
 * a request that names none of them. The platform reads as this app rather than as the tool this
 * was ported from, because a vendor counting its callers should count them honestly.
 */
function kimiAskedBy(port: DeviceSignInPort): DeviceFlowVendor {
  return {
    ...kimiVendor,
    headers: {
      'X-Msh-Platform': 'recompose',
      'X-Msh-Version': port.machine.version,
      'X-Msh-Device-Name': port.machine.name,
      'X-Msh-Device-Model': port.machine.model,
      'X-Msh-Device-Id': port.machine.id,
    },
  };
}

/**
 * @summary The stored record keeps the shape CLIProxyAPI writes, so a credential this app minted
 * and one adopted from that tool read the same way everywhere downstream. Kimi publishes nothing
 * that names the person behind a token, so the row stands under its plan rather than an address.
 */
export function kimiSignIn(port: DeviceSignInPort): DeviceSignIn {
  return {
    vendor: kimiAskedBy(port),
    yieldOf: async (accessToken, refreshToken) =>
      Promise.resolve({
        credential: JSON.stringify({
          type: 'kimi',
          access_token: accessToken,
          ...(refreshToken === undefined ? {} : { refresh_token: refreshToken }),
          device_id: port.machine.id,
        }),
        signedInAs: undefined,
      }),
  };
}
