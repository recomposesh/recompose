import { describe, expect, test } from 'vitest';

import { claudeHeadersCarriedFrom } from './claude-carried-headers';

describe('what the caller sends that Anthropic itself needs to see', () => {
  test('a subagent names the agent it runs under and the one that spawned it', () => {
    const carried = claudeHeadersCarriedFrom({
      'x-claude-code-agent-id': ['agent-7'],
      'x-claude-code-parent-agent-id': ['agent-1'],
    });

    expect(carried).toEqual([
      ['X-Claude-Code-Agent-Id', 'agent-7'],
      ['X-Claude-Code-Parent-Agent-Id', 'agent-1'],
    ]);
  });

  test('a remote session names its container and its session', () => {
    const carried = claudeHeadersCarriedFrom({
      'x-claude-remote-container-id': ['container-3'],
      'x-claude-remote-session-id': ['session-9'],
    });

    expect(carried).toEqual([
      ['X-Claude-Remote-Container-Id', 'container-3'],
      ['X-Claude-Remote-Session-Id', 'session-9'],
    ]);
  });

  test('the app and the protection header ride along under their own spelling', () => {
    const carried = claudeHeadersCarriedFrom({
      'x-client-app': ['cli'],
      'x-anthropic-additional-protection': ['on'],
    });

    expect(carried).toEqual([
      ['X-Client-App', 'cli'],
      ['X-Anthropic-Additional-Protection', 'on'],
    ]);
  });

  test('a header the caller never sent is never invented', () => {
    expect(claudeHeadersCarriedFrom({ 'x-claude-code-agent-id': [] })).toEqual([]);
    expect(claudeHeadersCarriedFrom(undefined)).toEqual([]);
  });

  test('nothing else the caller sent crosses, because the wire identity is this app’s own', () => {
    expect(
      claudeHeadersCarriedFrom({ authorization: ['Bearer leak'], 'user-agent': ['curl/8'] }),
    ).toEqual([]);
  });
});
