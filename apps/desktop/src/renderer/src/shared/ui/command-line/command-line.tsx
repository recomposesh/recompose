import { CopyButton } from '../copy-button/copy-button';

type CommandLineProps = {
  /** The exact line a person runs, kept verbatim so what they copy is what the app meant. */
  command: string;
  /** What the copy button announces itself as, which names the line rather than the act. */
  label: string;
};

/**
 * One shell line a person can read and copy, boxed away from the prose around it.
 *
 * @summary Reach for it wherever the app hands somebody a command to run themselves. The line
 * wraps rather than truncating, because a path elided mid-string is a line that pastes wrong, and
 * the copy button stands beside it so nobody has to select it by hand to get it right.
 */
export function CommandLine({ command, label }: CommandLineProps) {
  return (
    <div className="flex min-w-0 items-start gap-2 rounded-control border border-line-faint bg-surface-card px-2.5 py-2">
      <code className="min-w-0 flex-1 font-mono text-mono-caption break-all whitespace-pre-wrap text-ink">
        {command}
      </code>
      <CopyButton label={label} value={command} />
    </div>
  );
}
