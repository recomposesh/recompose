import type { ConnectClient } from './connect-facts';

import { addressFor, presentedKey, presentedModel } from './connect-facts';

export const claudeCode: ConnectClient = {
  id: 'claude-code',
  name: 'Claude Code',
  lead: { mark: 'claudeCode' },
  dialect: 'Anthropic Messages',
  kind: 'terminal',
  reach: 'origin',
  takesKey: true,
  intro: 'Two variables, read once at startup. A running session keeps the endpoint it began with.',
  guide: {
    label: "Anthropic's own guide",
    href: 'https://code.claude.com/docs/en/llm-gateway-connect',
  },
  steps: (facts) => [
    {
      title: 'Point it at the gateway',
      lines: [
        `export ANTHROPIC_BASE_URL=${addressFor('origin', facts)}`,
        `export ANTHROPIC_AUTH_TOKEN=${presentedKey(facts)}`,
        `export ANTHROPIC_MODEL=${presentedModel(facts)}`,
      ],
      note: 'The token rides in Authorization: Bearer. ANTHROPIC_API_KEY sends the same value as x-api-key instead, and this gateway reads either one.',
    },
    {
      title: 'Or keep it in ~/.claude/settings.json',
      lines: [
        '{',
        '  "env": {',
        `    "ANTHROPIC_BASE_URL": "${addressFor('origin', facts)}",`,
        `    "ANTHROPIC_AUTH_TOKEN": "${presentedKey(facts)}",`,
        `    "ANTHROPIC_MODEL": "${presentedModel(facts)}"`,
        '  }',
        '}',
      ],
      note: 'A settings file reaches background agents as well, which a shell export does not. Run /status in a session to read back the base URL it is using.',
    },
    {
      title: 'See every model of this gateway in the picker',
      lines: ['export CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1'],
      note: 'Claude Code then asks the gateway for its model list at startup and adds each one to /model, labelled From gateway.',
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
