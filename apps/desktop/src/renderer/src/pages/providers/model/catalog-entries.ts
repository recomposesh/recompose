import { localRuntimes } from '@recompose/contracts';

import type { CatalogEntry } from './catalog-shape';

import { localEntries, onThisMachine } from './catalog-local-entries';
import {
  aggregatorKey,
  apiKey,
  glyphOf,
  ownAddress,
  planToken,
  runtime,
  signsIn,
  withYourKey,
} from './catalog-offers';

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
    offers: [signsIn('Kimi Code', 'Moonshot plan, K3 in your tools')],
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
    lead: glyphOf.spark,
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
    lead: glyphOf.spark,
    offers: [
      { way: 'aggregator', takes: 'address', title: 'Custom aggregator', benefit: ownAddress },
    ],
  },
];

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
    readerKey: {
      label: 'Mgmt key',
      hint: 'sk-or-v1-…',
      note: 'Optional. OpenRouter reads credits only with a management key, and this one never serves a request.',
    },
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
