import { expect, test } from 'vitest';

import { modelListReading, servesPreview } from './model-draft';

test('a look that answered a list offers those ids and refuses nothing', () => {
  const answer = { standing: 'listed', models: [{ id: 'claude-sonnet-5' }] } as const;

  expect(modelListReading(answer)).toEqual({
    offered: ['claude-sonnet-5'],
    refusal: undefined,
  });
});

test('a model going away is still offered, because the sheet lets a person pick it', () => {
  const answer = {
    standing: 'listed',
    models: [{ id: 'gpt-5-pro', shutdownDate: '2026-12-11' }, { id: 'gpt-5.6-sol' }],
  } as const;

  expect(modelListReading(answer)).toEqual({
    offered: ['gpt-5-pro', 'gpt-5.6-sol'],
    refusal: undefined,
  });
});

test('a look that reached nothing offers no id and carries the refusal it answered', () => {
  const answer = { standing: 'unlisted', refusal: 'nothing answered' } as const;

  expect(modelListReading(answer)).toEqual({ offered: [], refusal: 'nothing answered' });
});

test('a look still out offers no id and refuses nothing, because it has said nothing yet', () => {
  expect(modelListReading(undefined)).toEqual({ offered: [], refusal: undefined });
});

test('a settled draft previews the whole binding a client will reach', () => {
  const preview = servesPreview({
    id: 'fast',
    target: 'work',
    providerModel: 'claude-haiku-4-5',
  });

  expect(preview).toBe('serves as fast → work · claude-haiku-4-5');
});

test('a draft still missing its model previews nothing, because the binding is half said', () => {
  expect(servesPreview({ id: 'fast', target: 'work', providerModel: '' })).toBeUndefined();
});

test('a draft still missing its target previews nothing', () => {
  expect(
    servesPreview({ id: 'fast', target: undefined, providerModel: 'claude-haiku-4-5' }),
  ).toBeUndefined();
});

test('a draft whose id is not yet said previews nothing, because no id stands for it', () => {
  expect(
    servesPreview({ id: '', target: 'work', providerModel: 'claude-haiku-4-5' }),
  ).toBeUndefined();
});
