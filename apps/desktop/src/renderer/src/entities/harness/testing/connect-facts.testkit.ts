import type { ConnectFacts } from '../model/connect-facts';

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
