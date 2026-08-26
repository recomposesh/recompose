import type { BrowserSignInProviderId } from '@recompose/contracts';

import { refusalSentence, unwrapIpcResult } from '../../../../shared/api';
import { Icon } from '../../../../shared/ui';
import { useSignInLanding } from '../app-sign-in-step/app-sign-in-step';
import { PickRow } from '../pick-row/pick-row';

type AppSignInRowProps = {
  /** The plan being signed into, which decides where the browser is sent. */
  provider: BrowserSignInProviderId;
  /** The plan a person bought, so the row names the product rather than a tool. */
  planName: string;
  /** Stands the row inert while another act on the step runs. */
  disabled?: boolean;
  /** Runs once the account is stored, so the catalog can close behind it. */
  onConnected: () => void;
};

/**
 * The way in that needs nothing installed: recompose opens the browser and keeps the sign-in.
 *
 * @summary It stands as a row rather than as the step's own act because it is never the only way
 * in. Wherever it appears, a tool on the machine offers the same plan, and the two read at one
 * weight so a person picks by what each says rather than by which one the sheet emphasized. The
 * line beneath says who ends up holding the sign-in, which is the whole of the difference.
 */
export function AppSignInRow({
  provider,
  planName,
  disabled = false,
  onConnected,
}: AppSignInRowProps) {
  const waiting = useSignInLanding(
    async () =>
      unwrapIpcResult(await window.recompose['subscriptions:browser-sign-in']({ provider })),
    onConnected,
  );

  return (
    <>
      <PickRow
        disabled={disabled || waiting.isPending}
        label={`Sign in to ${planName} through recompose`}
        lead={<Icon className="size-4 text-ink-secondary" name="person" />}
        onPick={() => {
          waiting.mutate();
        }}
        title="Sign in through recompose"
        under={
          waiting.isPending
            ? 'Finish in the browser that opened'
            : 'Opens your browser. recompose holds this sign-in.'
        }
      />
      {waiting.error === null ? null : (
        <p className="px-3 py-2 text-detail text-danger-ink" role="alert">
          {refusalSentence(waiting.error)}
        </p>
      )}
    </>
  );
}
