import { staticClient } from 'fumadocs-core/search/client/orama-static';

/**
 * @summary `/api/search` emits the whole index as a file, because the site deploys as files with
 * no server behind them (record 0146). The client that ships by default asks that address for
 * results and reads the index back instead, so search runs in the browser here. The client holds
 * the database until the first query, so building it at module scope downloads nothing.
 */
export const searchClient = staticClient();
