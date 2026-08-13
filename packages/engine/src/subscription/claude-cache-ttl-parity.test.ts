import { describe, expect, it } from 'vitest';

import type { JsonObject } from '../gateway-wire';

import { isJsonObject } from '../gateway-wire';
import { upgradedClaudeCacheTtls } from './claude-request';

describe('Claude cache markers crossing an upgraded window', () => {
  it('should raise every existing marker to the one-hour window', () => {
    const upgraded = upgradedClaudeCacheTtls(marked());

    expect(blockAt(upgraded, 'tools', 0)).toHaveProperty('cache_control.ttl', '1h');
    expect(blockAt(upgraded, 'system', 1)).toHaveProperty('cache_control.ttl', '1h');
    expect(contentAt(upgraded, 1)).toHaveProperty('cache_control.ttl', '1h');
  });

  it('should never hand a marker to a block that carried none', () => {
    const upgraded = upgradedClaudeCacheTtls(marked());

    expect(blockAt(upgraded, 'tools', 1)).not.toHaveProperty('cache_control');
    expect(blockAt(upgraded, 'system', 0)).not.toHaveProperty('cache_control');
    expect(contentAt(upgraded, 0)).not.toHaveProperty('cache_control');
  });
});

function marked(): JsonObject {
  return {
    tools: [{ name: 't', cache_control: { type: 'ephemeral' } }, { name: 'u' }],
    system: [
      { type: 'text', text: 's0' },
      { type: 'text', text: 's1', cache_control: { type: 'ephemeral' } },
    ],
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'a' },
          { type: 'text', text: 'b', cache_control: { type: 'ephemeral' } },
        ],
      },
    ],
  };
}

function listAt(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function blockAt(body: JsonObject, section: string, index: number): unknown {
  return listAt(body[section]).at(index);
}

function contentAt(body: JsonObject, index: number): unknown {
  const message = listAt(body['messages']).at(0);

  return isJsonObject(message) ? listAt(message['content']).at(index) : undefined;
}
