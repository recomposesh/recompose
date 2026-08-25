import type { ReactElement } from 'react';

import type { ConnectClient, ConnectFacts } from '../../../../entities/harness';

import { ClientLead } from '../../../../entities/harness';
import { CommandLine, Icon } from '../../../../shared/ui';

type HarnessGuideProps = {
  /** The harness this entry points at the gateway. */
  client: ConnectClient;
  /** What the gateway offers, which every line is written from. */
  facts: ConnectFacts;
  /** Whether this entry stands open. */
  open: boolean;
  /** Opens this entry, closing whichever stood open before. */
  onOpen: () => void;
};

function stepBlock(title: string, lines: readonly string[], note: string): ReactElement {
  return (
    <li className="flex flex-col gap-1.5" key={title}>
      <h4 className="text-detail font-semibold text-ink">{title}</h4>
      <CommandLine command={lines.join('\n')} label={`Copy the block for ${title}`} />
      <p className="text-caption text-ink-secondary">{note}</p>
    </li>
  );
}

/**
 * One harness and the lines that point it at the gateway.
 *
 * @summary The lines come from the harness's own connect facts rather than from copy written
 * here, so a person meets the same instructions setup gives them and the gateway's own sheet
 * gives them later. Nothing marks an entry as done: setup cannot see inside a terminal, and a
 * tick it could not have earned would be a claim rather than a reading.
 */
export function HarnessGuide({ client, facts, open, onOpen }: HarnessGuideProps) {
  return (
    <div className="border-line-faint not-last:border-b">
      <h3>
        <button
          aria-expanded={open}
          className="flex w-full items-center gap-2.5 px-3.5 py-2.75 text-start focus-ring-fill row-hover"
          onClick={onOpen}
          type="button"
        >
          <ClientLead className="size-4 shrink-0" lead={client.lead} />
          <span className="flex-1 text-card-title text-ink">{client.name}</span>
          <Icon
            className={`size-3.5 shrink-0 text-ink-secondary ${open ? '' : '-rotate-90'}`}
            name="chevron"
          />
        </button>
      </h3>
      {open ? (
        <div className="flex flex-col gap-3 px-3.5 pt-0.5 pb-3.5">
          <p className="text-detail text-ink-secondary">{client.intro}</p>
          <ol className="flex list-none flex-col gap-3 p-0">
            {client.steps(facts).map((step) => stepBlock(step.title, step.lines, step.note))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
