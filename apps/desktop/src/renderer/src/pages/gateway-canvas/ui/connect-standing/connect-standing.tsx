type ConnectStandingProps = {
  /** How many answered requests this gateway's log is holding right now. */
  answered: number;
  /** The client the pane is reading, named so the waiting line says what it waits for. */
  name: string;
};

function saidOf(answered: number, name: string): string {
  if (answered === 0) {
    return `Nothing has reached this gateway yet. Run ${name} once and this line turns green.`;
  }

  const requests = answered === 1 ? '1 request' : `${String(answered)} requests`;

  return `The log holds ${requests} already, so something on this machine is reaching through.`;
}

/**
 * Whether the wiring landed, read off the traffic the gateway actually answered.
 *
 * @summary Reach for it at the foot of the connect pane. A person who pastes a block has no way
 * to know whether it worked without leaving for their own terminal, and the gateway already knows,
 * so the sheet says it. The count belongs to the gateway rather than to the client named beside
 * it, because a request carries no name recompose can trust.
 */
export function ConnectStanding({ answered, name }: ConnectStandingProps) {
  const landed = answered > 0;

  return (
    <p
      className="flex items-center gap-2 rounded-control border border-line-faint bg-surface-raised px-2.5 py-2 text-caption text-ink"
      role="status"
    >
      <span
        aria-hidden
        className={`size-1.5 shrink-0 rounded-pill ${landed ? 'bg-running' : 'bg-ink-tertiary'}`}
      />
      {saidOf(answered, name)}
    </p>
  );
}
