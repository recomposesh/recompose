import type { ClientKind, ConnectClient } from './connect-facts';

import { omp, opencode, pi } from './connect-clients-agents';
import { byHand } from './connect-clients-by-hand';
import { claudeCode, claudeDesktop } from './connect-clients-claude';
import { codexCli, codexInChatgpt } from './connect-clients-codex';
import { cline, cursor, kiloCode, rooCode } from './connect-clients-editors';
import { deepseekHarness, geminiCli, kimiCode } from './connect-clients-vendors';

/** One heading in the rail, standing the clients of a single kind. */
export type ClientGroup = {
  /** What the heading reads, spoken of the tools rather than of the dialect they speak. */
  title: string;
  /** The kind every client under this heading carries. */
  kind: ClientKind;
  /** The clients themselves, in the order a person meets them. */
  clients: readonly ConnectClient[];
};

export const connectGroups: readonly ClientGroup[] = [
  {
    title: 'Terminal agents',
    kind: 'terminal',
    clients: [claudeCode, codexCli, opencode, pi, omp, kimiCode, geminiCli, deepseekHarness],
  },
  { title: 'Desktop apps', kind: 'desktop', clients: [claudeDesktop, codexInChatgpt] },
  { title: 'Editors', kind: 'editor', clients: [cursor, cline, rooCode, kiloCode] },
  { title: 'By hand', kind: 'hand', clients: [byHand] },
];

export const connectClients: readonly ConnectClient[] = connectGroups.flatMap(
  (group) => group.clients,
);

/**
 * The client a name stands for, and the first one when the name stands for none.
 *
 * @summary The selected client is held as an id rather than an object, so a catalog that drops a
 * client between releases would otherwise leave the sheet with nothing to draw. Falling back to
 * the first entry keeps the sheet answering rather than blank.
 */
export function clientNamed(id: string): ConnectClient {
  const found = connectClients.find((client) => client.id === id);

  if (found !== undefined) {
    return found;
  }

  const [first] = connectClients;

  if (first === undefined) {
    throw new Error('the connect catalog stands no clients');
  }

  return first;
}

/** Every client whose name or dialect carries what a person typed into the rail's search. */
export function clientsMatching(clients: readonly ConnectClient[], asked: string): ConnectClient[] {
  const wanted = asked.trim().toLowerCase();

  return clients.filter(
    (client) =>
      wanted === '' ||
      client.name.toLowerCase().includes(wanted) ||
      client.dialect.toLowerCase().includes(wanted),
  );
}
