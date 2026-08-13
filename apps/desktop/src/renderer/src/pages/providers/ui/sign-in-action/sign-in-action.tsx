import type { SubscriptionProviderId } from '@recompose/contracts';

import { useSignInSubscription } from '../../../../shared/api';
import { SheetActionSlot } from '../../../../shared/ui';
import { WaitingOnTheTool } from '../waiting-on-the-tool/waiting-on-the-tool';

type SignInActionProps = {
  name: string;
  provider: SubscriptionProviderId;
  onConnected: () => void;
  toolName: string;
  command: string;
  /**
   * @summary True when the machine already holds an account, so this act stops being the way in
   * and becomes the second choice. At this width that reads as a quiet act in place rather than
   * the sheet's primary button.
   */
  quieter?: boolean;
};

/** The act that hands the sign-in to the provider's tool, and the waiting it turns into. */
export function SignInAction({
  name,
  provider,
  toolName,
  command,
  quieter = false,
  onConnected,
}: SignInActionProps) {
  const signIn = useSignInSubscription();

  if (signIn.isPending) {
    return <WaitingOnTheTool command={command} toolName={toolName} />;
  }

  return (
    <>
      {signIn.refusal === undefined ? null : (
        <p className="text-detail text-danger-ink" role="alert">
          {signIn.refusal}
        </p>
      )}
      {quieter ? (
        <button
          className="focus-ring text-detail text-ink-secondary underline underline-offset-2"
          onClick={() => {
            signIn.mutate({ provider }, { onSuccess: onConnected });
          }}
          type="button"
        >
          Sign in with a different account
        </button>
      ) : (
        <SheetActionSlot>
          <button
            className="push-button-primary focus-ring"
            onClick={() => {
              signIn.mutate({ provider }, { onSuccess: onConnected });
            }}
            type="button"
          >
            Sign in to {name}
          </button>
        </SheetActionSlot>
      )}
    </>
  );
}
