import { CommandLine } from '../../../../shared/ui';

type WaitingOnTheToolProps = {
  /** @summary The tool the person is waiting on, named so the wait says whose it is. */
  toolName: string;
  /** @summary The command the app ran, kept on screen so a person can run it themselves. */
  command: string;
  /**
   * @summary Why no terminal opened, when none did. The wait carries on regardless, because the
   * command below is the person's to run, and this is the only hint that they now have to.
   */
  note?: string | undefined;
  /**
   * @summary What a person still has to do inside the tool once it opens. A tool that opens on its
   * own prompt sits there looking finished, so the wait says the word that actually signs in.
   */
  hint?: string | undefined;
};

/**
 * The wait while the provider's own tool finishes a sign-in.
 *
 * @summary The command stays readable and copyable throughout, because the app cannot see inside
 * the tool's run, and a person who would rather drive it themselves needs the exact line.
 */
export function WaitingOnTheTool({ toolName, command, note, hint }: WaitingOnTheToolProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-detail text-ink-secondary">Waiting for {toolName} to finish signing in.</p>
      {hint === undefined ? null : <p className="text-detail font-medium text-ink">{hint}</p>}
      {note === undefined ? null : (
        <p className="text-detail text-attention-ink" role="status">
          {note}
        </p>
      )}
      <CommandLine command={command} label={`Copy the ${toolName} sign-in command`} />
    </div>
  );
}
