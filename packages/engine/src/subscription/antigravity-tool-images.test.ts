import { describe, expect, test } from 'vitest';

import { antigravityToolImagesNested } from './antigravity-tool-images';

function turnOf(parts: readonly unknown[]) {
  return { contents: [{ role: 'user', parts }] };
}

const answer = (name: string) => ({ functionResponse: { name, response: { result: 'ok' } } });
const shot = (data: string, mimeType?: string) => ({
  inlineData: { data, ...(mimeType === undefined ? {} : { mimeType }) },
});

function partsOf(body: Record<string, unknown>): unknown {
  const contents: unknown = body['contents'];
  const turns: unknown[] = Array.isArray(contents) ? contents : [];
  const first: unknown = turns[0];

  return typeof first === 'object' && first !== null ? Reflect.get(first, 'parts') : undefined;
}

describe('an image standing beside the tool answer it belongs to', () => {
  test('moves inside that answer, since the assistant reads no sibling image', () => {
    const nested = antigravityToolImagesNested(turnOf([answer('shot'), shot('AAA', 'image/jpeg')]));

    expect(partsOf(nested)).toEqual([
      {
        functionResponse: {
          name: 'shot',
          response: { result: 'ok' },
          parts: [{ inlineData: { mimeType: 'image/jpeg', data: 'AAA' } }],
        },
      },
    ]);
  });

  test('binds to the nearest answer before it rather than the last one in the turn', () => {
    const nested = antigravityToolImagesNested(
      turnOf([answer('first'), shot('AAA'), answer('second'), shot('BBB')]),
    );

    expect(partsOf(nested)).toEqual([
      {
        functionResponse: {
          name: 'first',
          response: { result: 'ok' },
          parts: [{ inlineData: { mimeType: 'image/png', data: 'AAA' } }],
        },
      },
      {
        functionResponse: {
          name: 'second',
          response: { result: 'ok' },
          parts: [{ inlineData: { mimeType: 'image/png', data: 'BBB' } }],
        },
      },
    ]);
  });

  test('an image standing before every answer joins the first one', () => {
    const nested = antigravityToolImagesNested(turnOf([shot('AAA'), answer('only')]));

    expect(partsOf(nested)).toEqual([
      {
        functionResponse: {
          name: 'only',
          response: { result: 'ok' },
          parts: [{ inlineData: { mimeType: 'image/png', data: 'AAA' } }],
        },
      },
    ]);
  });
});

describe('a turn with nothing to nest', () => {
  test('a turn holding no tool answer is left exactly as it stands', () => {
    const body = turnOf([{ text: 'hello' }, shot('AAA')]);

    expect(antigravityToolImagesNested(body)).toBe(body);
  });
});
