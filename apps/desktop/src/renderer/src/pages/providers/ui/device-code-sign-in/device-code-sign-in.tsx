import type { DeviceFlowProviderId } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { useQuery } from '@tanstack/react-query';

import type { CatalogEntry } from '../../model/provider-catalog';

import { refusalSentence, unwrapIpcResult } from '../../../../shared/api';
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

function shownCode(code: DeviceCode, name: string, waiting: Waiting): ReactNode {
  return (
    <>
      <p className="font-mono text-heading text-ink" role="status">
        {code.userCode}
      </p>
      <p className="text-detail text-ink-secondary">{code.verificationUri}</p>
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
 * authorization itself: the step shows the code a person types and the address they type it at,
 * then waits on the provider rather than on a window. The handle that completes the flow never
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
