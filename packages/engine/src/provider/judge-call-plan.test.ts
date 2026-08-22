import { describe, expect, test } from 'vitest';

import { readingOfTheJudge } from './judge-call';
import { A_PLAN_JUDGE, answering, NOW } from './judge-call.testkit';

function aPlanJudgeThatNeverAnswers() {
  return answering(
    async () =>
      new Promise<Response>(() => {
        return;
      }),
    A_PLAN_JUDGE,
  );
}

describe('a judge bound to a person’s own plan', () => {
  const namingABranch = () =>
    Response.json({
      content: [{ type: 'tool_use', name: 'pick_branch', input: { branch: 'code' } }],
    });

  test('a plan judge names a branch rather than landing every request on else', async () => {
    const watched = answering(namingABranch, A_PLAN_JUDGE);

    await expect(readingOfTheJudge(watched.ask)).resolves.toEqual({
      heard: 'answer',
      label: 'code',
    });
  });

  test('the classification leaves on the plan’s own channel rather than as a keyed request', async () => {
    const watched = answering(namingABranch, A_PLAN_JUDGE);

    await readingOfTheJudge(watched.ask);

    expect(watched.sentTo).toEqual(['anthropic:plan-1']);
  });

  test('the ask a plan judge receives still closes its answer to the branch labels', async () => {
    const watched = answering(namingABranch, A_PLAN_JUDGE);

    await readingOfTheJudge(watched.ask);

    const asked: unknown = JSON.parse(watched.bodies.at(0) ?? '{}');

    expect(asked).toMatchObject({
      tool_choice: { type: 'tool', name: 'pick_branch' },
      tools: [{ input_schema: { properties: { branch: { enum: ['code', 'chat'] } } } }],
    });
  });

  test('a plan judge that never answers reads as a silence past the budget', async () => {
    const watched = aPlanJudgeThatNeverAnswers();

    await expect(readingOfTheJudge({ ...watched.ask, boundMs: 20 })).resolves.toEqual({
      heard: 'timeout',
    });
  });

  test('the plan request itself is cut off, not merely stopped waiting for', async () => {
    const watched = aPlanJudgeThatNeverAnswers();

    await readingOfTheJudge({ ...watched.ask, boundMs: 20 });

    expect(watched.aborted()).toBe(true);
  });

  test('a plan judge that refused stands down like any other refusal', async () => {
    const watched = answering(() => new Response('{}', { status: 429 }), A_PLAN_JUDGE);

    await expect(readingOfTheJudge(watched.ask)).resolves.toEqual({ heard: 'refusal' });
    expect(watched.cooled).toEqual([{ coolUntilMs: NOW + 60_000 }]);
  });
});
