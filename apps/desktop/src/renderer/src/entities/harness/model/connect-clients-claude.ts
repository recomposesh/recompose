import { claudeCodeKeepsModelId } from '@recompose/contracts';

import type { ConnectClient, ConnectFacts } from './connect-facts';

import {
  addressFor,
  carriedVariable,
  commandCarrying,
  presentedKey,
  presentedModel,
} from './connect-facts';

const DISCOVERY_NOTE =
  'The token rides in Authorization: Bearer. ANTHROPIC_API_KEY sends the same value as x-api-key instead, and this gateway reads either one. The discovery variable puts every model whose id carries claude or anthropic into the /model picker, labelled From gateway.';
const ESCAPED_NOTE = `${DISCOVERY_NOTE} That picker skips this id, so the last variable adds it as a row of its own.`;

/**
 * The model an escape has to name outright, or nothing where discovery surfaces it already.
 *
 * @summary Discovery keeps only the ids carrying claude or anthropic, and the escape names a model
 * outright, skipping that filter and the validation behind it. The decision lives here alone
 * because both ways in spell the same variable differently, and two readings of one filter is how
 * a shell block and a settings file start disagreeing about the same gateway.
 */
function modelNeedingTheEscape(facts: ConnectFacts): string | undefined {
  const model = presentedModel(facts);

  return claudeCodeKeepsModelId(model) ? undefined : model;
}

function pickerEscape(facts: ConnectFacts): readonly string[] {
  const escaped = modelNeedingTheEscape(facts);

  return escaped === undefined ? [] : [carriedVariable('ANTHROPIC_CUSTOM_MODEL_OPTION', escaped)];
}

function settingsEnvRows(facts: ConnectFacts): readonly string[] {
  const escaped = modelNeedingTheEscape(facts);

  return [
    `"ANTHROPIC_BASE_URL": "${addressFor('origin', facts)}"`,
    `"ANTHROPIC_AUTH_TOKEN": "${presentedKey(facts)}"`,
    `"ANTHROPIC_MODEL": "${presentedModel(facts)}"`,
    '"CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY": "1"',
    ...(escaped === undefined ? [] : [`"ANTHROPIC_CUSTOM_MODEL_OPTION": "${escaped}"`]),
  ];
}

/**
 * The settings file spelling of the same block, carrying every variable the shell one carries.
 *
 * @summary A settings file is the path background agents read, so a block short of the discovery
 * switch hands the quieter path a smaller picker than the shell one it sits beside. The rows are
 * built rather than written out because the last one takes no comma and which row is last moves
 * with the id.
 */
function settingsLines(facts: ConnectFacts): readonly string[] {
  const rows = settingsEnvRows(facts);

  return [
    '{',
    '  "env": {',
    ...rows.map((row, index) => `    ${row}${index === rows.length - 1 ? '' : ','}`),
    '  }',
    '}',
  ];
}

export const claudeCode: ConnectClient = {
  id: 'claude-code',
  name: 'Claude Code',
  lead: { mark: 'claudeCode' },
  dialect: 'Anthropic Messages',
  kind: 'terminal',
  reach: 'origin',
  takesKey: true,
  intro:
    'Variables in front of the command, read once at startup and kept out of the shell. A running session keeps the endpoint it began with.',
  guide: {
    label: "Anthropic's own guide",
    href: 'https://code.claude.com/docs/en/llm-gateway-connect',
  },
  steps: (facts) => [
    {
      title: 'Point it at the gateway and start it',
      lines: commandCarrying(
        [
          carriedVariable('ANTHROPIC_BASE_URL', addressFor('origin', facts)),
          carriedVariable('ANTHROPIC_AUTH_TOKEN', presentedKey(facts)),
          carriedVariable('ANTHROPIC_MODEL', presentedModel(facts)),
          carriedVariable('CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY', '1'),
          ...pickerEscape(facts),
        ],
        'claude',
      ),
      note: claudeCodeKeepsModelId(presentedModel(facts)) ? DISCOVERY_NOTE : ESCAPED_NOTE,
    },
    {
      title: 'Or keep it in ~/.claude/settings.json',
      lines: [...settingsLines(facts)],
      note: 'A settings file reaches background agents as well, which variables handed to a single command do not, so it carries the same set rather than a shorter one. Run /status in a session to read back the base URL it is using.',
    },
  ],
};

export const claudeDesktop: ConnectClient = {
  id: 'claude-desktop',
  name: 'Claude Desktop',
  lead: { mark: 'claude' },
  dialect: 'Anthropic Messages',
  kind: 'desktop',
  reach: 'origin',
  takesKey: false,
  intro:
    'A form inside the app, not an environment variable. Sessions then run on this machine only.',
  guide: {
    label: 'The desktop gateway guide',
    href: 'https://code.claude.com/docs/en/llm-gateway-connect',
  },
  steps: (facts) => [
    {
      title: 'Open the third-party inference form',
      lines: ['Help → Troubleshooting → Enable Developer Mode'],
      note: 'The app restarts carrying a Developer menu. It reads neither ANTHROPIC_BASE_URL nor a settings file, so this form is the only way in.',
    },
    {
      title: 'Paste the address into Developer → Configure Third-Party Inference',
      lines: [addressFor('origin', facts)],
      note: 'The form takes an address and no credential, so a gateway that enforces a key stays out of reach of the desktop app. Turn that requirement off, or reach this gateway from the command line instead.',
    },
    {
      title: 'Pick the model in the session',
      lines: [presentedModel(facts)],
      note: 'With a gateway configured the environment picker offers local sessions alone, and Remote Control stays away.',
    },
  ],
};
