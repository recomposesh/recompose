import bundledPrices from '../../../resources/model-prices.json?asset';
import bundledRegistryPrices from '../../../resources/opencode-zen-prices.json?asset';
import { fetchLiteLlmPrices } from './litellm-prices';
import { fetchOpenCodeZenPrices } from './opencode-zen-prices';

/**
 * Everything the price desk stands up on in a running app: the two lookups and the two snapshots.
 *
 * @summary The boot takes them rather than reaching for them, so a spec hands stand-ins and nothing
 * outside the app touches a vendor. They are named together because they are one concern, which
 * also keeps the composition root from spelling four fields every time it stands a profile up.
 */
export const theLivePricing = {
  fetchPrices: fetchLiteLlmPrices,
  fetchRegistryPrices: fetchOpenCodeZenPrices,
  bundledPricesFile: bundledPrices,
  bundledRegistryPricesFile: bundledRegistryPrices,
};
