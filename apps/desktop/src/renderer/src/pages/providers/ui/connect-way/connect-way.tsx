import type { MachineCredentialReading, SubscriptionProviderId } from '@recompose/contracts';

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
export function ConnectWay({ name, provider, toolName, command, onConnected }: ConnectWayProps) {
  const { data: reading } = useSuspenseQuery(machineReadingQueryOptions(provider));
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
          toolName={toolName}
        />
      ) : (
        <p className="text-detail text-ink-secondary">{whatTheMachineSays(reading, toolName)}</p>
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
