import type { ReactElement } from 'react';

import type { ConnectClient, ConnectFacts, ConnectStep } from '../../model/connect-facts';

import { CommandLine, CopyButton } from '../../../../shared/ui';
import { addressFor, keyIsAStandIn } from '../../model/connect-facts';
import { ClientLead } from '../client-lead/client-lead';
import { ConnectStanding } from '../connect-standing/connect-standing';

type ConnectDetailProps = {
  /** The client this pane is reading, which the rail beside it picked. */
  client: ConnectClient;
  /** The gateway facts every block is written from. */
  facts: ConnectFacts;
  /** Every virtual model this gateway serves, in the order the canvas holds them. */
  models: readonly { id: string; displayName: string }[];
  /** How many requests this gateway has answered, which tells a person the wiring landed. */
  answered: number;
};

function stepBlock(step: ConnectStep, position: number): ReactElement {
  return (
    <li className="flex flex-col gap-1.5" key={step.title}>
      <h4 className="text-detail font-semibold text-ink">
        <span className="text-ink-secondary">{position}. </span>
        {step.title}
      </h4>
      <CommandLine command={step.lines.join('\n')} label={`Copy the block for ${step.title}`} />
      {step.note === undefined ? null : (
        <p className="text-caption text-ink-secondary">{step.note}</p>
      )}
    </li>
  );
}

function addressRow(client: ConnectClient, facts: ConnectFacts): ReactElement {
  const address = addressFor(client.reach, facts);

  return (
    <div className="flex items-center gap-2 rounded-control bg-surface-field px-2.5 py-1.5">
      <span className="shrink-0 text-caption text-ink-secondary">Base URL for this client</span>
      <code className="min-w-0 flex-1 truncate text-end font-mono text-mono-caption text-ink">
        {address}
      </code>
      <CopyButton
        announcement="Base URL copied."
        label={`Copy the base URL for ${client.name}`}
        value={address}
      />
    </div>
  );
}

function modelRow(model: { id: string; displayName: string }): ReactElement {
  return (
    <li className="flex items-center gap-2 py-1" key={model.id}>
      <span className="truncate text-detail text-ink">{model.displayName}</span>
      <code className="min-w-0 flex-1 truncate font-mono text-mono-caption text-ink-secondary">
        {model.id}
      </code>
      <CopyButton
        announcement="Model id copied."
        label={`Copy the id of ${model.displayName}`}
        value={model.id}
      />
    </li>
  );
}

function servedModels(models: ConnectDetailProps['models']): ReactElement {
  if (models.length === 0) {
    return (
      <p className="text-caption text-ink-secondary">
        This gateway serves no virtual model yet, so the blocks above carry a stand-in id. Compose
        one on the canvas and it lands here.
      </p>
    );
  }

  return (
    <ul className="flex list-none flex-col divide-y divide-line-faint p-0">
      {models.map((model) => modelRow(model))}
    </ul>
  );
}

/**
 * Everything one client needs: what it speaks, where it points, and the blocks to copy.
 *
 * @summary Reach for it beside the rail that picks the client. Every block is written from the
 * gateway standing in front of the person rather than from a template, so what they copy carries
 * this gateway's own port, key and model ids and needs no editing after the paste.
 */
export function ConnectDetail({ client, facts, models, answered }: ConnectDetailProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3.5">
      <div className="flex items-center gap-2">
        <ClientLead className="size-4.5" lead={client.lead} />
        <h3 className="text-card-title text-ink">{client.name}</h3>
        <span className="rounded-chip bg-surface-tint px-1.5 py-0.5 text-footnote text-ink-secondary">
          {client.dialect}
        </span>
        <span className="flex-1" />
        <a
          className="focus-ring text-caption text-accent-ink"
          href={client.guide.href}
          rel="noreferrer"
          target="_blank"
        >
          {client.guide.label}
        </a>
      </div>
      <p className="text-detail text-ink-secondary">{client.intro}</p>
      {addressRow(client, facts)}
      {keyIsAStandIn(facts) ? (
        <p className="text-caption text-ink-secondary">
          This gateway enforces no key, so the value in these blocks is a stand-in that satisfies
          the client and nothing else.
        </p>
      ) : null}
      <ol className="flex list-none flex-col gap-3 p-0">
        {client.steps(facts).map((step, index) => stepBlock(step, index + 1))}
      </ol>
      <section className="flex flex-col gap-1">
        <h4 className="text-footnote font-bold tracking-wider text-ink-secondary uppercase">
          Virtual models this gateway serves
        </h4>
        {servedModels(models)}
      </section>
      <ConnectStanding answered={answered} name={client.name} />
    </div>
  );
}
