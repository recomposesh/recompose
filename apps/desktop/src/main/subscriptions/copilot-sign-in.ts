import type { DeviceFlowRefused } from './copilot-device-flow';

import { signedInAs } from './copilot-credential';
import { askForADeviceCode, awaitAuthorization } from './copilot-device-flow';

export type CopilotSignInPort = {
  fetchLike: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  nowMs: () => number;
};

type CopilotCodeShown = {
  verdict: 'shown';
  userCode: string;
  verificationUri: string;
};

export type CopilotCodeAsked = CopilotCodeShown | DeviceFlowRefused;

type CopilotSignedIn = {
  verdict: 'signed-in';
  credential: string;
  signedInAs: string | undefined;
};

export type CopilotSignInSettled = CopilotSignedIn | DeviceFlowRefused;

type Pending = {
  deviceCode: string;
  intervalMs: number;
  expiresInMs: number;
  startedAtMs: number;
};

/**
 * The sign-in a person has started but not yet finished.
 *
 * @summary The device code never crosses to the renderer. The screen shows the code a person
 * types and the address they type it at, and the handle that completes the flow stays here, so
 * nothing outside this process can finish a sign-in it did not start.
 */
let pending: Pending | null = null;

export function forgetPendingCopilotSignIn(): void {
  pending = null;
}

/**
 * Asks GitHub for the code a person enters, and holds the handle that completes the flow.
 *
 * @summary A second ask replaces the first, because a person who reopened the step is looking at
 * a new code and the old one would settle a sign-in they are no longer watching.
 */
export async function startCopilotSignIn(port: CopilotSignInPort): Promise<CopilotCodeAsked> {
  const asked = await askForADeviceCode(port.fetchLike);

  if (asked.verdict === 'refused') {
    pending = null;

    return asked;
  }

  pending = {
    deviceCode: asked.deviceCode,
    intervalMs: asked.intervalMs,
    expiresInMs: asked.expiresInMs,
    startedAtMs: port.nowMs(),
  };

  return {
    verdict: 'shown',
    userCode: asked.userCode,
    verificationUri: asked.verificationUri,
  };
}

/**
 * Waits on the code a person was shown, and answers what GitHub issued.
 *
 * @summary The wait ends whichever way it ends, so the handle is dropped either way. Leaving it
 * would let a second wait settle against a code the person already used or abandoned.
 */
export async function awaitCopilotSignIn(port: CopilotSignInPort): Promise<CopilotSignInSettled> {
  const started = pending;

  if (started === null) {
    return { verdict: 'refused', reason: 'No Copilot sign-in is waiting to be finished.' };
  }

  const settled = await awaitAuthorization(port.fetchLike, started.deviceCode, {
    intervalMs: started.intervalMs,
    expiresInMs: started.expiresInMs,
    sleep: port.sleep,
    elapsedMs: () => port.nowMs() - started.startedAtMs,
  });

  pending = null;

  if (settled.verdict === 'refused') {
    return settled;
  }

  return {
    verdict: 'signed-in',
    credential: settled.credential,
    signedInAs: await signedInAs(port.fetchLike, settled.credential),
  };
}
