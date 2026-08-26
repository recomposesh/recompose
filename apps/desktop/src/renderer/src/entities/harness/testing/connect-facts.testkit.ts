import type { ConnectClient, ConnectFacts } from '../model/connect-facts';

/**
 * A gateway serving two models under a key, which every connect reading is written against.
 *
 * @summary Two models rather than one, because the difference between a configuration that lists
 * them all and a field that names the first only shows with a second one standing.
 */
export const servingGateway: ConnectFacts = {
  gatewayName: 'My Gateway',
  slug: 'my-gateway',
  baseUrl: 'http://127.0.0.1:8397',
  apiKey: 'rc-local-4Xh2p9Fd',
  models: [
    { id: 'creative', displayName: 'Creative' },
    { id: 'fast', displayName: 'Fast' },
  ],
};

/** Every line a client offers to copy, joined the way the pane hands them to the clipboard. */
export function everyLineCopied(
  client: ConnectClient,
  facts: ConnectFacts = servingGateway,
): string {
  return client
    .steps(facts)
    .flatMap((step) => step.lines)
    .join('\n');
}

/**
 * Everything a client puts in front of a person, the sentences beside the lines included.
 *
 * @summary A fact reaches a person through a line or through the note under it, and which of the
 * two carries it is the client's own decision rather than something a reading should pin.
 */
export function everythingCopied(
  client: ConnectClient,
  facts: ConnectFacts = servingGateway,
): string {
  return client
    .steps(facts)
    .flatMap((step) => [...step.lines, step.note])
    .join('\n');
}
