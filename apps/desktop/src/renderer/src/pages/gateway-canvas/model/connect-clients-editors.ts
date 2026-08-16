import type { BrandMarkName } from '../../../shared/ui';
import type { ConnectClient, ConnectFacts, ConnectStep } from './connect-facts';

import { addressFor, presentedKey, presentedModel } from './connect-facts';

/**
 * The three fields the compatible provider form asks for, in the order it asks.
 *
 * @summary Cline and Roo Code took the same form from the same ancestor, so one step serves both
 * rather than two copies drifting apart. Each still names its own way in, because that is where
 * they differ. Kilo Code has since moved to a form of its own and no longer comes through here.
 */
function compatibleFields(facts: ConnectFacts, where: string): ConnectStep {
  return {
    title: where,
    lines: [addressFor('v1', facts), presentedKey(facts), presentedModel(facts)],
    note: 'Base URL, then the key, then the model id. Paste the id exactly: the form passes it through untouched, so it has to match what the gateway serves.',
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
  'The gear icon → API Provider → OpenAI Compatible',
  {
    label: 'The Cline provider docs',
    href: 'https://docs.cline.bot/provider-config/openai-compatible',
  },
);

export const rooCode = compatibleEditor(
  'roo-code',
  'Roo Code',
  'rooCode',
  'The settings panel → API Provider → OpenAI Compatible',
  {
    label: 'The Roo Code provider docs',
    href: 'https://docs.roocode.com/providers/openai-compatible',
  },
);

export const kiloCode: ConnectClient = {
  id: 'kilo-code',
  name: 'Kilo Code',
  lead: { mark: 'kiloCode' },
  dialect: 'Chat Completions',
  kind: 'editor',
  reach: 'v1',
  takesKey: true,
  intro: 'A custom provider of its own, which reads the model list off the address you hand it.',
  guide: {
    label: 'The Kilo Code provider docs',
    href: 'https://kilo.ai/docs/ai-providers/openai-compatible',
  },
  steps: (facts) => [
    {
      title: 'Settings → Providers → Custom provider',
      lines: ['recompose', 'OpenAI Compatible'],
      note: 'The form takes a provider id and a display name of your choosing first, then the API it speaks.',
    },
    {
      title: 'Give it the address and the key',
      lines: [addressFor('v1', facts), presentedKey(facts)],
      note: `Kilo Code then reads the gateway model list itself and offers ${presentedModel(facts)} in a picker, so no id needs typing.`,
    },
  ],
};

export const cursor: ConnectClient = {
  id: 'cursor',
  name: 'Cursor',
  lead: { mark: 'cursor' },
  dialect: 'Chat Completions',
  kind: 'editor',
  reach: 'v1',
  takesKey: true,
  intro: 'An OpenAI key and an overridden base URL, both under the model settings.',
  guide: { label: 'The Cursor docs', href: 'https://cursor.com/docs' },
  steps: (facts) => [
    {
      title: 'Settings → Models → OpenAI API Key',
      lines: [presentedKey(facts)],
      note: 'Cursor keeps that field named for OpenAI whatever endpoint stands behind it, so the gateway key goes there.',
    },
    {
      title: 'Turn on Override OpenAI Base URL',
      lines: [addressFor('v1', facts)],
      note: 'Press Verify beside it once the address is in, which is how Cursor takes the key and the endpoint together.',
    },
    {
      title: 'Add the model',
      lines: [presentedModel(facts)],
      note: 'The override reaches whatever runs on chat completions. Tab completion keeps running on the models Cursor hosts, so a gateway on this machine serves the editor rather than that.',
    },
  ],
};
