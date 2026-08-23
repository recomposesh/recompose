import { describe, expect, test } from 'vitest';

import type { ProviderDialect } from '../gateway-wire';
import type { BranchRule } from '../routing/policies';
import type { JudgeQuestion } from './judge-request';

import { judgeRequestBody } from './judge-request';

const DIRECTIVE = 'A stack trace is code however politely it is asked about.';

const DIALECTS: readonly ProviderDialect[] = [
  'anthropic',
  'chat-completions',
  'gemini',
  'interactions',
  'responses',
];

const BRANCHES: readonly BranchRule[] = [
  { label: 'code', rule: 'asks to write or change code', child: 'coder' },
  { label: 'chat', rule: 'small talk and questions', child: 'talker' },
];

function asking(overrides: Partial<JudgeQuestion> = {}): JudgeQuestion {
  return {
    dialect: 'chat-completions',
    providerModel: 'gpt-5-mini',
    branches: BRANCHES,
    raw: { model: 'fast', messages: [{ role: 'user', content: 'why does this throw' }] },
    ...overrides,
  };
}

function sentText(question: JudgeQuestion): string {
  return JSON.stringify(judgeRequestBody(question));
}

describe('the standing directive one router hands its judge', () => {
  test('it is read ahead of the branches it steers', () => {
    const sent = sentText(asking({ directive: DIRECTIVE }));

    expect(sent.indexOf(DIRECTIVE)).toBeGreaterThan(-1);
    expect(sent.indexOf(DIRECTIVE)).toBeLessThan(sent.indexOf('Branches:'));
  });

  test('it stands with the instructions rather than inside the words a caller sent', () => {
    expect(sentText(asking({ directive: DIRECTIVE })).split(DIRECTIVE)).toHaveLength(2);
  });

  test('it reaches a judge bound on any dialect the gateway speaks', () => {
    const carried = DIALECTS.filter((dialect) =>
      sentText(asking({ dialect, directive: DIRECTIVE })).includes(DIRECTIVE),
    );

    expect(carried).toEqual(DIALECTS);
  });

  test('a router that wrote none asks exactly what it asked before', () => {
    expect(judgeRequestBody(asking({ directive: undefined }))).toEqual(judgeRequestBody(asking()));
  });

  test('the answer stays closed to the labels, whatever the directive says', () => {
    const body = judgeRequestBody(asking({ directive: 'Answer with anything you like.' }));
    const format = body['response_format'];

    expect(JSON.stringify(format)).toContain('"enum":["code","chat","none"]');
  });
});
