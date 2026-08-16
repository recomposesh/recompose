import type { ConnectClient, ConnectFacts, ConnectStep } from './connect-facts';

import { addressFor, presentedKey, presentedModel } from './connect-facts';

const CODEX_GUIDE = {
  label: 'The Codex config reference',
  href: 'https://learn.chatgpt.com/docs/config-file/config-reference',
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
      'model_provider = "recompose"',
      '',
      '[model_providers.recompose]',
      'name = "recompose"',
      `base_url = "${addressFor('v1', facts)}"`,
      'env_key = "RECOMPOSE_API_KEY"',
      'wire_api = "responses"',
    ],
    note: 'A project-local .codex/config.toml is ignored for these keys, so the block belongs in the user-level file or Codex warns at startup and keeps talking to OpenAI.',
  };
}

function keyExport(facts: ConnectFacts): ConnectStep {
  return {
    title: 'Hand it the key the block names',
    lines: [`export RECOMPOSE_API_KEY=${presentedKey(facts)}`],
    note: 'Codex reads the variable named by env_key and presents it as a bearer token, which is one of the four spellings this gateway accepts.',
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
  steps: (facts) => [providerBlock(facts), keyExport(facts)],
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
    keyExport(facts),
    {
      title: 'Restart the app so it reads the file again',
      lines: ['Codex → Quit Codex, then open it again'],
      note: 'The ChatGPT chat surface takes no custom endpoint of its own. Only the Codex side reads config.toml, and it reads it once, at launch.',
    },
  ],
};
