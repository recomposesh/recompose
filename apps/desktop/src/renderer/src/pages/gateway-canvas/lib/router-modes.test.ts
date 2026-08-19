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

test('the conditional sentence names the judge and where an unplaced request lands', () => {
  expect(modeSentences.conditional).toContain('judge');
  expect(modeSentences.conditional).toContain('else');
});

test('re-judging every request names what it costs the prompt cache', () => {
  expect(rejudgeSentences['every-request']).toContain('prompt cache');
});

test('re-judging every request still says a server-state turn keeps its branch', () => {
  expect(rejudgeSentences['every-request']).toContain('server-held state');
});

test('a conversation that keeps its branch says the prompt cache is what it keeps', () => {
  expect(rejudgeSentences['once-per-conversation']).toContain('prompt cache');
});

test('a conversation that keeps its branch says a server-state turn never moves it', () => {
  expect(rejudgeSentences['once-per-conversation']).toContain('server-held state');
});

test('neither rhythm reads as the other, so the toggle says something when it moves', () => {
  expect(rejudgeSentences['every-request']).not.toBe(rejudgeSentences['once-per-conversation']);
});
