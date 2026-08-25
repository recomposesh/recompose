import type { ConnectClient } from '../../../../entities/harness';

import { ClientLead } from '../../../../entities/harness';
import { Icon } from '../../../../shared/ui';

type HarnessTileProps = {
  /** The harness this tile stands for. */
  client: ConnectClient;
  /** Whether the person has this harness picked. */
  picked: boolean;
  /** Takes the press, which picks the harness or takes it back out. */
  onToggle: () => void;
};

function boxTone(picked: boolean): string {
  return picked
    ? 'border-accent bg-accent text-highlight-ink'
    : 'border-line-field bg-surface-card';
}

/**
 * One harness a person can pick, drawn with its own mark.
 *
 * @summary The whole tile takes the press rather than the box in its corner, because a target the
 * size of a checkbox is a target a person misses. The box reports the standing and never takes a
 * press of its own, so one press can never read as two.
 */
export function HarnessTile({ client, picked, onToggle }: HarnessTileProps) {
  return (
    <button
      aria-pressed={picked}
      className={`relative flex h-16 w-full flex-col items-center justify-center gap-1.5 rounded-card border bg-surface-card px-1 focus-ring-fill ${
        picked ? 'border-accent' : 'border-line-subtle'
      } row-hover`}
      onClick={onToggle}
      type="button"
    >
      <span
        aria-hidden
        className={`absolute inset-e-1.5 top-1.5 flex size-3.5 items-center justify-center rounded-mark border ${boxTone(picked)}`}
      >
        {picked ? <Icon className="size-2.5" name="check" /> : null}
      </span>
      <ClientLead className="size-4.5" lead={client.lead} />
      <span className="text-center text-caption text-ink">{client.name}</span>
    </button>
  );
}
