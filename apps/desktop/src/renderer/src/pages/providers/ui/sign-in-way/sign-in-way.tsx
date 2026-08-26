import type { SubscriptionProviderId, SubscriptionTool } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { signsInBothWays, subscriptionPlanNames } from '@recompose/contracts';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useId } from 'react';

import type { CatalogLead } from '../../../../entities/provider';

import { subscriptionMarkFor } from '../../../../entities/provider';
import { subscriptionToolsQueryOptions } from '../../../../shared/api';
import { AppSignInRow } from '../app-sign-in-row/app-sign-in-row';
import { ConnectWay } from '../connect-way/connect-way';
import { PickedIdentity } from '../picked-identity/picked-identity';
import { SignInAction } from '../sign-in-action/sign-in-action';

type SignInWayProps = {
  name: string;
  provider: SubscriptionProviderId;
  onConnected: () => void;
};

/**
 * @summary A plan only its tool signs into can promise a person nothing else, so the terms say the
 * tool spends the plan and name it as the one way in.
 */
function toolOnlyTerms(name: string, toolName: string): ReactNode {
  return (
    <p className="text-detail text-ink-secondary">
      {toolName} signs in on its own and spends your {name} plan, under {name}&apos;s terms.
      {` ${toolName} serves one account at a time.`}
    </p>
  );
}

/**
 * @summary A plan recompose signs into as well cannot name one program, because the sign-in a
 * person is about to pick may be this app's, so the terms leave which program signs in to the rows
 * that offer it and say only what holds either way.
 */
function eitherWayTerms(name: string, toolName: string): ReactNode {
  return (
    <p className="text-detail text-ink-secondary">
      {`Either ${toolName} or recompose can sign in to your ${name} plan, spent under ${name}'s terms. One account spends at a time.`}
    </p>
  );
}

/**
 * @summary A tool the machine doesn't carry names no command to run, which is what every surface
 * downstream reads as absent. The hint travels beside it because the two are one reading of one
 * tool, and splitting them would let a surface show a hint for a tool that isn't there.
 */
function toolReading(tools: readonly SubscriptionTool[], provider: SubscriptionProviderId) {
  const reported = tools.find((tool) => tool.provider === provider);

  return {
    command: reported?.present === true ? reported.signInCommand : undefined,
    signInHint: reported?.signInHint,
  };
}

function waysBox(row: ReactNode): ReactNode {
  return row === undefined ? null : (
    <div className="w-full divide-y divide-line-faint field-box text-start">{row}</div>
  );
}

type AbsentToolArm = {
  lead: CatalogLead;
  name: string;
  toolName: string;
  terms: ReactNode;
  alsoSignsInHere: ReactNode;
  /** Names what the inert act is held back by, for a screen reader reaching it. */
  reasonId: string;
};

/**
 * The step for a plan whose tool this machine doesn't carry.
 *
 * @summary It used to hold a heading and one act nothing could press, which read as a broken
 * screen rather than as a missing install. A plan recompose signs into as well now offers that way
 * here, so the step always carries something a person can act on. The tool's own act stays on
 * screen, inert and naming what it waits for, because a person who wants the tool has to learn it
 * is missing rather than find the option gone.
 */
function absentToolArm({
  lead,
  name,
  toolName,
  terms,
  alsoSignsInHere,
  reasonId,
}: AbsentToolArm): ReactNode {
  return (
    <>
      <PickedIdentity lead={lead} title={`An account for ${toolName}`}>
        {terms}
      </PickedIdentity>
      {waysBox(alsoSignsInHere)}
      <p className="text-detail text-attention-ink" id={reasonId}>
        {toolName} isn&apos;t installed. Install it, then sign in from here.
      </p>
      <SignInAction disabled name={name} reasonId={reasonId} />
    </>
  );
}

/**
 * The subscription connect step, leading with the account this machine already holds.
 *
 * @summary Which ways a plan offers follows the vocabulary rather than the plan's name, so a plan
 * standing in both the tool table and the browser table gets both offered and each one labelled.
 * Every other branch reads from what the machine answers, which is why the head belongs to the
 * reading rather than here.
 */
export function SignInWay({ name, provider, onConnected }: SignInWayProps) {
  const reasonId = useId();
  const { data: tools } = useSuspenseQuery(subscriptionToolsQueryOptions);
  const toolName = subscriptionPlanNames[provider];
  const lead = { mark: subscriptionMarkFor(provider) };
  const { command, signInHint } = toolReading(tools, provider);

  const offered = signsInBothWays(provider)
    ? {
        terms: eitherWayTerms(name, toolName),
        alsoSignsInHere: (
          <AppSignInRow onConnected={onConnected} planName={name} provider={provider} />
        ),
      }
    : { terms: toolOnlyTerms(name, toolName), alsoSignsInHere: undefined };

  return (
    <div className="mx-auto flex w-80 flex-col items-center gap-2.5 py-4 text-center">
      {command === undefined ? (
        absentToolArm({
          alsoSignsInHere: offered.alsoSignsInHere,
          lead,
          name,
          reasonId,
          terms: offered.terms,
          toolName,
        })
      ) : (
        <ConnectWay
          alsoSignsInHere={offered.alsoSignsInHere}
          command={command}
          lead={lead}
          name={name}
          onConnected={onConnected}
          provider={provider}
          signInHint={signInHint}
          terms={offered.terms}
          toolName={toolName}
        />
      )}
    </div>
  );
}
