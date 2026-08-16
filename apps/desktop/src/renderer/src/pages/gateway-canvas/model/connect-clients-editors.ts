import type { BrandMarkName } from '../../../shared/ui';
import type { ConnectClient, ConnectFacts, ConnectStep } from './connect-facts';

import { addressFor, presentedKey, presentedModel } from './connect-facts';

/**
 * The three fields every OpenAI-compatible extension asks for, in the order its form asks.
 *
 * @summary Cline, Roo Code and Kilo Code all took the same form from the same ancestor, so one
 * step serves all three rather than three copies drifting apart. Each still names its own menu
 * path, because that is where they differ.
 */
function compatibleFields(facts: ConnectFacts, where: string): ConnectStep {
  return {
    title: where,
    lines: [addressFor('v1', facts), presentedKey(facts), presentedModel(facts)],
    note: 'Base URL, then the key, then the model id. Paste the id exactly: these extensions pass it through untouched, so it has to match what the gateway serves.',
  };
}

function compatibleEditor(
  id: string,
  name: string,
  mark: BrandMarkName,
  where: string,
  guide: { label: string; href: string },
): ConnectClient {
  return {
    id,
    name,
    lead: { mark },
    dialect: 'Chat Completions',
    kind: 'editor',
    reach: 'v1',
    takesKey: true,
    intro: 'Its OpenAI compatible provider, pointed at this address by hand.',
    guide,
    steps: (facts) => [compatibleFields(facts, where)],
  };
}

export const cline = compatibleEditor(
  'cline',
  'Cline',
  'cline',
  'Settings → API Provider → OpenAI Compatible',
  { label: 'The Cline provider docs', href: 'https://docs.cline.bot/provider-config/openai' },
);

export const rooCode = compatibleEditor(
  'roo-code',
  'Roo Code',
  'rooCode',
  'Settings → Providers → OpenAI Compatible',
  {
    label: 'The Roo Code provider docs',
    href: 'https://docs.roocode.com/providers/openai-compatible',
  },
);

export const kiloCode = compatibleEditor(
  'kilo-code',
  'Kilo Code',
  'kiloCode',
  'Settings → API Provider → OpenAI Compatible',
  {
    label: 'The Kilo Code provider docs',
    href: 'https://kilo.ai/docs/ai-providers/openai-compatible',
  },
);

export const cursor: ConnectClient = {
  id: 'cursor',
  name: 'Cursor',
  lead: { mark: 'cursor' },
  dialect: 'Chat Completions',
  kind: 'editor',
  reach: 'v1',
  takesKey: true,
  intro: 'An OpenAI key and an overridden base URL, both under the model settings.',
  guide: { label: 'The Cursor model docs', href: 'https://docs.cursor.com/settings/models' },
  steps: (facts) => [
    {
      title: 'Settings → Models → OpenAI API Key',
      lines: [presentedKey(facts)],
      note: 'Cursor keeps the field named for OpenAI whatever endpoint stands behind it, so the gateway key goes here.',
    },
    {
      title: 'Override OpenAI Base URL',
      lines: [addressFor('v1', facts)],
      note: 'Add the virtual model id to the model list beside it, then verify the key so Cursor stops asking OpenAI whether it is real.',
    },
    {
      title: 'Add the model',
      lines: [presentedModel(facts)],
      note: 'Features that run on Cursor servers rather than in the editor cannot reach an address on this machine, so a loopback gateway serves the editor itself.',
    },
  ],
};
