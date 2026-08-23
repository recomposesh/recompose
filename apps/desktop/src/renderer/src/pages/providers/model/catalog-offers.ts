import { vendorEndpointOf } from '@recompose/contracts';

import type { CatalogOffer } from './catalog-shape';

function hostOf(vendor: string): string {
  return new URL(vendorEndpointOf(vendor)?.origin ?? 'https://example.invalid').host;
}

export const withYourKey = (vendor: string) => `${hostOf(vendor)} with your key`;

export const ownAddress = 'A base URL and a dialect you choose';

export function signsIn(title: string, benefit: string): CatalogOffer {
  return { way: 'subscription', takes: 'sign-in', title, benefit };
}

export function planToken(title: string, benefit: string): CatalogOffer {
  return { way: 'subscription', takes: 'key', title, benefit };
}

export function apiKey(title: string, benefit: string): CatalogOffer {
  return { way: 'api-key', takes: 'key', title, benefit };
}

export function aggregatorKey(title: string, benefit: string): CatalogOffer {
  return { way: 'aggregator', takes: 'key', title, benefit };
}

export function runtime(title: string, benefit: string): CatalogOffer {
  return { way: 'local', takes: 'runtime', title, benefit };
}

export const glyphOf = {
  network: { glyph: 'network' },
  monitor: { glyph: 'monitor' },
  spark: { glyph: 'spark' },
} as const;
