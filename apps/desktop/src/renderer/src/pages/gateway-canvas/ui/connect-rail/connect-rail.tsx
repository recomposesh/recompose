import type { ReactElement } from 'react';

import type { ClientGroup } from '../../model/connect-catalog';
import type { ConnectClient } from '../../model/connect-facts';

import { TextField } from '../../../../shared/ui';
import { clientsMatching } from '../../model/connect-catalog';
import { ClientLead } from '../client-lead/client-lead';

const ROW_PAINT =
  'flex w-full items-center gap-2 rounded-control px-2 py-1 text-start focus-ring row-hover';

type ConnectRailProps = {
  /** Every group of clients, in the order a person meets them. */
  groups: readonly ClientGroup[];
  /** Which client the pane beside the rail is reading. */
  selected: string;
  /** Receives the client a person picked. */
  onSelect: (id: string) => void;
  /** What a person has typed to narrow the list. */
  asked: string;
  /** Receives every keystroke of the narrowing. */
  onAsk: (asked: string) => void;
};

function clientRow(client: ConnectClient, selected: boolean, onSelect: () => void): ReactElement {
  return (
    <li key={client.id}>
      <button
        aria-current={selected ? 'true' : undefined}
        className={`${ROW_PAINT} ${selected ? 'bg-surface-selected' : ''}`}
        onClick={onSelect}
        type="button"
      >
        <ClientLead lead={client.lead} />
        <span className="flex-1 truncate text-detail text-ink">{client.name}</span>
        <span className="shrink-0 text-footnote text-ink-secondary">{client.dialect}</span>
      </button>
    </li>
  );
}

function group(
  held: ClientGroup,
  asked: string,
  selected: string,
  onSelect: (id: string) => void,
): ReactElement | null {
  const shown = clientsMatching(held.clients, asked);

  if (shown.length === 0) {
    return null;
  }

  return (
    <li key={held.kind}>
      <h3 className="px-2 pt-3 pb-1 text-footnote font-bold tracking-wider text-ink-secondary uppercase">
        {held.title}
      </h3>
      <ul className="flex list-none flex-col gap-px p-0">
        {shown.map((client) =>
          clientRow(client, client.id === selected, () => {
            onSelect(client.id);
          }),
        )}
      </ul>
    </li>
  );
}

/**
 * The list of clients a gateway can be reached from, grouped by what kind of tool each one is.
 *
 * @summary Reach for it beside a pane that reads one client at a time. Narrowing hides a whole
 * group once nothing under it matches, so the headings that remain are the ones with something
 * to show rather than a column of empty titles.
 */
export function ConnectRail({ groups, selected, onSelect, asked, onAsk }: ConnectRailProps) {
  const nothingMatches = groups.every((held) => clientsMatching(held.clients, asked).length === 0);

  return (
    <div className="flex w-connect-rail shrink-0 flex-col gap-1 overflow-y-auto border-e border-line-faint bg-surface-content p-2">
      <TextField
        label="Search clients"
        onChangeValue={onAsk}
        placeholder="Search clients"
        value={asked}
      />
      <ul className="flex list-none flex-col p-0">
        {groups.map((held) => group(held, asked, selected, onSelect))}
      </ul>
      {nothingMatches ? (
        <p className="px-2 py-3 text-caption text-ink-secondary">
          No client here answers to that. Every one of them still reaches this gateway by hand.
        </p>
      ) : null}
    </div>
  );
}
