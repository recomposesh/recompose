import type { ConnectClient } from './connect-facts';

import { addressFor, presentedKey, presentedModel } from './connect-facts';

export const opencode: ConnectClient = {
  id: 'opencode',
  name: 'opencode',
  lead: { mark: 'opencode' },
  dialect: 'Chat Completions',
  kind: 'terminal',
  reach: 'v1',
  takesKey: true,
  intro: 'One provider in opencode.json, drawn by the openai-compatible package.',
  guide: { label: 'The opencode provider docs', href: 'https://opencode.ai/docs/providers/' },
  steps: (facts) => [
    {
      title: 'Add the provider to opencode.json',
      lines: [
        '{',
        '  "$schema": "https://opencode.ai/config.json",',
        '  "provider": {',
        '    "recompose": {',
        '      "npm": "@ai-sdk/openai-compatible",',
        '      "name": "recompose",',
        '      "options": {',
        `        "baseURL": "${addressFor('v1', facts)}",`,
        `        "apiKey": "${presentedKey(facts)}"`,
        '      },',
        '      "models": {',
        `        "${presentedModel(facts)}": { "name": "${presentedModel(facts)}" }`,
        '      }',
        '    }',
        '  }',
        '}',
      ],
      note: 'The openai-compatible package reaches /v1/chat/completions. Swap it for @ai-sdk/anthropic to reach the Messages dialect, or @ai-sdk/openai for Responses.',
    },
    {
      title: 'Select it inside a session',
      lines: [`/models recompose/${presentedModel(facts)}`],
      note: 'A model key has to match what the gateway accepts in the model field, which is the virtual model id exactly as it stands here.',
    },
  ],
};

export const pi: ConnectClient = {
  id: 'pi',
  name: 'pi',
  lead: { glyph: 'terminal' },
  dialect: 'Any of the four',
  kind: 'terminal',
  reach: 'v1',
  takesKey: true,
  intro: 'One JSON file, reread every time the model picker opens. No restart.',
  guide: {
    label: 'The pi models reference',
    href: 'https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/models.md',
  },
  steps: (facts) => [
    {
      title: 'Write ~/.pi/agent/models.json',
      lines: [
        '{',
        '  "providers": {',
        '    "recompose": {',
        `      "baseUrl": "${addressFor('v1', facts)}",`,
        '      "api": "openai-completions",',
        `      "apiKey": "${presentedKey(facts)}",`,
        '      "models": [',
        `        { "id": "${presentedModel(facts)}" }`,
        '      ]',
        '    }',
        '  }',
        '}',
      ],
      note: 'The api field also takes anthropic-messages, openai-responses and google-generative-ai, which is one name for each dialect this gateway serves. The Messages dialect wants the bare origin rather than /v1.',
    },
    {
      title: 'Pick it from the model list',
      lines: [`/model recompose/${presentedModel(facts)}`],
      note: 'The file is read again each time /model opens, so an edit lands without leaving the session.',
    },
  ],
};

export const omp: ConnectClient = {
  id: 'omp',
  name: 'omp',
  lead: { glyph: 'terminal' },
  dialect: 'Any of the four',
  kind: 'terminal',
  reach: 'v1',
  takesKey: true,
  intro: 'A provider entry in models.yml, with the key carried as a bearer token.',
  guide: {
    label: 'The omp provider docs',
    href: 'https://github.com/can1357/oh-my-pi/blob/main/docs/providers.md',
  },
  steps: (facts) => [
    {
      title: 'Write ~/.omp/agent/models.yml',
      lines: [
        'providers:',
        '  recompose:',
        `    baseUrl: ${addressFor('v1', facts)}`,
        '    api: openai-completions',
        `    apiKey: ${presentedKey(facts)}`,
        '    authHeader: true',
        '    models:',
        `      - id: ${presentedModel(facts)}`,
      ],
      note: 'apiKey takes an environment variable name or a literal value, and authHeader puts whichever it resolves into Authorization: Bearer.',
    },
    {
      title: 'Or let it read the gateway model list',
      lines: ['    discovery:', '      type: openai-models-list'],
      note: 'Discovery calls the OpenAI-shaped model list this gateway already serves, so every virtual model arrives without being named twice.',
    },
  ],
};
