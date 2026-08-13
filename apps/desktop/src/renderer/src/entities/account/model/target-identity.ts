import type { Account } from '@recompose/contracts';

import { localRuntimes } from '@recompose/contracts';

import type { BrandMarkName } from '../../../shared/ui';

import { brandMarkNames } from '../../../shared/ui';

const subscriptionProducts: Record<Extract<Account, { kind: 'subscription' }>['provider'], string> =
  {
    anthropic: 'Claude',
    openai: 'Codex',
    antigravity: 'Gemini',
    kimi: 'Kimi Code',
  };

const providerProducts: Readonly<Record<string, string>> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  openrouter: 'OpenRouter',
  gemini: 'Gemini',
  'gemini-interactions': 'Gemini',
  ollama: 'Ollama',
};

const markAliases: Readonly<Record<string, BrandMarkName>> = {
  antigravity: 'gemini',
  'gemini-interactions': 'gemini',
};

/**
 * The name a stored account reads as wherever it stands for itself.
 *
 * @summary A credentialed account carries the name a person filed it under, and a runtime carries
 * none, because nobody names a server they only pointed at. The runtime reads as the server it is,
 * so a row and a picker never leave one nameless.
 */
export function accountName(account: Account): string {
  if (account.kind !== 'local') {
    return account.label;
  }

  return account.provider === 'custom'
    ? (account.label ?? 'Local server')
    : localRuntimes[account.provider].name;
}

/** The provider product one target card names as its main line. */
export function accountProductName(account: Account): string {
  return account.kind === 'subscription'
    ? subscriptionProducts[account.provider]
    : (providerProducts[account.provider] ?? account.provider);
}

/** The account identity one target card reads under its provider product. */
export function accountDetail(account: Account, signedInAs?: string): string {
  if (account.kind === 'subscription') {
    return signedInAs ?? account.label;
  }

  return account.kind === 'local' ? account.address : account.label;
}

/**
 * The vendor mark a stored account leads with, or nothing where recompose draws none for it.
 *
 * @summary The inventory is the one authority on what can be drawn, so the mark is looked up in it
 * rather than assumed from the provider a registry row was stored under, which is a free string.
 */
export function accountMark(account: Account): BrandMarkName | undefined {
  return (
    markAliases[account.provider] ?? brandMarkNames.find((drawn) => drawn === account.provider)
  );
}
