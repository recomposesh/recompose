import type { BrowserSignInProviderId } from '@recompose/contracts';

import type { CatalogEntry } from '../../../../entities/provider';

import { unwrapIpcResult } from '../../../../shared/api';
import { AppSignInStep, useSignInLanding } from '../app-sign-in-step/app-sign-in-step';
import { SignInPress } from '../sign-in-press/sign-in-press';

type BrowserSignInProps = {
  /** The entry a person picked, which heads the step. */
  entry: CatalogEntry;
  /** The plan being signed into, which decides where the browser is sent. */
  provider: BrowserSignInProviderId;
  /** Runs once the account is stored, so the catalog can close behind it. */
  onConnected: () => void;
};

/**
 * The sign-in step for a plan that authorizes in the browser a person already trusts.
 *
 * @summary Reach for it where the provider redirects rather than issuing a code. There is nothing
 * to show in between, so the step is one press: the browser opens on the provider's page and this
 * waits for it to come back. The press is a person's, never a mount, because a window opening on
 * its own is one nobody asked for.
 */
export function BrowserSignIn({ entry, provider, onConnected }: BrowserSignInProps) {
  const waiting = useSignInLanding(
    async () =>
      unwrapIpcResult(await window.recompose['subscriptions:browser-sign-in']({ provider })),
    onConnected,
  );

  return (
    <AppSignInStep
      asks="Sign in on the page that opens, then come back here"
      entry={entry}
      refusal={waiting.error}
    >
      <SignInPress
        label="Open the sign-in page"
        onPress={() => {
          waiting.mutate();
        }}
        pending={waiting.isPending}
        waitingOn={entry.name}
      />
    </AppSignInStep>
  );
}
