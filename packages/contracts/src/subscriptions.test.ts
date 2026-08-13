import { describe, expect, test } from 'vitest';

import {
  subscriptionAccountViewSchema,
  subscriptionProvenanceSchema,
  subscriptionProviderIdSchema,
  subscriptionProviders,
  subscriptionPlanNames,
  subscriptionStandingSchema,
  subscriptionToolSchema,
  toolBacked,
  toolBackedProviderIdSchema,
} from './subscriptions';

const connectedView = {
  id: 'acc-claude-max',
  provider: 'anthropic',
  label: 'Claude Max',
  signedInAs: 'someone@example.com',
  plan: 'Max',
  standing: 'connected',
  active: true,
  provenance: 'sign-in',
};

const presentTool = {
  provider: 'anthropic',
  toolName: 'Claude Code',
  present: true,
  signInCommand: 'CLAUDE_CONFIG_DIR=/homes/anthropic/pending claude',
  shellSetupLine: 'export CLAUDE_CONFIG_DIR="/homes/anthropic/active"',
};

describe('the providers a subscription can name', () => {
  test('every plan a subscription row can stand for', () => {
    expect(subscriptionProviderIdSchema.options).toEqual([
      'anthropic',
      'openai',
      'antigravity',
      'kimi',
      'copilot',
    ]);
  });

  test('every plan whose own tool signs a person in', () => {
    expect(toolBackedProviderIdSchema.options).toEqual([
      'anthropic',
      'openai',
      'antigravity',
      'kimi',
    ]);
  });

  test('Kimi Code delegates to the tool that already owns its device flow', () => {
    expect(subscriptionProviders.kimi).toEqual({
      toolBinary: 'cliproxyapi',
      toolName: 'Kimi Code',
      configHomeVariable: 'CLIPROXYAPI_HOME',
      signInArguments: ['--kimi-login'],
    });
  });

  test('a provider no tool signs in is refused', () => {
    expect(() => subscriptionProviderIdSchema.parse('openrouter')).toThrow();
  });
});

describe('the tool that performs each sign-in', () => {
  test('Anthropic delegates to Claude Code, whose sign-in needs no argument', () => {
    expect(subscriptionProviders.anthropic).toEqual({
      toolBinary: 'claude',
      toolName: 'Claude Code',
      configHomeVariable: 'CLAUDE_CONFIG_DIR',
      signInArguments: [],
    });
  });

  test('OpenAI delegates to Codex, whose sign-in takes its own argument', () => {
    expect(subscriptionProviders.openai).toEqual({
      toolBinary: 'codex',
      toolName: 'Codex',
      configHomeVariable: 'CODEX_HOME',
      signInArguments: ['login'],
    });
  });

  test('every provider the vocabulary names has a tool to delegate to', () => {
    for (const provider of toolBackedProviderIdSchema.options) {
      expect(subscriptionProviders[provider].toolBinary).not.toBe('');
      expect(subscriptionProviders[provider].configHomeVariable).not.toBe('');
    }
  });
});

describe('the standing a row reports', () => {
  test('an account stands connected or lapsed, and never a third thing', () => {
    expect(subscriptionStandingSchema.options).toEqual(['connected', 'lapsed']);
    expect(() => subscriptionStandingSchema.parse('unknown')).toThrow();
  });
});

describe('the view a subscription row renders from', () => {
  test('a full view round-trips', () => {
    expect(subscriptionAccountViewSchema.parse(connectedView)).toEqual(connectedView);
  });

  test('the address and the plan stay absent when the record carries neither', () => {
    const { signedInAs, plan, ...whatTheRecordCarried } = connectedView;

    expect([signedInAs, plan]).toEqual(['someone@example.com', 'Max']);
    expect(subscriptionAccountViewSchema.parse(whatTheRecordCarried)).toEqual(whatTheRecordCarried);
  });

  test('a lapsed account still reports which account it is', () => {
    const lapsed = { ...connectedView, standing: 'lapsed', active: false };

    expect(subscriptionAccountViewSchema.parse(lapsed)).toEqual(lapsed);
  });

  test('a view carries no credential reference and no token material', () => {
    expect(() =>
      subscriptionAccountViewSchema.parse({ ...connectedView, credentialRef: 'cred-7f3a' }),
    ).toThrow();
    expect(() =>
      subscriptionAccountViewSchema.parse({ ...connectedView, accessToken: 'sk-oops' }),
    ).toThrow();
  });

  test('a blank label is refused, because a row with no name names nothing', () => {
    expect(() => subscriptionAccountViewSchema.parse({ ...connectedView, label: '   ' })).toThrow();
  });

  test('a blank address is refused rather than rendering as an empty line', () => {
    expect(() =>
      subscriptionAccountViewSchema.parse({ ...connectedView, signedInAs: '   ' }),
    ).toThrow();
  });

  test('a standing outside the pair is refused', () => {
    expect(() =>
      subscriptionAccountViewSchema.parse({ ...connectedView, standing: 'connecting' }),
    ).toThrow();
  });
});

describe('where the row says its account came from', () => {
  test('a view the app signed in reports the sign-in it came from', () => {
    const signedIn = { ...connectedView, provenance: 'sign-in' };

    expect(subscriptionAccountViewSchema.parse(signedIn)).toEqual(signedIn);
  });

  test('a view the app adopted reports the machine it came from', () => {
    const adopted = { ...connectedView, provenance: 'machine' };

    expect(subscriptionAccountViewSchema.parse(adopted)).toEqual(adopted);
  });

  test('a view saying nothing about where it came from is refused, because every row reports it', () => {
    const { provenance, ...withoutTheOrigin } = connectedView;

    expect(provenance).toBe('sign-in');
    expect(() => subscriptionAccountViewSchema.parse(withoutTheOrigin)).toThrow();
  });

  test('an origin outside the pair is refused', () => {
    expect(() =>
      subscriptionAccountViewSchema.parse({ ...connectedView, provenance: 'keychain' }),
    ).toThrow();
  });

  test('the vocabulary names the sign-in and the machine, and nothing else', () => {
    expect(subscriptionProvenanceSchema.options).toEqual(['sign-in', 'machine']);
  });
});

describe('the tool report the surface reads before offering a sign-in', () => {
  test('a present tool round-trips with its command and its shell setup line', () => {
    expect(subscriptionToolSchema.parse(presentTool)).toEqual(presentTool);
  });

  test('an absent tool still names its command, because the waiting state always shows it', () => {
    const absent = { ...presentTool, present: false };

    expect(subscriptionToolSchema.parse(absent)).toEqual(absent);
  });

  test('a blank sign-in command is refused', () => {
    expect(() => subscriptionToolSchema.parse({ ...presentTool, signInCommand: '   ' })).toThrow();
  });

  test('a tool report carries no secret alongside the command', () => {
    expect(() => subscriptionToolSchema.parse({ ...presentTool, secret: 'sk-oops' })).toThrow();
  });
});

describe('the one plan no tool on the machine signs into', () => {
  test('Copilot names no tool, because recompose runs its flow itself', () => {
    expect(toolBacked('copilot')).toBe(false);
    expect(Object.keys(subscriptionProviders)).not.toContain('copilot');
  });

  test('every other plan reports that a tool signs it in', () => {
    for (const provider of toolBackedProviderIdSchema.options) {
      expect(toolBacked(provider), provider).toBe(true);
    }
  });

  test('every plan carries a name to read it by, tool or no tool', () => {
    for (const provider of subscriptionProviderIdSchema.options) {
      expect(subscriptionPlanNames[provider].length, provider).toBeGreaterThan(0);
    }
  });
});
