import type { FoundSource } from '../model/found-source';

/** The Claude plan a machine running Claude Code already holds. */
export const claudePlan: FoundSource = {
  id: 'machine:anthropic',
  provider: 'anthropic',
  kind: 'subscription',
  title: 'Your Claude plan',
  identity: 'alpcan@alpcanaydin.com',
  adoptable: true,
};

/** The local runtime a machine running Ollama already answers on. */
export const ollama: FoundSource = {
  id: 'machine:ollama',
  provider: 'ollama',
  kind: 'local',
  title: 'Ollama',
  identity: '127.0.0.1:11434',
  adoptable: true,
};

/** An aggregator a person connected during setup. */
export const openrouter: FoundSource = {
  id: 'a1',
  provider: 'openrouter',
  kind: 'aggregator',
  title: 'OpenRouter',
  identity: 'sk-or-v1-…9e2f',
  adoptable: false,
};
