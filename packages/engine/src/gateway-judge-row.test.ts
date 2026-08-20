import type { LogRow } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import type { JudgeNote } from './provider/judge-call';

import { collectingRows } from './gateway-logs.testkit';
import { noteJudgeRow } from './gateway-traffic';
import { servingTurn, withinServingTurn } from './provider/serving-turn';

const A_CLIENT_KEY = `sha256:${'a1b2c3d4'.repeat(8)}`;

const A_JUDGE_ANSWERED: JudgeNote = {
  provider: 'anthropic',
  providerModel: 'claude-sonnet-4-5',
  accountId: 'plan-1',
  status: 200,
  durationMs: 180,
};

function servingCodex() {
  return { gateway: 'codex', clientKey: A_CLIENT_KEY, method: 'POST', rowPublished: false };
}

function rowsWhileServing(noting: () => void): LogRow[] {
  const collected = collectingRows();

  withinServingTurn({ ...servingCodex(), virtualModel: 'fast' }, noting);
  collected.forget();

  return collected.standing();
}

describe('the row one classification call leaves in the drawer', () => {
  test('the row reads judge, then the model the judge was asked on', () => {
    const rows = rowsWhileServing(() => {
      noteJudgeRow(A_JUDGE_ANSWERED);
    });

    expect(rows.at(0)).toMatchObject({
      virtualModel: 'judge',
      providerModel: 'claude-sonnet-4-5',
    });
  });

  test('the row carries the status and the wait a person opened the drawer to read', () => {
    const rows = rowsWhileServing(() => {
      noteJudgeRow(A_JUDGE_ANSWERED);
    });

    expect(rows.at(0)).toMatchObject({ status: 200, durationMs: 180, provider: 'anthropic' });
  });

  test('a judge row belongs to the gateway that was serving, under that turn’s own key', () => {
    const rows = rowsWhileServing(() => {
      noteJudgeRow(A_JUDGE_ANSWERED);
    });

    expect(rows.at(0)).toMatchObject({ gateway: 'codex', clientKey: A_CLIENT_KEY });
  });

  test('the sentence a silent judge earns rides the row', () => {
    const rows = rowsWhileServing(() => {
      noteJudgeRow({
        ...A_JUDGE_ANSWERED,
        status: 504,
        failure: 'The judge did not answer inside its budget.',
      });
    });

    expect(rows.at(0)).toMatchObject({
      status: 504,
      failure: 'The judge did not answer inside its budget.',
    });
  });

  test('a judge row never stands in for how the turn itself ended', () => {
    const turn = { ...servingCodex(), virtualModel: 'fast' };

    withinServingTurn(turn, () => {
      noteJudgeRow(A_JUDGE_ANSWERED);
    });

    expect(turn.rowPublished).toBe(false);
  });

  test('a classification outside any serving turn belongs to no gateway, so it leaves no row', () => {
    const collected = collectingRows();

    noteJudgeRow(A_JUDGE_ANSWERED);
    collected.forget();

    expect(collected.standing()).toEqual([]);
    expect(servingTurn()).toBeUndefined();
  });
});
