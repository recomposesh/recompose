import type { BrowserSignInProviderId } from '@recompose/contracts';

export type BrowserSignInPort = {
  fetchLike: typeof fetch;
  /** How the onboarding a first sign-in may run waits between asks. */
  sleep: (ms: number) => Promise<void>;
  /**
   * The loopback port a vendor's browser is redirected back to.
   *
   * @summary Every vendor here matches its own client's redirect exactly, so the port is the
   * vendor's rather than this app's choice, and two vendors mean two ports. It is asked for per
   * vendor rather than read off the vendor table so a reading can hold a port of its own instead
   * of racing whatever else on the machine wants that one.
   */
  callbackPortFor: (provider: BrowserSignInProviderId) => number;
  /** Hands the authorization address to whatever the person browses with. */
  openInBrowser: (url: string) => Promise<void>;
  /** How long the callback is waited for before the sign-in gives the port back. */
  boundMs: number;
  /** The unguessable word the callback has to carry back, which binds it to this ask. */
  mintState: () => string;
};

export type BrowserSignInSettled =
  | { verdict: 'signed-in'; credential: string; signedInAs?: string }
  | { verdict: 'refused'; reason: string };
