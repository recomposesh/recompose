import type { UsageSearchRange } from '@recompose/contracts';

import { usageSearchRangeSchema } from '@recompose/contracts';

import type { UsageMetricWord } from '../menu/app-menu-item';

const SERVED_RENDERER = 'app://renderer/index.html';

export type UsageSearchWords = { range: UsageSearchRange; metric: UsageMetricWord };

const USAGE_METRIC_WORDS: readonly UsageMetricWord[] = ['requests', 'tokens', 'latency', 'spend'];

const DEFAULT_USAGE_WORDS: UsageSearchWords = { range: '24h', metric: 'requests' };

function wholeInstant(raw: string | null): number | undefined {
  const parsed = raw === null ? Number.NaN : Number(raw);

  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * @summary A custom range without both of its edges falls back to the default window, because the
 * renderer's own address parsing folds it back the same way and the tick must read the screen.
 */
function settledRange(params: URLSearchParams, range: UsageSearchRange): UsageSearchRange {
  if (range !== 'custom') {
    return range;
  }

  const from = wholeInstant(params.get('from'));
  const to = wholeInstant(params.get('to'));

  return from !== undefined && to !== undefined && from < to ? 'custom' : '24h';
}

/** The range and metric words a usage address carries, mirroring the renderer's own fallbacks. */
export function usageSearchWordsFrom(url: string): UsageSearchWords {
  if (!onUsageUrl(url)) {
    return DEFAULT_USAGE_WORDS;
  }

  const { hash } = new URL(url);
  const queryAt = hash.indexOf('?');
  const params = new URLSearchParams(queryAt === -1 ? '' : hash.slice(queryAt + 1));
  const range =
    usageSearchRangeSchema.options.find((held) => held === params.get('range')) ?? '24h';
  const metric = USAGE_METRIC_WORDS.find((held) => held === params.get('metric')) ?? 'requests';

  return { range: settledRange(params, range), metric };
}

export const SETTINGS_SHORTCUT_ROUTE = '/settings?focus=first-control';

export function rendererBaseFor(development: boolean, devServerUrl: string | undefined): string {
  if (!development || devServerUrl === undefined || devServerUrl === '') {
    return SERVED_RENDERER;
  }

  return devServerUrl;
}

export function rendererUrlFor(base: string, route: string): string {
  return `${base}#${route}`;
}

/**
 * The settings route stamped with the press that asked for it.
 *
 * @summary Every press has to differ from the last, or the router treats the second one as the
 * same location and the focus request never runs again.
 */
export function settingsShortcutRouteFor(press: number): string {
  return `${SETTINGS_SHORTCUT_ROUTE}&at=${String(press)}`;
}

/**
 * The creation sheet opened over the canvas, whatever surface a person stands on.
 *
 * @summary A gateway is born on the canvas, so the sheet asks its questions over the surface the
 * answer lands on rather than over a settings list the new gateway has nothing to do with.
 */
export function newGatewayRouteFor(press: number): string {
  return `/?create=true&at=${String(press)}`;
}

/**
 * The gateways pick lands where the home landing lands, which already picks the last-looked-at
 * gateway or the empty state.
 */
export function gatewaysRouteFor(press: number): string {
  return `/?at=${String(press)}`;
}

export function providersRouteFor(press: number): string {
  return `/providers?at=${String(press)}`;
}

export function usageRouteFor(press: number): string {
  return `/usage?at=${String(press)}`;
}

/** The slug of the gateway detail an address stands on, or nothing off the detail. */
export function gatewayDetailSlugFrom(url: string): string | null {
  if (!onGatewayDetailUrl(url)) {
    return null;
  }

  const [slug] = new URL(url).hash.slice('#/gateways/'.length).split(/[/?]/);

  return slug === undefined || slug === '' ? null : slug;
}

/** Whether an address stands on the providers surface, wherever its search params point it. */
export function onProvidersUrl(url: string): boolean {
  if (!URL.canParse(url)) {
    return false;
  }

  return new URL(url).hash.startsWith('#/providers');
}

export function onGatewayDetailUrl(url: string): boolean {
  if (!URL.canParse(url)) {
    return false;
  }

  return new URL(url).hash.startsWith('#/gateways/');
}

/** Whether an address stands on the usage explorer, wherever its search params point it. */
export function onUsageUrl(url: string): boolean {
  if (!URL.canParse(url)) {
    return false;
  }

  return new URL(url).hash.startsWith('#/usage');
}
