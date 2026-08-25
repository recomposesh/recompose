import type { DeviceFlowProviderId } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { useEffect, useRef, useState } from 'react';

import type { CatalogEntry } from '../../../../entities/provider';

import { refusalSentence, unwrapIpcResult } from '../../../../shared/api';
import { CopyButton } from '../../../../shared/ui';
import { AppSignInStep, useSignInLanding } from '../app-sign-in-step/app-sign-in-step';
import { SignInPress } from '../sign-in-press/sign-in-press';

type DeviceCode = { userCode: string; verificationUri: string };

type DeviceCodeSignInProps = {
  /** The entry a person picked, which heads the step. */
  entry: CatalogEntry;
  /** The plan being signed into, which is the only thing that differs between these steps. */
  provider: DeviceFlowProviderId;
  /** Runs once the account is stored, so the catalog can close behind it. */
  onConnected: () => void;
};

type Asked = { code: DeviceCode | null; refusal: unknown };

const nothingAskedYet: Asked = { code: null, refusal: null };

async function codeIssuedFor(provider: DeviceFlowProviderId): Promise<Asked> {
  try {
    return {
      code: unwrapIpcResult(await window.recompose['subscriptions:device-code']({ provider })),
      refusal: null,
    };
  } catch (refusal) {
    return { code: null, refusal };
  }
}

/**
 * Asks the plan for the code a person enters, once, however often this step renders.
 *
 * @summary The ask is an act, never a reading: it spends a code the provider issues once and opens
 * a browser on the address. A query is re-run whenever the client sees fit, and the window ceasing
 * to be covered is one such moment, so carrying this in one hands a person another window every
 * time they come back from the last. The answer is held here rather than in a mutation because a
 * mutation observer drops off the call it started when its subscription is torn down, and
 * StrictMode tears every subscription down between a mount's two passes, so the code the provider
 * issued reached nothing and the step read `Asking for a code` forever. The guard tells the ask
 * once per plan, for the same two passes.
 */
function useVerificationCode(provider: DeviceFlowProviderId): Asked {
  const [asked, setAsked] = useState<Asked>(nothingAskedYet);
  const askedUnder = useRef<DeviceFlowProviderId | null>(null);

  useEffect(() => {
    if (askedUnder.current === provider) {
      return;
    }

    askedUnder.current = provider;
    void codeIssuedFor(provider).then(setAsked);
  }, [provider]);

  return asked;
}

type Waiting = ReturnType<typeof useSignInLanding>;

/**
 * @summary The address is a link rather than a line to retype, and the code sits beside a copy so
 * neither has to be selected by hand. The main process already opened the address when the code
 * was issued, so both stand here for the person whose browser did not come forward.
 */
function shownCode(code: DeviceCode, name: string, waiting: Waiting): ReactNode {
  return (
    <>
      <div className="flex items-center gap-1.5">
        <p className="font-mono text-heading text-ink" role="status">
          {code.userCode}
        </p>
        <CopyButton announcement="Code copied." label="Copy the code" value={code.userCode} />
      </div>
      <div className="flex max-w-full min-w-0 items-center gap-1.5">
        <a
          className="min-w-0 truncate rounded-chip focus-ring text-detail text-ink-secondary underline hover:text-ink"
          href={code.verificationUri}
          rel="noreferrer"
          target="_blank"
        >
          {code.verificationUri}
        </a>
        <CopyButton label="Copy the address" value={code.verificationUri} />
      </div>
      <SignInPress
        label="I entered the code"
        onPress={() => {
          waiting.mutate();
        }}
        pending={waiting.isPending}
        waitingOn={name}
      />
    </>
  );
}

/**
 * The sign-in step for a plan nothing on this machine can sign into.
 *
 * @summary Reach for it under any plan that authorizes by device code. Every plan whose own tool
 * owns the flow names a command to run instead. Nothing owns these, so recompose runs the
 * authorization itself: the address opens as the code is issued, the step shows the code a person
 * types beside the address it is typed at, then waits on the provider rather than on a window. The handle that completes the flow never
 * crosses from the main process, so this screen holds nothing that could finish a sign-in it did
 * not open.
 */
export function DeviceCodeSignIn({ entry, provider, onConnected }: DeviceCodeSignInProps) {
  const asked = useVerificationCode(provider);
  const waiting = useSignInLanding(
    async () => unwrapIpcResult(await window.recompose['subscriptions:device-await']({ provider })),
    onConnected,
  );

  return (
    <AppSignInStep
      asks="Enter this code to finish signing in"
      entry={entry}
      refusal={waiting.error}
    >
      {asked.code === null ? (
        <p className="text-body text-ink" role="status">
          {asked.refusal === null ? 'Asking for a code' : refusalSentence(asked.refusal)}
        </p>
      ) : (
        shownCode(asked.code, entry.name, waiting)
      )}
    </AppSignInStep>
  );
}
