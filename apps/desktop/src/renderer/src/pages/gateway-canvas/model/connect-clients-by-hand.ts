import type { ConnectClient } from './connect-facts';

import { presentedKey, presentedModel } from './connect-facts';

export const byHand: ConnectClient = {
  id: 'curl',
  name: 'curl',
  lead: { glyph: 'terminal' },
  dialect: 'All four dialects',
  kind: 'hand',
  reach: 'whole',
  takesKey: true,
  intro: 'One port, four dialects. Every path below answers on the same address.',
  guide: {
    label: 'The Anthropic Messages reference',
    href: 'https://docs.claude.com/en/api/messages',
  },
  steps: (facts) => [
    {
      title: 'Ask in the Anthropic dialect',
      lines: [
        `curl ${facts.baseUrl}/v1/messages \\`,
        `  -H "Authorization: Bearer ${presentedKey(facts)}" \\`,
        '  -H "anthropic-version: 2023-06-01" \\',
        '  -H "content-type: application/json" \\',
        `  -d '{"model":"${presentedModel(facts)}","max_tokens":16,"messages":[{"role":"user","content":"ping"}]}'`,
      ],
      note: 'The key is read from Authorization, x-api-key, x-goog-api-key or a key query parameter, so a client that fills one of them with a placeholder still reaches through another.',
    },
    {
      title: 'Or in the OpenAI dialect',
      lines: [
        `curl ${facts.baseUrl}/v1/chat/completions \\`,
        `  -H "Authorization: Bearer ${presentedKey(facts)}" \\`,
        '  -H "content-type: application/json" \\',
        `  -d '{"model":"${presentedModel(facts)}","messages":[{"role":"user","content":"ping"}]}'`,
      ],
      note: 'The same gateway answers /v1/responses for the Responses dialect and /v1beta/models/<model>:generateContent for the Gemini one.',
    },
    {
      title: 'Read back what this gateway serves',
      lines: [
        `curl ${facts.baseUrl}/v1/models \\`,
        `  -H "Authorization: Bearer ${presentedKey(facts)}"`,
      ],
      note: 'Every virtual model comes back with the id a client sends and the name you gave it here. The health path answers without a key at all.',
    },
  ],
};
