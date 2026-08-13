import type { ReactNode } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CatalogEntry } from '../../model/provider-catalog';

type DeviceCode = { userCode: string; verificationUri: string };

import { refusalSentence, unwrapIpcResult } from '../../../../shared/api';
import { SheetActionSlot } from '../../../../shared/ui';
import { PickedIdentity } from '../picked-identity/picked-identity';

type CopilotSignInProps = {
  /** The Copilot entry a person picked, which heads the step. */
  entry: CatalogEntry;
  /** Runs once the account is stored, so the catalog can close behind it. */
  onConnected: () => void;
};

function useDeviceCode() {
  return useQuery({
    queryKey: ['copilot-device-code'],
    queryFn: async () => unwrapIpcResult(await window.recompose['subscriptions:copilot-code']()),
    gcTime: 0,
    refetchOnMount: 'always',
    retry: false,
  });
}

function useAuthorization(onConnected: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () =>
      unwrapIpcResult(await window.recompose['subscriptions:copilot-await']()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      onConnected();
    },
  });
}

/**
 * The sign-in step for the one plan nothing on this machine can sign into.
 *
 * @summary Reach for it under the GitHub Copilot entry. Every other plan hands its sign-in to a
 * tool, so its step names the command to run. Nothing owns this one, so recompose runs the device
 * authorization itself: the step shows the code a person types and the address they type it at,
 * then waits on GitHub rather than on a window. The handle that completes the flow never crosses
 * from the main process, so this screen holds nothing that could finish a sign-in it did not open.
 */
type Waiting = ReturnType<typeof useAuthorization>;

function shownCode(code: DeviceCode, waiting: Waiting): ReactNode {
  return (
    <>
      <p className="font-mono text-heading text-ink" role="status">
        {code.userCode}
      </p>
      <p className="text-detail text-ink-secondary">{code.verificationUri}</p>
      <SheetActionSlot>
        <button
          className="push-button-primary focus-ring-wide"
          onClick={() => {
            waiting.mutate();
          }}
          type="button"
        >
          {waiting.isPending ? 'Waiting for GitHub' : 'I entered the code'}
        </button>
      </SheetActionSlot>
    </>
  );
}

export function CopilotSignIn({ entry, onConnected }: CopilotSignInProps) {
  const asked = useDeviceCode();
  const waiting = useAuthorization(onConnected);
  const code = asked.data ?? null;

  return (
    <div className="mx-auto flex w-80 flex-col items-center gap-2.5 py-4 text-center">
      <PickedIdentity lead={entry.lead} title={entry.name}>
        <p className="text-detail text-ink-secondary">
          Enter this code on GitHub to finish signing in
        </p>
      </PickedIdentity>
      {code === null ? (
        <p className="text-body text-ink" role="status">
          {asked.error === null ? 'Asking GitHub for a code' : refusalSentence(asked.error)}
        </p>
      ) : (
        shownCode(code, waiting)
      )}
      {waiting.error === null ? null : (
        <p className="text-caption text-danger-ink" role="alert">
          {refusalSentence(waiting.error)}
        </p>
      )}
    </div>
  );
}
