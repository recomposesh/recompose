import type { ConnectClient } from './connect-facts';

import {
  addressFor,
  carriedVariable,
  commandCarrying,
  everyModel,
  keyVariable,
  presentedKey,
  presentedModel,
  providerId,
} from './connect-facts';

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
        `[providers.${providerId(facts)}]`,
        'type = "anthropic"',
        `base_url = "${addressFor('origin', facts)}"`,
        `api_key = "${presentedKey(facts)}"`,
        ...everyModel(facts).flatMap((model) => [
          '',
          `[models.${model.id}]`,
          `provider = "${providerId(facts)}"`,
          `model = "${model.id}"`,
          'max_context_size = 262144',
        ]),
      ],
      note: 'The type field also takes openai_legacy, openai_responses and gemini, so one gateway can stand behind whichever dialect you want Kimi Code to speak.',
    },
    {
      title: 'Start it',
      lines: ['kimi'],
      note: `The model block above is what /model offers, so ${presentedModel(facts)} stands there under the provider it names.`,
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
      title: 'Start the web interface',
      lines: ['npx @deepseek-ai/dsh web'],
      note: 'The harness opens in a browser rather than a terminal, at http://127.0.0.1:3080 by default.',
    },
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
        `    ${providerId(facts)}:`,
        '      api: openai-completions',
        `      baseURL: ${addressFor('v1', facts)}`,
        `      apiKeyEnv: ${keyVariable(facts)}`,
        '      models:',
        ...everyModel(facts).map((model) => `        - id: ${model.id}`),
      ],
      note: 'A model entered by hand counts as text-only until it says otherwise, so add input: [text, image] to any model whose targets take images.',
    },
    {
      title: 'Start it again carrying the key that block names',
      lines: commandCarrying(
        [carriedVariable(keyVariable(facts), presentedKey(facts))],
        'npx @deepseek-ai/dsh web',
      ),
      note: 'The settings file names the variable rather than holding the key, and the harness answers MISSING_CREDENTIAL while nothing sets it, so the key rides in front of the launch and reaches that process alone. A key entered through the Models page needs no variable at all.',
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
  intro:
    'Two variables in front of the command. Plain http is allowed here because the address is loopback.',
  guide: {
    label: 'The Gemini CLI configuration reference',
    href: 'https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md',
  },
  steps: (facts) => [
    {
      title: 'Point it at the gateway and start it',
      lines: commandCarrying(
        [
          carriedVariable('GOOGLE_GEMINI_BASE_URL', addressFor('origin', facts)),
          carriedVariable('GEMINI_API_KEY', presentedKey(facts)),
        ],
        `gemini --model ${presentedModel(facts)}`,
      ),
      note: 'The base URL must be https unless it names localhost, 127.0.0.1 or [::1], which is exactly what a gateway on this machine is. The key travels as x-goog-api-key, one of the four spellings this gateway reads.',
    },
  ],
};
