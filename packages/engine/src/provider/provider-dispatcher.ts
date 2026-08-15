import { Agent } from 'undici';

import { providerSilenceBoundMs } from '../provider-bounds';

/**
 * @summary The dispatcher rides on each request rather than through `setGlobalDispatcher`, which
 * would reach every other consumer in the process, Electron's own traffic included.
 *
 * `Object.assign` builds the options rather than a spread: `@types/node` describes the fetch options
 * with `undici-types`, pinned a release behind the `undici` the engine installs, so a declared
 * intersection compares the two `Dispatcher` copies and rejects the agent. The inferred intersection
 * carries the agent through without either copy having to satisfy the other.
 */
export function providerFetch(boundMs: number = providerSilenceBoundMs): typeof fetch {
  const dispatcher = new Agent({ bodyTimeout: boundMs, headersTimeout: boundMs });

  return async (input, init) => fetch(input, Object.assign({}, init, { dispatcher }));
}
