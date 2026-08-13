import { z } from 'zod';

/**
 * The dialects the gateway translates between, which is every dialect a stored row may name.
 *
 * @summary It stands in the contracts rather than beside the translator, because a row a person
 * pointed at their own address carries its dialect into storage, and a stored value is a contract.
 */
export const providerDialectSchema = z.enum([
  'anthropic',
  'chat-completions',
  'gemini',
  'interactions',
  'responses',
]);

export type ProviderDialect = z.infer<typeof providerDialectSchema>;

export type VendorEndpoint = {
  /** Where a turn for this vendor is sent, carrying no trailing separator. */
  origin: string;
  /** How a turn for this vendor is spelled. */
  dialect: ProviderDialect;
};

/**
 * Every vendor recompose knows an endpoint for, and what it knows.
 *
 * @summary Both processes read it: the host resolves where an account is spent, and the engine
 * child resolves how the turn is spelled. Keeping one table means a vendor recompose adds is
 * described once rather than described twice and left to drift.
 *
 * An origin stops short of the path a turn lands on, because the turn path follows the dialect
 * rather than the vendor. The one vendor that documents its version segment before its
 * compatibility segment carries the whole of it here, because no rule could recover it.
 */
export const vendorEndpoints = {
  aistudio: { origin: 'https://generativelanguage.googleapis.com', dialect: 'gemini' },
  anthropic: { origin: 'https://api.anthropic.com', dialect: 'anthropic' },
  cerebras: { origin: 'https://api.cerebras.ai', dialect: 'chat-completions' },
  deepinfra: { origin: 'https://api.deepinfra.com/v1/openai', dialect: 'chat-completions' },
  deepseek: { origin: 'https://api.deepseek.com', dialect: 'chat-completions' },
  fireworks: { origin: 'https://api.fireworks.ai/inference', dialect: 'chat-completions' },
  gemini: { origin: 'https://generativelanguage.googleapis.com', dialect: 'gemini' },
  'gemini-interactions': {
    origin: 'https://generativelanguage.googleapis.com',
    dialect: 'interactions',
  },
  groq: { origin: 'https://api.groq.com/openai', dialect: 'chat-completions' },
  kimi: { origin: 'https://api.kimi.com/coding', dialect: 'chat-completions' },
  minimax: { origin: 'https://api.minimax.io/anthropic', dialect: 'anthropic' },
  mistral: { origin: 'https://api.mistral.ai', dialect: 'chat-completions' },
  moonshot: { origin: 'https://api.moonshot.ai', dialect: 'chat-completions' },
  openai: { origin: 'https://api.openai.com', dialect: 'chat-completions' },
  openrouter: { origin: 'https://openrouter.ai/api', dialect: 'chat-completions' },
  qwen: { origin: 'https://dashscope.aliyuncs.com/compatible-mode', dialect: 'chat-completions' },
  'qwen-coding': {
    origin: 'https://coding.dashscope.aliyuncs.com/apps/anthropic',
    dialect: 'anthropic',
  },
  together: { origin: 'https://api.together.ai', dialect: 'chat-completions' },
  vertex: { origin: 'https://aiplatform.googleapis.com', dialect: 'gemini' },
  xai: { origin: 'https://api.x.ai/v1', dialect: 'responses' },
  zhipu: { origin: 'https://api.z.ai/api/anthropic', dialect: 'anthropic' },
} as const satisfies Record<string, VendorEndpoint>;

export type VendorId = keyof typeof vendorEndpoints;

const endpoints = new Map<string, VendorEndpoint>(Object.entries(vendorEndpoints));

/**
 * What recompose knows about a provider's endpoint, or nothing where it knows none.
 *
 * @summary A stored provider is any non-blank string a person typed, so the lookup is a Map
 * rather than an object: an object would answer `constructor` with an inherited member.
 */
export function vendorEndpointOf(provider: string): VendorEndpoint | undefined {
  return endpoints.get(provider);
}

const documentedKeyOpenings = new Map<string, string>([
  ['anthropic', 'sk-ant-'],
  ['gemini', 'AIza'],
  ['groq', 'gsk_'],
  ['openai', 'sk-proj-'],
  ['openrouter', 'sk-or-v1-'],
  ['xai', 'xai-'],
]);

/**
 * The opening a vendor documents its keys start with, or nothing where it documents none.
 *
 * @summary Reach for it where an empty key field wants a hint. A vendor publishing bearer
 * authentication and no shape leaves the field with none, because a hint nobody promised teaches a
 * person to doubt a key that is perfectly good.
 */
export function documentedKeyOpeningOf(provider: string): string | undefined {
  return documentedKeyOpenings.get(provider);
}
