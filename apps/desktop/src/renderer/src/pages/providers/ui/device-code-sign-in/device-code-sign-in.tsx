import type { DeviceFlowProviderId } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { useQuery } from '@tanstack/react-query';

import type { CatalogEntry } from '../../model/provider-catalog';

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

function useDeviceCode(provider: DeviceFlowProviderId) {
  return useQuery({
    queryKey: ['device-code', provider],
    queryFn: async () =>
      unwrapIpcResult(await window.recompose['subscriptions:device-code']({ provider })),
    gcTime: 0,
    refetchOnMount: 'always',
    retry: false,
  });
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
  const asked = useDeviceCode(provider);
  const waiting = useSignInLanding(
    async () => unwrapIpcResult(await window.recompose['subscriptions:device-await']({ provider })),
    onConnected,
  );
  const code = asked.data ?? null;

  return (
    <AppSignInStep
      asks="Enter this code to finish signing in"
      entry={entry}
      refusal={waiting.error}
    >
      {code === null ? (
        <p className="text-body text-ink" role="status">
          {asked.error === null ? 'Asking for a code' : refusalSentence(asked.error)}
        </p>
      ) : (
        shownCode(code, entry.name, waiting)
      )}
    </AppSignInStep>
  );
}
