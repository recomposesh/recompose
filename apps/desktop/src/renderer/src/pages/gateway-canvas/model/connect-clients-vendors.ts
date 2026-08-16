import type { ConnectClient } from './connect-facts';

import { addressFor, presentedKey, presentedModel } from './connect-facts';

export const kimiCode: ConnectClient = {
  id: 'kimi-code',
  name: 'Kimi Code',
  lead: { mark: 'kimi' },
  dialect: 'Anthropic Messages',
  kind: 'terminal',
  reach: 'origin',
  takesKey: true,
  intro: 'A provider block, and a model block that names the provider back.',
  guide: {
    label: 'The Kimi CLI provider docs',
    href: 'https://moonshotai.github.io/kimi-cli/en/configuration/providers.html',
  },
  steps: (facts) => [
    {
      title: 'Write ~/.kimi/config.toml',
      lines: [
        '[providers.recompose]',
        'type = "anthropic"',
        `base_url = "${addressFor('origin', facts)}"`,
        `api_key = "${presentedKey(facts)}"`,
        '',
        `[models.${presentedModel(facts)}]`,
        'provider = "recompose"',
        `model = "${presentedModel(facts)}"`,
        'max_context_size = 262144',
      ],
      note: 'The type field also takes openai_legacy, openai_responses and gemini, so one gateway can stand behind whichever dialect you want Kimi Code to speak.',
    },
  ],
};

export const deepseekHarness: ConnectClient = {
  id: 'deepseek-harness',
  name: 'DeepSeek Harness',
  lead: { mark: 'deepseek' },
  dialect: 'Chat Completions',
  kind: 'terminal',
  reach: 'v1',
  takesKey: true,
  intro: 'A custom provider added in its browser interface, or the same block in settings.yaml.',
  guide: {
    label: 'The DeepSeek Harness provider guide',
    href: 'https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/providers.md',
  },
  steps: (facts) => [
    {
      title: 'Settings → Models → Add a custom provider',
      lines: [addressFor('v1', facts), presentedKey(facts)],
      note: 'The version segment belongs in the base URL there, because the harness appends the operation path itself. Fetch available models then reads the list this gateway serves.',
    },
    {
      title: 'Or write it into $DSH_HOME/settings.yaml',
      lines: [
        'llm-pi-ai:',
        '  providers:',
        '    recompose:',
        '      api: openai-completions',
        `      baseURL: ${addressFor('v1', facts)}`,
        '      apiKeyEnv: RECOMPOSE_API_KEY',
        '      models:',
        `        - id: ${presentedModel(facts)}`,
      ],
      note: 'A model entered by hand counts as text-only until it says otherwise, so add input: [text, image] to any model whose targets take images.',
    },
  ],
};

export const geminiCli: ConnectClient = {
  id: 'gemini-cli',
  name: 'Gemini CLI',
  lead: { mark: 'geminiCli' },
  dialect: 'Gemini',
  kind: 'terminal',
  reach: 'origin',
  takesKey: true,
  intro: 'Two variables. Plain http is allowed here because the address is loopback.',
  guide: {
    label: 'The Gemini CLI configuration reference',
    href: 'https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md',
  },
  steps: (facts) => [
    {
      title: 'Point it at the gateway',
      lines: [
        `export GOOGLE_GEMINI_BASE_URL=${addressFor('origin', facts)}`,
        `export GEMINI_API_KEY=${presentedKey(facts)}`,
      ],
      note: 'The base URL must be https unless it names localhost, 127.0.0.1 or [::1], which is exactly what a gateway on this machine is.',
    },
    {
      title: 'Name a virtual model',
      lines: [`gemini --model ${presentedModel(facts)}`],
      note: 'The key travels as x-goog-api-key, one of the four spellings this gateway reads, and the request lands on the generateContent path it already answers.',
    },
  ],
};
