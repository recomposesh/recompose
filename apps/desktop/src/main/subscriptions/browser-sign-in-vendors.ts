import type { BrowserSignInProviderId } from '@recompose/contracts';

import type { BrowserSignInPort, BrowserSignInSettled } from './browser-sign-in-port';

import { antigravityVendor, signInToAntigravity } from './antigravity-sign-in';
import { codexVendor, signInToCodex } from './codex-sign-in';

const browserSignIns: Record<
  BrowserSignInProviderId,
  (port: BrowserSignInPort) => Promise<BrowserSignInSettled>
> = {
  antigravity: signInToAntigravity,
  openai: signInToCodex,
};

/**
 * The loopback port each vendor registered its own redirect under.
 *
 * @summary A redirect is matched exactly, so the port is the vendor's choice rather than this
 * app's, and two vendors on one channel mean two ports. Naming them together is what keeps a
 * sign-in from listening on one port while telling the vendor to come back to another.
 */
export const browserCallbackPorts: Record<BrowserSignInProviderId, number> = {
  antigravity: antigravityVendor.callbackPort,
  openai: codexVendor.callbackPort,
};

/**
 * @summary This stands apart from the handler that reads it so a vendor can name the channel's own
 * types without the channel importing the vendor back.
 */
export async function signInThroughTheBrowser(
  provider: BrowserSignInProviderId,
  port: BrowserSignInPort,
): Promise<BrowserSignInSettled> {
  return browserSignIns[provider](port);
}
