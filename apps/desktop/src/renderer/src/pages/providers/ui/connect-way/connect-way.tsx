import type { MachineCredentialReading, SubscriptionProviderId } from '@recompose/contracts';
import type { ReactElement, ReactNode } from 'react';

import { useSuspenseQuery } from '@tanstack/react-query';

import type { CatalogLead } from '../../model/catalog-lead';

import {
  machineReadingQueryOptions,
  useAdoptSubscription,
  useSignInSubscription,
} from '../../../../shared/api';
import { Icon } from '../../../../shared/ui';
import { useLaunchRefusal } from '../../model/launch-refusal';
import { FoundAccountRow } from '../found-account-row/found-account-row';
import { PickRow } from '../pick-row/pick-row';
import { PickedIdentity } from '../picked-identity/picked-identity';
import { SignInAction } from '../sign-in-action/sign-in-action';
import { WaitingOnTheTool } from '../waiting-on-the-tool/waiting-on-the-tool';

type ConnectWayProps = {
  /** The mark the picked plan is headed by, carried over from the card a person picked. */
  lead: CatalogLead;
  name: string;
  provider: SubscriptionProviderId;
  toolName: string;
  command: string;
  /** What spending this plan through the tool means, which only an empty machine has to read. */
  terms: ReactNode;
  onConnected: () => void;
};

type FoundReading = Extract<MachineCredentialReading, { holds: 'account' }>;

type Arm = {
  lead: CatalogLead;
  toolName: string;
  command: string;
  waiting: boolean;
  refusal: string | undefined;
  launchNote: string | undefined;
};

type EmptyArm = Arm & {
  name: string;
  reading: MachineCredentialReading;
  terms: ReactNode;
  onAskAgain: () => void;
  onSignIn: () => void;
};

type FoundArm = Arm & {
  reading: FoundReading;
  adopting: boolean;
  onAdopt: () => void;
  onSignIn: () => void;
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

function refusalLine(refusal: string | undefined): ReactNode {
  return refusal === undefined ? null : (
    <p className="text-detail text-danger-ink" role="alert">
      {refusal}
    </p>
  );
}

/**
 * @summary Both ways reach the same end, so they read as two rows of one list rather than a card
 * with a button inside it beside a link. The list is the whole of the choice, which is why the
 * sheet's foot keeps only Cancel.
 */
function twoWaysIn({ reading, toolName, adopting, onAdopt, onSignIn }: FoundArm): ReactElement {
  return (
    <div className="w-full divide-y divide-line-faint field-box text-start">
      <FoundAccountRow
        connecting={adopting}
        inert={adopting}
        onConnect={onAdopt}
        plan={reading.plan}
        signedInAs={reading.signedInAs}
        standing={reading.standing}
        toolName={toolName}
      />
      <PickRow
        disabled={adopting}
        label="Sign in with a different account"
        lead={<Icon className="size-4 text-ink-secondary" name="person" />}
        onPick={onSignIn}
        title="Sign in with a different account"
        under={`Opens ${toolName} and waits for it`}
      />
    </div>
  );
}

function emptyMachineArm(arm: EmptyArm): ReactElement {
  const {
    command,
    launchNote,
    lead,
    name,
    onAskAgain,
    onSignIn,
    reading,
    refusal,
    terms,
    toolName,
    waiting,
  } = arm;

  return (
    <>
      <PickedIdentity lead={lead} title={`An account for ${toolName}`}>
        {terms}
      </PickedIdentity>
      {waiting ? (
        <WaitingOnTheTool command={command} note={launchNote} toolName={toolName} />
      ) : (
        <>
          {nothingToAdopt(reading, toolName, onAskAgain)}
          {refusalLine(refusal)}
          <SignInAction name={name} onSignIn={onSignIn} />
        </>
      )}
    </>
  );
}

function foundAccountArm(arm: FoundArm): ReactElement {
  return (
    <>
      <PickedIdentity lead={arm.lead} title={arm.toolName}>
        <p className="text-detail text-ink-secondary">Pick the account this gateway spends.</p>
      </PickedIdentity>
      {arm.waiting ? (
        <WaitingOnTheTool command={arm.command} note={arm.launchNote} toolName={arm.toolName} />
      ) : (
        twoWaysIn(arm)
      )}
      {refusalLine(arm.refusal)}
    </>
  );
}

/**
 * The ways into a plan, with the account the machine already answers standing among them.
 *
 * @summary A found account turns the step into a choice between two ways, so the head asks which
 * one and the list holds both at the same weight. An empty machine leaves one way in, so the head
 * says what the plan means instead and the sign-in rides the sheet's foot. The three empty readings
 * stay apart, because a store that refused to open is not an empty machine and neither is a record
 * holding no account.
 */
export function ConnectWay({
  lead,
  name,
  provider,
  toolName,
  command,
  terms,
  onConnected,
}: ConnectWayProps) {
  const look = useSuspenseQuery(machineReadingQueryOptions(provider));
  const reading = look.data;
  const adopt = useAdoptSubscription();
  const signIn = useSignInSubscription();

  const launch = useLaunchRefusal(provider);

  const onSignIn = () => {
    launch.forget();
    signIn.mutate({ provider }, { onSuccess: onConnected });
  };

  const standing = {
    command,
    launchNote: signIn.isPending ? launch.note : undefined,
    lead,
    onSignIn,
    toolName,
    waiting: signIn.isPending,
  };

  if (reading.holds !== 'account') {
    return emptyMachineArm({
      ...standing,
      name,
      onAskAgain: () => {
        void look.refetch();
      },
      reading,
      refusal: signIn.refusal,
      terms,
    });
  }

  return foundAccountArm({
    ...standing,
    adopting: adopt.isPending,
    onAdopt: () => {
      adopt.mutate({ provider }, { onSuccess: onConnected });
    },
    reading,
    refusal: adopt.refusal ?? signIn.refusal,
  });
}
