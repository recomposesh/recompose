import type { SubscriptionProviderId } from '@recompose/contracts';

import { subscriptionPlanNames } from '@recompose/contracts';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useId } from 'react';

import { subscriptionToolsQueryOptions } from '../../../../shared/api';
import { subscriptionMarkFor } from '../../model/provider-catalog';
import { ConnectWay } from '../connect-way/connect-way';
import { PickedIdentity } from '../picked-identity/picked-identity';
import { SignInAction } from '../sign-in-action/sign-in-action';

type SignInWayProps = {
  name: string;
  provider: SubscriptionProviderId;
  onConnected: () => void;
};

/**
 * The subscription connect step, leading with the account this machine already holds.
 *
 * @summary An absent tool means the machine holds nothing by definition, so that branch says the
 * one thing a person can act on and offers nothing to adopt beside it. Every other branch reads
 * from what the machine answers, which is why the head belongs to the reading rather than here.
 */
export function SignInWay({ name, provider, onConnected }: SignInWayProps) {
  const reasonId = useId();
  const { data: tools } = useSuspenseQuery(subscriptionToolsQueryOptions);
  const toolName = subscriptionPlanNames[provider];
  const reported = tools.find((tool) => tool.provider === provider);
  const command = reported?.present === true ? reported.signInCommand : undefined;
  const lead = { mark: subscriptionMarkFor(provider) };

  const terms = (
    <p className="text-detail text-ink-secondary">
      {toolName} signs in on its own and spends your {name} plan, under {name}&apos;s terms.
      {` ${toolName} serves one account at a time.`}
    </p>
  );

  return (
    <div className="mx-auto flex w-80 flex-col items-center gap-2.5 py-4 text-center">
      {command === undefined ? (
        <>
          <PickedIdentity lead={lead} title={`An account for ${toolName}`}>
            {terms}
          </PickedIdentity>
          <p className="text-detail text-attention-ink" id={reasonId}>
            {toolName} isn&apos;t installed. Install it, then sign in from here.
          </p>
          <SignInAction disabled name={name} reasonId={reasonId} />
        </>
      ) : (
        <ConnectWay
          command={command}
          lead={lead}
          name={name}
          onConnected={onConnected}
          provider={provider}
          terms={terms}
          toolName={toolName}
        />
      )}
    </div>
  );
}
