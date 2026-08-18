import type { LocalRuntimeId } from '@recompose/contracts';

import { localRuntimes, vendorEndpointOf } from '@recompose/contracts';

import type { AccountKind } from '../../../entities/account';
import type { CatalogLead } from './catalog-lead';

/** A way an account reaches a provider, which is every kind the registry holds one under. */
export type ConnectionWay = AccountKind;

/**
 * What a picked entry's connect step asks a person for.
 *
 * @summary The column an entry stands in and the thing it asks for are two different facts. A
 * coding plan stands among the subscriptions, because that's where a person who bought a plan
 * looks, and asks for the token the plan issued, because no sign-in exists to offer.
 */
export type OfferTakes = 'sign-in' | 'key' | 'runtime' | 'address';

export type CatalogOffer = {
  /** The column the row stands in, which is the kind the surface behind it holds. */
  way: ConnectionWay;
  /** What the connect step asks for once the row is picked. */
  takes: OfferTakes;
  /** What the row reads as under this way, which is the product rather than the vendor. */
  title: string;
  /** One line saying what connecting this way gives. */
  benefit: string;
};

export type CatalogEntry = {
  /** The provider the entry stands for, which is the identity a stored row keeps. */
  id: string;
  /** The name the provider goes by on screen. */
  name: string;
  /** The mark or glyph the entry's cards lead with. */
  lead: CatalogLead;
  /** Every way this provider can be connected, in the order they are offered. */
  offers: readonly CatalogOffer[];
  /**
   * The vendor's own page where the key this entry takes is issued.
   *
   * @summary Only an entry whose vendor publishes such a page carries one, because a link the app
   * guessed at is worse than none: a person who lands on the wrong page concludes the key is
   * somewhere else. The app never restates the steps behind it either, since the vendor moves them.
   */
  keyPage?: { label: string; href: string };
};

function hostOf(vendor: string): string {
  return new URL(vendorEndpointOf(vendor)?.origin ?? 'https://example.invalid').host;
}

const withYourKey = (vendor: string) => `${hostOf(vendor)} with your key`;

const ownAddress = 'A base URL and a dialect you choose';

function signsIn(title: string, benefit: string): CatalogOffer {
  return { way: 'subscription', takes: 'sign-in', title, benefit };
}

function planToken(title: string, benefit: string): CatalogOffer {
  return { way: 'subscription', takes: 'key', title, benefit };
}

function apiKey(title: string, benefit: string): CatalogOffer {
  return { way: 'api-key', takes: 'key', title, benefit };
}

function aggregatorKey(title: string, benefit: string): CatalogOffer {
  return { way: 'aggregator', takes: 'key', title, benefit };
}

function runtime(title: string, benefit: string): CatalogOffer {
  return { way: 'local', takes: 'runtime', title, benefit };
}

const glyphOf = { network: { glyph: 'network' }, monitor: { glyph: 'monitor' } } as const;

const subscriptionEntries: readonly CatalogEntry[] = [
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    lead: { mark: 'githubCopilot' },
    offers: [signsIn('GitHub Copilot', 'Sign in with your GitHub account')],
  },
  {
    id: 'kimi',
    name: 'Kimi',
    lead: { mark: 'kimi' },
    offers: [signsIn('Kimi Code', 'Moonshot plan, K2 in your tools')],
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    lead: { mark: 'gemini' },
    offers: [signsIn('Gemini (Antigravity)', 'Sign in with your Google account')],
  },
  {
    id: 'zhipu',
    name: 'Z.ai',
    lead: { mark: 'zhipu' },
    offers: [planToken('GLM Coding Plan', 'Z.ai plan, GLM models')],
    keyPage: { label: 'Get a key from Z.ai', href: 'https://z.ai/manage-apikey/apikey-list' },
  },
  {
    id: 'qwen-coding',
    name: 'Qwen',
    lead: { mark: 'qwen' },
    offers: [planToken('Qwen Coding Plan', 'Alibaba Model Studio, multi-model')],
    keyPage: {
      label: 'Get a key from Alibaba Model Studio',
      href: 'https://www.alibabacloud.com/help/en/model-studio/get-api-key',
    },
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    lead: { mark: 'minimax' },
    offers: [planToken('MiniMax Coding Plan', 'M2 on a flat monthly quota')],
    keyPage: {
      label: 'Get a key from MiniMax',
      href: 'https://platform.minimax.io/user-center/basic-information/interface-key',
    },
  },
];

const keyEntries: readonly CatalogEntry[] = [
  {
    id: 'gemini',
    name: 'Gemini',
    lead: { mark: 'gemini' },
    offers: [apiKey('Gemini API', withYourKey('gemini'))],
  },
  {
    id: 'mistral',
    name: 'Mistral',
    lead: { mark: 'mistral' },
    offers: [apiKey('Mistral', withYourKey('mistral'))],
  },
  {
    id: 'xai',
    name: 'Grok',
    lead: { mark: 'grok' },
    offers: [apiKey('xAI Grok', withYourKey('xai'))],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    lead: { mark: 'deepseek' },
    offers: [apiKey('DeepSeek', withYourKey('deepseek'))],
  },
  {
    id: 'moonshot',
    name: 'Moonshot AI',
    lead: { mark: 'moonshot' },
    offers: [apiKey('Moonshot AI', withYourKey('moonshot'))],
  },
  {
    id: 'qwen',
    name: 'Qwen',
    lead: { mark: 'qwen' },
    offers: [apiKey('Qwen', withYourKey('qwen'))],
  },
  {
    id: 'custom-endpoint',
    name: 'Custom endpoint',
    lead: glyphOf.network,
    offers: [{ way: 'api-key', takes: 'address', title: 'Custom endpoint', benefit: ownAddress }],
  },
];

const aggregatorEntries: readonly CatalogEntry[] = [
  {
    id: 'together',
    name: 'Together AI',
    lead: { mark: 'together' },
    offers: [aggregatorKey('Together AI', 'Open-weights catalog')],
  },
  {
    id: 'fireworks',
    name: 'Fireworks AI',
    lead: { mark: 'fireworks' },
    offers: [aggregatorKey('Fireworks AI', 'Fast open-model inference')],
  },
  {
    id: 'groq',
    name: 'Groq',
    lead: { mark: 'groq' },
    offers: [aggregatorKey('Groq', 'Lowest latency on its own silicon')],
  },
  {
    id: 'deepinfra',
    name: 'DeepInfra',
    lead: { mark: 'deepinfra' },
    offers: [aggregatorKey('DeepInfra', 'Low-cost open-model catalog')],
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    lead: { mark: 'cerebras' },
    offers: [aggregatorKey('Cerebras', 'Wafer-scale, fastest tokens per second')],
  },
  {
    id: 'custom-aggregator',
    name: 'Custom aggregator',
    lead: glyphOf.network,
    offers: [
      { way: 'aggregator', takes: 'address', title: 'Custom aggregator', benefit: ownAddress },
    ],
  },
];

function runtimeHost(id: LocalRuntimeId): string {
  return new URL(localRuntimes[id].address).host;
}

const onThisMachine = (id: LocalRuntimeId) => `${runtimeHost(id)}, models on this machine`;

const localEntries: readonly CatalogEntry[] = [
  {
    id: 'lmstudio',
    name: localRuntimes.lmstudio.name,
    lead: { mark: 'lmstudio' },
    offers: [runtime(localRuntimes.lmstudio.name, `${runtimeHost('lmstudio')}, local server`)],
  },
  {
    id: 'llamacpp',
    name: localRuntimes.llamacpp.name,
    lead: glyphOf.monitor,
    offers: [runtime(localRuntimes.llamacpp.name, `llama-server on ${runtimeHost('llamacpp')}`)],
  },
  {
    id: 'vllm',
    name: localRuntimes.vllm.name,
    lead: { mark: 'vllm' },
    offers: [runtime(localRuntimes.vllm.name, 'High-throughput GPU serving')],
  },
  {
    id: 'custom-local',
    name: 'Custom local server',
    lead: glyphOf.network,
    offers: [
      {
        way: 'local',
        takes: 'address',
        title: 'Custom local server',
        benefit: 'Anything serving models on a local port',
      },
    ],
  },
];

/**
 * Every provider the catalog offers, with the ways each one connects.
 *
 * @summary Reach for it from the catalog. A provider that both sells a plan and sells a key
 * stands under both ways, because the two yield different things and a person chooses between
 * them rather than being handed one. Each way carries its own title, because a plan reads as the
 * product a person pays for and a key reads as the endpoint it is spent against.
 */
export const catalogEntries: readonly CatalogEntry[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    lead: { mark: 'anthropic' },
    offers: [
      signsIn('Claude', 'Sign in with your Pro or Max plan'),
      apiKey('Anthropic API', withYourKey('anthropic')),
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    lead: { mark: 'openai' },
    offers: [
      signsIn('Codex', 'Sign in with your ChatGPT plan'),
      apiKey('OpenAI API', withYourKey('openai')),
    ],
  },
  ...subscriptionEntries,
  ...keyEntries,
  {
    id: 'openrouter',
    name: 'OpenRouter',
    lead: { mark: 'openrouter' },
    offers: [aggregatorKey('OpenRouter', 'One key, 300+ models')],
  },
  ...aggregatorEntries,
  {
    id: 'ollama',
    name: localRuntimes.ollama.name,
    lead: { mark: 'ollama' },
    offers: [runtime(localRuntimes.ollama.name, onThisMachine('ollama'))],
  },
  ...localEntries,
];
