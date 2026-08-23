import type { ConnectClient, ConnectFacts, ConnectStep } from './connect-facts';

import {
  addressFor,
  exportLine,
  keyVariable,
  presentedKey,
  presentedModel,
  providerId,
  secondModel,
} from './connect-facts';

const CODEX_GUIDE = {
  label: 'The Codex config reference',
  href: 'https://developers.openai.com/codex/config-reference',
};

/**
 * The provider block every Codex client reads, written into the user-level file.
 *
 * @summary The command line, the editor extension and the desktop app all read
 * `~/.codex/config.toml`, and Codex ignores `model_provider` and `model_providers` in a
 * project-local file, so all three clients are handed the same user-level block rather than
 * three spellings of it.
 */
function providerBlock(facts: ConnectFacts): ConnectStep {
  return {
    title: 'Write the provider into ~/.codex/config.toml',
    lines: [
      `model = "${presentedModel(facts)}"`,
      `model_provider = "${providerId(facts)}"`,
      '',
      `[model_providers.${providerId(facts)}]`,
      `name = "${facts.gatewayName}"`,
      `base_url = "${addressFor('v1', facts)}"`,
      `env_key = "${keyVariable(facts)}"`,
      'wire_api = "responses"',
    ],
    note: 'A project-local .codex/config.toml is ignored for these keys, so the block belongs in the user-level file or Codex warns at startup and keeps talking to OpenAI.',
  };
}

/**
 * The key and the launch, in the one block a person pastes to start working.
 *
 * @summary `model` in the file names the default alone, so a gateway serving several needs the
 * line that reaches another. The second model is named here rather than described, because a
 * person reading a list of two ids wants to know which flag carries the one the file left out.
 */
function keyAndLaunch(facts: ConnectFacts): ConnectStep {
  const other = secondModel(facts);

  return {
    title: 'Hand it the key and start it',
    lines: [exportLine(keyVariable(facts), presentedKey(facts)), 'codex'],
    note:
      other === undefined
        ? 'Codex reads the variable named by env_key and presents it as a bearer token, which is one of the four spellings this gateway accepts.'
        : `Codex reads the variable named by env_key and presents it as a bearer token. The file names ${presentedModel(facts)} as the default, so reach the other with codex --model ${other}.`,
  };
}

export const codexCli: ConnectClient = {
  id: 'codex-cli',
  name: 'Codex CLI',
  lead: { mark: 'codex' },
  dialect: 'OpenAI Responses',
  kind: 'terminal',
  reach: 'v1',
  takesKey: true,
  intro: 'One provider block at user level. Responses is the only wire the current Codex speaks.',
  guide: CODEX_GUIDE,
  steps: (facts) => [providerBlock(facts), keyAndLaunch(facts)],
};

export const codexInChatgpt: ConnectClient = {
  id: 'codex-chatgpt',
  name: 'Codex in ChatGPT',
  lead: { mark: 'codex' },
  dialect: 'OpenAI Responses',
  kind: 'desktop',
  reach: 'v1',
  takesKey: true,
  intro: 'The desktop app and the editor extension read the same file the command line does.',
  guide: CODEX_GUIDE,
  steps: (facts) => [
    providerBlock(facts),
    keyAndLaunch(facts),
    {
      title: 'Restart the app so it reads the file again',
      lines: ['Codex → Quit Codex, then open it again'],
      note: "The ChatGPT chat surface takes no custom endpoint of its own, and only the Codex side reads config.toml. The desktop model picker doesn't list a custom provider's models yet, so the block may serve the command line while the app still shows OpenAI's own list.",
    },
  ],
};
