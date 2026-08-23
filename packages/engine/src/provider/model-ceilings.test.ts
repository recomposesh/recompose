import { afterEach, describe, expect, test } from 'vitest';

import { urlOf } from '../asked-url.testkit';
import { forgetModelCeilings, modelCeilingsFor } from './model-ceilings';

const catalog = {
  object: 'list',
  data: [
    { id: 'qwen/qwen3.6-27b', context_window: 131_072, max_completion_tokens: 16_384 },
    { id: 'groq/compound', context_window: 131_072, max_completion_tokens: 8_192 },
    { id: 'nothing/stated', context_window: 131_072 },
  ],
};

function catalogAnswering(answer: () => Response) {
  const asked: string[] = [];
  const fetchLike: typeof fetch = async (input) => {
    asked.push(urlOf(input));

    return Promise.resolve(answer());
  };

  return { asked, fetchLike };
}

afterEach(() => {
  forgetModelCeilings();
});

describe('the ceilings one vendor states', () => {
  test('come off the catalog it publishes, per model', async () => {
    const { asked, fetchLike } = catalogAnswering(() => Response.json(catalog));

    const ceilings = await modelCeilingsFor(fetchLike, 'groq', 'https://api.groq.com/openai', {});

    expect(asked).toEqual(['https://api.groq.com/openai/v1/models']);
    expect(ceilings.get('qwen/qwen3.6-27b')).toBe(16_384);
    expect(ceilings.get('groq/compound')).toBe(8_192);
  });

  test('a model stating none is absent rather than capped at nothing', async () => {
    const { fetchLike } = catalogAnswering(() => Response.json(catalog));

    const ceilings = await modelCeilingsFor(fetchLike, 'groq', 'https://api.groq.com/openai', {});

    expect(ceilings.get('nothing/stated')).toBeUndefined();
  });

  test('the catalog is read once and reused for every turn after', async () => {
    const { asked, fetchLike } = catalogAnswering(() => Response.json(catalog));

    await modelCeilingsFor(fetchLike, 'groq', 'https://api.groq.com/openai', {});
    await modelCeilingsFor(fetchLike, 'groq', 'https://api.groq.com/openai', {});
    await modelCeilingsFor(fetchLike, 'groq', 'https://api.groq.com/openai', {});

    expect(asked).toHaveLength(1);
  });

  test('two turns arriving together read the catalog once between them', async () => {
    const { asked, fetchLike } = catalogAnswering(() => Response.json(catalog));

    await Promise.all([
      modelCeilingsFor(fetchLike, 'groq', 'https://api.groq.com/openai', {}),
      modelCeilingsFor(fetchLike, 'groq', 'https://api.groq.com/openai', {}),
    ]);

    expect(asked).toHaveLength(1);
  });

  test('a vendor that clamps rather than refusing is never asked at all', async () => {
    const { asked, fetchLike } = catalogAnswering(() => Response.json(catalog));

    const ceilings = await modelCeilingsFor(fetchLike, 'together', 'https://api.together.ai', {});

    expect(asked).toEqual([]);
    expect(ceilings.size).toBe(0);
  });

  test('Gemini states its ceiling under its own name, and the catalog under its own key', async () => {
    const { fetchLike } = catalogAnswering(() =>
      Response.json({ models: [{ name: 'models/gemini-3.5-flash', outputTokenLimit: 65_536 }] }),
    );

    const ceilings = await modelCeilingsFor(
      fetchLike,
      'gemini',
      'https://generativelanguage.googleapis.com',
      {},
    );

    expect(ceilings.get('gemini-3.5-flash')).toBe(65_536);
  });
});

describe('a catalog the vendor would not give up', () => {
  test('a catalog that refused leaves every turn uncapped rather than refusing it', async () => {
    const { fetchLike } = catalogAnswering(() => new Response('{}', { status: 401 }));

    const ceilings = await modelCeilingsFor(fetchLike, 'groq', 'https://api.groq.com/openai', {});

    expect(ceilings.size).toBe(0);
  });

  test('a vendor that is down is not asked again on the next turn', async () => {
    const { asked, fetchLike } = catalogAnswering(() => {
      throw new TypeError('fetch failed');
    });

    await modelCeilingsFor(fetchLike, 'groq', 'https://api.groq.com/openai', {});
    await modelCeilingsFor(fetchLike, 'groq', 'https://api.groq.com/openai', {});

    expect(asked).toHaveLength(1);
  });

  test('two vendors keep their catalogs apart', async () => {
    const { asked, fetchLike } = catalogAnswering(() => Response.json(catalog));

    await modelCeilingsFor(fetchLike, 'groq', 'https://api.groq.com/openai', {});
    await modelCeilingsFor(fetchLike, 'gemini', 'https://generativelanguage.googleapis.com', {});

    expect(asked).toEqual([
      'https://api.groq.com/openai/v1/models',
      'https://generativelanguage.googleapis.com/v1beta/models',
    ]);
  });
});
