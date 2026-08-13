import type { MachineCredentialReading, SubscriptionProviderId } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { useSuspenseQuery } from '@tanstack/react-query';

import { machineReadingQueryOptions, useAdoptSubscription } from '../../../../shared/api';
import { FoundAccountRow } from '../found-account-row/found-account-row';
import { SignInAction } from '../sign-in-action/sign-in-action';

type ConnectWayProps = {
  name: string;
  provider: SubscriptionProviderId;
  toolName: string;
  command: string;
  onConnected: () => void;
};

function whatTheMachineSays(reading: MachineCredentialReading, toolName: string): string {
  if (reading.holds === 'store-refused') {
    return 'macOS did not allow access to the login keychain.';
  }

  return reading.holds === 'no-account-credential'
    ? `${toolName} is set up here but signed out.`
    : `${toolName} has not signed in on this machine.`;
}

/**
 * The two ways in, with the one the machine already answers standing first.
 *
 * @summary A found account leads as the answer, carrying its own act in its own row, and the
 * sign-in drops beneath it as the quieter choice. In a column this narrow a second choice reads as
 * a link rather than a section of its own. The three empty readings stay apart, because a store
 * that refused to open is not an empty machine and neither is a record holding no account.
 */
/**
 * @summary A store that refused to open is the one empty reading a person can act on, and
 * dismissing a system prompt takes one keystroke, so that arm carries a way to ask again.
 */
function nothingToAdopt(
  reading: MachineCredentialReading,
  toolName: string,
  onAskAgain: () => void,
): ReactNode {
  return (
    <>
      <p className="text-detail text-ink-secondary">{whatTheMachineSays(reading, toolName)}</p>
      {reading.holds === 'store-refused' ? (
        <button
          className="focus-ring text-detail text-ink-secondary underline underline-offset-2"
          onClick={onAskAgain}
          type="button"
        >
          Check again
        </button>
      ) : null}
    </>
  );
}

export function ConnectWay({ name, provider, toolName, command, onConnected }: ConnectWayProps) {
  const look = useSuspenseQuery(machineReadingQueryOptions(provider));
  const reading = look.data;
  const adopt = useAdoptSubscription();
  const found = reading.holds === 'account';

  return (
    <>
      {found ? (
        <FoundAccountRow
          connecting={adopt.isPending}
          inert={adopt.isPending}
          onConnect={() => {
            adopt.mutate({ provider }, { onSuccess: onConnected });
          }}
          plan={reading.plan}
          signedInAs={reading.signedInAs}
          standing={reading.standing}
          toolName={toolName}
        />
      ) : (
        nothingToAdopt(reading, toolName, () => {
          void look.refetch();
        })
      )}
      {adopt.refusal === undefined ? null : (
        <p className="text-detail text-danger-ink" role="alert">
          {adopt.refusal}
        </p>
      )}
      <SignInAction
        command={command}
        name={name}
        onConnected={onConnected}
        provider={provider}
        quieter={found}
        toolName={toolName}
      />
    </>
  );
}
