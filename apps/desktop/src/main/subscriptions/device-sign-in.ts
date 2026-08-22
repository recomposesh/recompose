import type { DeviceFlowProviderId } from '@recompose/contracts';

import { subscriptionPlanNames } from '@recompose/contracts';

import type { DeviceFlowRefused } from './device-flow';
import type { DeviceSignInPort, SignInYield } from './device-sign-in-port';

import { askForADeviceCode, awaitAuthorization } from './device-flow';
import { deviceSignInFor } from './device-sign-in-vendors';

type DeviceCodeShown = { verdict: 'shown'; userCode: string; verificationUri: string };

export type DeviceCodeAnswered = DeviceCodeShown | DeviceFlowRefused;

type DeviceSignedIn = { verdict: 'signed-in' } & SignInYield;

export type DeviceSignInSettled = DeviceSignedIn | DeviceFlowRefused;

type Pending = {
  deviceCode: string;
  intervalMs: number;
  expiresInMs: number;
  startedAtMs: number;
};

/**
 * The sign-ins a person has started but not yet finished, one per plan.
 *
 * @summary The device code never crosses to the renderer. The screen shows the code a person types
 * and the address they type it at, and the handle that completes the flow stays here, so nothing
 * outside this process can finish a sign-in it did not start. It is keyed by plan because a person
 * who opened two plans' steps is looking at two codes, and either one may settle first.
 */
const pending = new Map<DeviceFlowProviderId, Pending>();

export function forgetPendingDeviceSignIns(): void {
  pending.clear();
}

/**
 * Asks a provider for the code a person enters, and holds the handle that completes the flow.
 *
 * @summary A second ask under the same plan replaces the first, because a person who reopened the
 * step is looking at a new code and the old one would settle a sign-in they stopped watching.
 */
export async function startDeviceSignIn(
  port: DeviceSignInPort,
  provider: DeviceFlowProviderId,
): Promise<DeviceCodeAnswered> {
  const asked = await askForADeviceCode(port.fetchLike, deviceSignInFor(provider, port).vendor);

  if (asked.verdict === 'refused') {
    pending.delete(provider);

    return asked;
  }

  pending.set(provider, {
    deviceCode: asked.deviceCode,
    intervalMs: asked.intervalMs,
    expiresInMs: asked.expiresInMs,
    startedAtMs: port.nowMs(),
  });

  await openTheAddress(port, asked.verificationUri);

  return {
    verdict: 'shown',
    userCode: asked.userCode,
    verificationUri: asked.verificationUri,
  };
}

/**
 * @summary A browser that will not open is written down rather than refusing the sign-in: the code
 * is already issued and the screen still prints the address, so a person can finish by hand.
 */
async function openTheAddress(port: DeviceSignInPort, verificationUri: string): Promise<void> {
  try {
    await port.openInBrowser(verificationUri);
  } catch (error) {
    console.error('recompose could not open the sign-in address in a browser.', error);
  }
}

/**
 * Waits out the code a person was shown, and answers with what the provider issued.
 *
 * @summary The wait ends whichever way it ends, so the handle is dropped either way. Leaving it
 * would let a second wait settle against a code the person already used or abandoned.
 */
export async function awaitDeviceSignIn(
  port: DeviceSignInPort,
  provider: DeviceFlowProviderId,
): Promise<DeviceSignInSettled> {
  const started = pending.get(provider);

  if (started === undefined) {
    return {
      verdict: 'refused',
      reason: `No ${subscriptionPlanNames[provider]} sign-in is waiting to be finished.`,
    };
  }

  const signIn = deviceSignInFor(provider, port);
  const settled = await awaitAuthorization(port.fetchLike, signIn.vendor, started.deviceCode, {
    intervalMs: started.intervalMs,
    expiresInMs: started.expiresInMs,
    sleep: port.sleep,
    elapsedMs: () => port.nowMs() - started.startedAtMs,
  });

  pending.delete(provider);

  return settled.verdict === 'refused'
    ? settled
    : {
        verdict: 'signed-in',
        ...(await signIn.yieldOf(settled.credential, settled.refreshToken)),
      };
}
