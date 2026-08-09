import type { ImagePath } from './gateway-images';
import type { ProxyDialect } from './gateway-wire';

export const MODEL_ROUTES: readonly (readonly [string, ProxyDialect])[] = [
  ['/v1/messages', 'anthropic'],
  ['/messages', 'anthropic'],
  ['/v1/chat/completions', 'chat-completions'],
  ['/chat/completions', 'chat-completions'],
  ['/v1/responses', 'responses'],
  ['/responses', 'responses'],
  ['/v1/interactions', 'interactions'],
  ['/v1beta/interactions', 'interactions'],
  ['/interactions', 'interactions'],
];

export const GEMINI_MODEL_ROUTE = '/v1beta/models/:action{.+}';

export const ALPHA_SEARCH_PATHS = ['/v1/alpha/search', '/backend-api/codex/alpha/search'];

export const COUNT_TOKENS_PATHS = ['/v1/messages/count_tokens', '/messages/count_tokens'];

export const COMPACT_PATHS = ['/v1/responses/compact', '/responses/compact'];

export const IMAGE_ROUTES: readonly (readonly [string, ImagePath])[] = [
  ['/v1/images/generations', '/images/generations'],
  ['/images/generations', '/images/generations'],
  ['/v1/images/edits', '/images/edits'],
  ['/images/edits', '/images/edits'],
];

export const VIDEO_ROUTES = [
  ['/v1/videos/generations', '/videos/generations'],
  ['/videos/generations', '/videos/generations'],
  ['/v1/videos/edits', '/videos/edits'],
  ['/videos/edits', '/videos/edits'],
  ['/v1/videos/extensions', '/videos/extensions'],
  ['/videos/extensions', '/videos/extensions'],
  ['/v1/videos', ''],
  ['/videos', ''],
] as const;
