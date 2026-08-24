import type { SubscriptionAccountView } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { toolBacked } from '@recompose/contracts';

import {
  useActivateSubscription,
  useForgetSubscription,
  useRestoreSubscription,
} from '../../../../shared/api';
import { Badge, BrandMark, CommandLine, OverflowMenu, StatusChip } from '../../../../shared/ui';
import { subscriptionMarkFor, subscriptionTitleFor } from '../../model/provider-catalog';
import { AccountRow } from '../account-row/account-row';

type SubscriptionAccountRowProps = {
  /** The account as the machine last observed it, standing for one row. */
  view: SubscriptionAccountView;
  /**
   * The line that points a person's own shell at whichever account this plan stands on.
   *
   * @summary Absent for a plan no tool signs into, because there is no config home to point and so
   * nothing an account being the plan's chosen one would change.
   */
  shellSetupLine?: string | undefined;
};

const standing = {
  connected: { word: 'Connected', tone: 'positive' },
  lapsed: { word: 'Signed out', tone: 'attention' },
} as const;

type RowActions = {
  view: SubscriptionAccountView;
  onSignInAgain: () => void;
  onRemove: () => void;
  onUseThis: () => void;
};

/**
 * Whether this account can be made the one its plan's own tool reaches.
 *
 * @summary A gateway spends whichever account its canvas names, so this act never moves traffic.
 * What it moves is the config home the plan's tool runs against, which is why a plan with no such
 * tool never offers it: there would be nothing to point, and a chosen account would read as a
 * promise the app cannot keep. The one already chosen has nothing to take over, and a lapsed one
 * has nothing behind it to answer with.
 */
function couldTakeOver(view: SubscriptionAccountView): boolean {
  return !view.active && view.standing === 'connected' && toolBacked(view.provider);
}

function quieterActions({ view, onSignInAgain, onRemove, onUseThis }: RowActions) {
  const signInAgain =
    view.standing === 'lapsed' || view.provenance === 'machine'
      ? []
      : [
          {
            label: 'Sign in again',
            icon: 'renew' as const,
            tone: 'accent' as const,
            onSelect: onSignInAgain,
          },
        ];

  const useThis = couldTakeOver(view)
    ? [
        {
          label: 'Use this account',
          icon: 'check' as const,
          tone: 'accent' as const,
          onSelect: onUseThis,
        },
      ]
    : [];

  return [
    ...useThis,
    ...signInAgain,
    { label: 'Remove', icon: 'trash' as const, tone: 'danger' as const, onSelect: onRemove },
  ];
}

/**
 * @summary A lapsed row carries its own way back, and which way depends on where the account came
 * from. The app can sign in again for one it signed in. For one it adopted, only the tool that
 * wrote the credential can renew it, so the row names that tool rather than offering an act that
 * would reach a different account.
 */
function wayBack(view: SubscriptionAccountView, onSignInAgain: () => void): ReactNode {
  if (view.standing !== 'lapsed') {
    return null;
  }

  return view.provenance === 'machine' ? (
    <span className="text-detail text-ink-secondary">
      Open {subscriptionTitleFor(view.provider)} to sign in again
    </span>
  ) : (
    <button className="push-button focus-ring" onClick={onSignInAgain} type="button">
      Sign in again
    </button>
  );
}

function firstRefusal(refusals: readonly (string | undefined)[]) {
  return refusals.find((refusal) => refusal !== undefined);
}

/** What the account is called, with whatever the row has to say about it beside the name. */
function accountTitle(view: SubscriptionAccountView): ReactNode {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-card-title text-ink">{subscriptionTitleFor(view.provider)}</span>
      {view.plan === undefined ? null : <Badge>{view.plan}</Badge>}
    </span>
  );
}

/**
 * What being the plan's chosen account amounts to, said where the choosing happens.
 *
 * @summary Architecture Decision Record 0069 asks the interface to say this out loud, because an
 * act whose whole effect is a symlink nobody sees reads as an act that did nothing. It stands only
 * on the chosen row, so which account a person's terminal reaches is read at a glance rather than
 * hunted for behind a badge.
 */
function terminalReach(
  view: SubscriptionAccountView,
  shellSetupLine: string | undefined,
): ReactNode {
  if (!view.active || shellSetupLine === undefined) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-detail text-ink-secondary">Your terminal reaches this account.</span>
      <CommandLine
        command={shellSetupLine}
        label={`Copy the ${subscriptionTitleFor(view.provider)} setup line`}
      />
    </div>
  );
}

function accountIdentity(view: SubscriptionAccountView, refusal: string | undefined): ReactNode {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      {accountTitle(view)}
      <span className="text-detail text-ink-secondary">
        {view.signedInAs ?? view.label}
        {view.provenance === 'machine' ? ' · from this machine' : ''}
      </span>
      {refusal === undefined ? null : (
        <span className="text-detail text-danger-ink" role="alert">
          {refusal}
        </span>
      )}
    </div>
  );
}

/**
 * One subscription account, read leading to trailing as who it is and how it stands.
 *
 * @summary The row is the whole surface for an account, because a subscription is never a gateway
 * target and has nowhere else to be edited. It holds two lines, the plan product and the address
 * it signed in as, because the connect step already taught what the account serves. A lapse puts
 * its remedy on the row rather than behind the overflow, so the standing and the way out of it
 * are read in one glance. The overflow and a right-click on the row read one act list, which is
 * signing in again, choosing this account for the plan, and removal, each standing only where the
 * account's own standing calls for it. The plan's
 * chosen account carries one line more, which is the only place the choosing shows.
 */
export function SubscriptionAccountRow({ view, shellSetupLine }: SubscriptionAccountRowProps) {
  const restore = useRestoreSubscription();
  const forget = useForgetSubscription();
  const useThis = useActivateSubscription();

  const refusal = firstRefusal([restore.refusal, forget.refusal, useThis.refusal]);

  const signInAgain = () => {
    restore.mutate({ id: view.id });
  };

  const acts = quieterActions({
    view,
    onSignInAgain: signInAgain,
    onRemove: () => {
      forget.mutate({ id: view.id });
    },
    onUseThis: () => {
      useThis.mutate({ id: view.id });
    },
  });

  return (
    <AccountRow items={acts} layout="flex flex-col gap-2.5">
      <div className="flex min-h-row items-center gap-3">
        <BrandMark name={subscriptionMarkFor(view.provider)} />
        {accountIdentity(view, refusal)}
        {wayBack(view, signInAgain)}
        <StatusChip tone={standing[view.standing].tone} word={standing[view.standing].word} />
        <OverflowMenu items={acts} label={`Actions for ${view.label}`} />
      </div>
      {terminalReach(view, shellSetupLine)}
    </AccountRow>
  );
}
