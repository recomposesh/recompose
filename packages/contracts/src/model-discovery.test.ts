import { fc, test } from '@fast-check/vitest';
import { describe, expect } from 'vitest';

import { modelAliasSchema } from './gateway-config';
import { claudeCodeKeepsModelId, claudeShapedModelId } from './model-discovery';

describe("the ids Claude Code's picker keeps out of a gateway's model list", () => {
  test('an id carrying claude anywhere is kept, not only one that opens with it', () => {
    for (const id of ['claude-fast', 'fast-claude', 'my-claude-router']) {
      expect(claudeCodeKeepsModelId(id)).toBe(true);
    }
  });

  test('an id carrying anthropic anywhere is kept as well', () => {
    for (const id of ['anthropic-fast', 'bedrock.anthropic.fast']) {
      expect(claudeCodeKeepsModelId(id)).toBe(true);
    }
  });

  test('an id carrying neither word is skipped, whatever else it reads as', () => {
    for (const id of ['fast', 'gpt-5.6-sol', 'sonnet-5', '']) {
      expect(claudeCodeKeepsModelId(id)).toBe(false);
    }
  });

  test('the reading folds case down, so an id a client sends shouted is kept too', () => {
    expect(claudeCodeKeepsModelId('CLAUDE-FAST')).toBe(true);
    expect(claudeCodeKeepsModelId('Anthropic-Fast')).toBe(true);
  });
});

describe('the id a skipped one becomes for that picker to keep it', () => {
  test('a skipped id takes the prefix that carries it into the picker', () => {
    expect(claudeShapedModelId('fast')).toBe('claude-fast');
    expect(claudeShapedModelId('gpt-5.6-sol')).toBe('claude-gpt-5.6-sol');
  });

  test('an id the picker already keeps is handed back untouched', () => {
    expect(claudeShapedModelId('claude-fast')).toBe('claude-fast');
    expect(claudeShapedModelId('fast-claude')).toBe('fast-claude');
    expect(claudeShapedModelId('anthropic-fast')).toBe('anthropic-fast');
  });

  test('an id with nothing in it shapes into nothing, never into a bare prefix', () => {
    expect(claudeShapedModelId('')).toBe('');
  });

  test('shaping an id the shaping already answered changes nothing', () => {
    expect(claudeShapedModelId(claudeShapedModelId('fast'))).toBe('claude-fast');
  });

  test('every id the shaping hands back is one the stored shape accepts', () => {
    expect(modelAliasSchema.safeParse(claudeShapedModelId('fast')).success).toBe(true);
    expect(modelAliasSchema.safeParse(claudeShapedModelId('gpt-5.6-sol')).success).toBe(true);
  });
});

const anyStoredId = fc
  .stringMatching(/^[a-z0-9][a-z0-9._-]*[a-z0-9]$/u)
  .filter((id) => modelAliasSchema.safeParse(id).success);

describe('the shaping answers every id a person can store', () => {
  test.prop([anyStoredId])('the shaped id is one the stored shape accepts', (id) => {
    expect(modelAliasSchema.safeParse(claudeShapedModelId(id)).success).toBe(true);
  });

  test.prop([anyStoredId])('the shaped id is one the picker keeps', (id) => {
    expect(claudeCodeKeepsModelId(claudeShapedModelId(id))).toBe(true);
  });

  test.prop([anyStoredId])('shaping a shaped id changes nothing', (id) => {
    const shaped = claudeShapedModelId(id);

    expect(claudeShapedModelId(shaped)).toBe(shaped);
  });
});
