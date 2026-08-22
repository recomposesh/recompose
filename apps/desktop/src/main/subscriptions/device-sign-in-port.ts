import type { DeviceFlowVendor } from './device-flow';
import type { MachineIdentity } from './machine-identity';

export type DeviceSignInPort = {
  fetchLike: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  nowMs: () => number;
  /**
   * How this machine names itself, for a vendor that counts its callers per install.
   *
   * @summary Kimi refuses an ask that names no device, and holds a renewal against the same one.
   * Every vendor that asks for none is handed it anyway rather than the port forking per plan.
   */
  machine: MachineIdentity;
  /**
   * Opens the address a person authorizes at, in whatever browser the machine calls its own.
   *
   * @summary A device flow shows an address rather than navigating to one, so without this a
   * person has to retype it. The step still prints it, because a browser that will not open
   * leaves the address the only way through.
   */
  openInBrowser: (url: string) => Promise<void>;
};

/** What the far end issued, and the address it says signed in, where it names one. */
export type SignInYield = { credential: string; signedInAs: string | undefined };

/**
 * One plan's device authorization: where it runs, and what its answer is worth keeping as.
 *
 * @summary The exchange is RFC 8628's for every plan here. What differs is the vendor's addresses
 * and what a settled token is stored as, which is why those two are all a plan supplies. It stands
 * apart from the flow that runs it so a plan can name it without the flow naming the plan back.
 */
export type DeviceSignIn = {
  vendor: DeviceFlowVendor;
  yieldOf: (accessToken: string, refreshToken: string | undefined) => Promise<SignInYield>;
};
