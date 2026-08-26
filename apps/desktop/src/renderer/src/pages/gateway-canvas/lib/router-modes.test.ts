import { nameOfRouterMode } from '@recompose/contracts';
import { expect, test } from 'vitest';

import { modeOptions, modeSentences, rejudgeSentences } from './router-modes';

test('the strip offers every mode a router spreads by, so no mode hides from the choice', () => {
  expect(modeOptions.map((option) => option.value).toSorted()).toEqual(
    Object.keys(modeSentences).toSorted(),
  );
});

test('each option reads as the name the contracts give that mode', () => {
  for (const option of modeOptions) {
    expect(option.label).toBe(nameOfRouterMode(option.value));
  }
});

test('no mode a person picks carries the pill glyph in the word it answers to', () => {
  for (const option of modeOptions) {
    expect(option.label).not.toContain('?');
  }
});

test('every mode leads with a mark, and no two modes lead with the same one', () => {
  const marks = modeOptions.map((option) => option.glyph);

  expect(new Set(marks).size).toBe(modeOptions.length);
});

test('the conditional mode leads with the mark its own card already wears', () => {
  expect(modeOptions.find((option) => option.value === 'conditional')?.glyph).toBe('branch');
});

test('the conditional sentence names the judge and where an unplaced request lands', () => {
  expect(modeSentences.conditional).toContain('judge');
  expect(modeSentences.conditional).toContain('else');
});

test('each rhythm says what it does in one plain sentence', () => {
  for (const said of Object.values(rejudgeSentences)) {
    expect(said.endsWith('.')).toBe(true);
    expect(said.split('.').filter((part) => part.trim() !== '')).toHaveLength(1);
  }
});

test('each rhythm keeps the server-state turn to a clause rather than a sentence of its own', () => {
  for (const said of Object.values(rejudgeSentences)) {
    expect(said).toContain('server-held state');
    expect(said).toContain(', ');
  }
});

test('re-judging every request says the judge reads every one of them', () => {
  expect(rejudgeSentences['every-request']).toContain('every request');
});

test('re-judging every request promises no exception, because the toggle overrides the sealed turn', () => {
  expect(rejudgeSentences['every-request']).not.toContain('unless');
  expect(rejudgeSentences['every-request']).toContain('including');
});

test('a conversation that keeps its branch says it stays on the one it earned', () => {
  expect(rejudgeSentences['once-per-conversation']).toContain('first earned');
});

test('neither rhythm reads as the other, so the toggle says something when it moves', () => {
  expect(rejudgeSentences['every-request']).not.toBe(rejudgeSentences['once-per-conversation']);
});
