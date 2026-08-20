import { compiledJudgePrompt } from '@recompose/contracts';
import { describe, expect, test } from 'vitest';

import type { BranchRule } from '../routing/policies';
import type { JudgeQuestion } from './judge-request';

import { judgeRequestBody } from './judge-request';

const BRANCHES: readonly BranchRule[] = [
  { label: 'code', rule: 'asks to write or change code', child: 'coder' },
  { label: 'chat', rule: 'small talk and questions', child: 'talker' },
];

const INSTRUCTIONS = compiledJudgePrompt({ branches: BRANCHES });

const TAIL = '<request>\nrename this function\n</request>';

const ENUM_SCHEMA = {
  type: 'object',
  properties: { branch: { type: 'string', enum: ['code', 'chat'] } },
  required: ['branch'],
  additionalProperties: false,
};

const JSON_SCHEMA_FORMAT = {
  type: 'json_schema',
  json_schema: { name: 'branch', strict: true, schema: ENUM_SCHEMA },
};

function asking(overrides: Partial<JudgeQuestion> = {}): JudgeQuestion {
  return {
    dialect: 'chat-completions',
    providerModel: 'gpt-5-mini',
    branches: BRANCHES,
    raw: { model: 'fast', messages: [{ role: 'user', content: 'rename this function' }] },
    ...overrides,
  };
}

describe('the whole request each dialect sends its judge', () => {
  test('a chat-completions judge reads the brief as system and the tail as the caller', () => {
    expect(judgeRequestBody(asking())).toEqual({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: INSTRUCTIONS },
        { role: 'user', content: TAIL },
      ],
      response_format: JSON_SCHEMA_FORMAT,
    });
  });

  test('a responses judge reads the brief as instructions beside the tail as input', () => {
    expect(judgeRequestBody(asking({ dialect: 'responses' }))).toEqual({
      model: 'gpt-5-mini',
      instructions: INSTRUCTIONS,
      input: TAIL,
      text: { format: { type: 'json_schema', name: 'branch', strict: true, schema: ENUM_SCHEMA } },
    });
  });

  test('an interactions judge carries the brief in its own instruction field', () => {
    expect(judgeRequestBody(asking({ dialect: 'interactions' }))).toEqual({
      model: 'gpt-5-mini',
      system_instruction: INSTRUCTIONS,
      input: TAIL,
      response_format: JSON_SCHEMA_FORMAT,
    });
  });
});

describe('the whole request the two dialects with their own answer modes send', () => {
  test('a gemini judge carries the tail as one caller turn beside its own enum mode', () => {
    expect(judgeRequestBody(asking({ dialect: 'gemini' }))).toEqual({
      contents: [{ role: 'user', parts: [{ text: TAIL }] }],
      systemInstruction: { parts: [{ text: INSTRUCTIONS }] },
      generationConfig: {
        responseMimeType: 'text/x.enum',
        responseSchema: { type: 'STRING', enum: ['code', 'chat'] },
      },
    });
  });

  test('an anthropic judge is handed one tool it has no choice but to call', () => {
    const question = asking({ dialect: 'anthropic', providerModel: 'claude-haiku-4-5' });

    expect(judgeRequestBody(question)).toEqual({
      model: 'claude-haiku-4-5',
      max_tokens: 1_024,
      system: INSTRUCTIONS,
      messages: [{ role: 'user', content: TAIL }],
      tools: [
        {
          name: 'pick_branch',
          description: 'Name the one branch this request belongs to.',
          input_schema: ENUM_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: 'pick_branch' },
    });
  });
});

describe('the words the enum offers a judge', () => {
  test('a label stored with stray spacing reaches the enum trimmed, as the prompt lists it', () => {
    const spaced = [{ label: '  code  ', rule: 'asks to write or change code', child: 'coder' }];
    const body = judgeRequestBody(asking({ dialect: 'gemini', branches: spaced }));

    expect(body['generationConfig']).toEqual({
      responseMimeType: 'text/x.enum',
      responseSchema: { type: 'STRING', enum: ['code'] },
    });
  });
});
