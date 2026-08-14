import type { SubscriptionAccountView } from '@recompose/contracts';
import type { ReactNode } from 'react';

import {
  useActivateSubscription,
  useForgetSubscription,
  useRestoreSubscription,
} from '../../../../shared/api';
import { Badge, BrandMark, OverflowMenu, StatusChip } from '../../../../shared/ui';
import { subscriptionMarkFor, subscriptionTitleFor } from '../../model/provider-catalog';

type SubscriptionAccountRowProps = {
  /** The account as the machine last observed it, standing for one row. */
  view: SubscriptionAccountView;
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
 * @summary Signing in reaches whichever account the person chooses in the tool, which is not the
 * one an adopted row stands for. So an adopted row never offers it, anywhere, and names the tool
 * that owns its credential instead.
 */
/**
 * Whether this account can be asked to take over the plan's traffic.
 *
 * @summary The one already spending has nothing to take over, and a lapsed one has nothing behind
 * it to answer with, so neither offers the act. Everything else does.
 */
function couldTakeOver(view: SubscriptionAccountView): boolean {
  return !view.active && view.standing === 'connected';
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
      {view.active ? <Badge>In use</Badge> : null}
    </span>
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
 * are read in one glance, and the overflow keeps only signing in again and removal.
 */
export function SubscriptionAccountRow({ view }: SubscriptionAccountRowProps) {
  const restore = useRestoreSubscription();
  const forget = useForgetSubscription();
  const useThis = useActivateSubscription();

  const refusal = firstRefusal([restore.refusal, forget.refusal, useThis.refusal]);

  const signInAgain = () => {
    restore.mutate({ id: view.id });
  };

  return (
    <li className="flex min-h-row items-center gap-3 rounded-card border border-line-subtle bg-surface-card px-4 py-2.5">
      <BrandMark name={subscriptionMarkFor(view.provider)} />
      {accountIdentity(view, refusal)}
      {wayBack(view, signInAgain)}
      <StatusChip tone={standing[view.standing].tone} word={standing[view.standing].word} />
      <OverflowMenu
        items={quieterActions({
          view,
          onSignInAgain: signInAgain,
          onRemove: () => {
            forget.mutate({ id: view.id });
          },
          onUseThis: () => {
            useThis.mutate({ id: view.id });
          },
        })}
        label={`Actions for ${view.label}`}
      />
    </li>
  );
}
