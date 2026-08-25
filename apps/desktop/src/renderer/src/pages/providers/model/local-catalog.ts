import type { LocalProviderId } from '@recompose/contracts';

import { localRuntimes } from '@recompose/contracts';

import type { CatalogLead } from '../../../entities/provider';
import type { BrandMarkName } from '../../../shared/ui';

const runtimeMarks: Partial<Record<LocalProviderId, BrandMarkName>> = {
  ollama: 'ollama',
  lmstudio: 'lmstudio',
  vllm: 'vllm',
};

/**
 * The mark or glyph a local row leads with.
 *
 * @summary A project publishing a mark leads with it. llama.cpp publishes none, and a server a
 * person addressed themselves stands for no project at all, so each leads with the glyph its
 * category stands under rather than borrowing another project's mark.
 */
export function localLeadFor(provider: LocalProviderId): CatalogLead {
  const mark = runtimeMarks[provider];

  if (mark !== undefined) {
    return { mark };
  }

  return provider === 'custom' ? { glyph: 'network' } : { glyph: 'monitor' };
}

/**
 * The name a local row reads as, which is the project's own spelling or the person's own word.
 *
 * @summary A documented runtime reads as its project spells it, because nobody names a server
 * they only pointed at. A server a person addressed themselves has no project to be named by, so
 * it reads as whatever they called it.
 */
export function localRuntimeName(provider: LocalProviderId, label?: string): string {
  return provider === 'custom' ? (label ?? 'Local server') : localRuntimes[provider].name;
}
