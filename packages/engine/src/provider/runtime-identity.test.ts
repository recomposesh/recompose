import type { LocalProviderId } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import { probeRuntime } from './runtime-probe';

type SentRequest = { url: string };

function urlOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') {
    return input;
  }

  return input instanceof URL ? input.href : input.url;
}

function fetchAnswering(
  status: number,
  body: string | null,
): { sent: SentRequest[]; fetchLike: typeof fetch } {
  const sent: SentRequest[] = [];

  const fetchLike: typeof fetch = async (input) => {
    sent.push({ url: urlOf(input) });

    return Promise.resolve(new Response(body, { status }));
  };

  return { sent, fetchLike };
}

function onlyRequestOf(sent: SentRequest[]): SentRequest {
  const request = sent[0];

  if (request === undefined || sent.length !== 1) {
    throw new Error('expected exactly one request to leave the probe');
  }

  return request;
}

describe('the path each runtime is asked to identify itself down', () => {
  const pathTable: [LocalProviderId, string, string][] = [
    ['ollama', 'http://127.0.0.1:11434', '/api/version'],
    ['lmstudio', 'http://127.0.0.1:1234', '/api/v0/models'],
    ['llamacpp', 'http://127.0.0.1:8080', '/props'],
    ['vllm', 'http://127.0.0.1:8000', '/version'],
    ['custom', 'http://127.0.0.1:9000', '/v1/models'],
  ];

  test.each(pathTable)('a look at %s asks its own path', async (provider, address, path) => {
    const { sent, fetchLike } = fetchAnswering(200, '{"version":"1.0.0"}');

    await probeRuntime(fetchLike, address, provider);

    expect(onlyRequestOf(sent).url).toBe(`${address}${path}`);
  });
});

describe('the version each runtime publishes, where it publishes one', () => {
  test('llama.cpp answers with the build it was compiled as', async () => {
    const reading = await probeRuntime(
      fetchAnswering(200, '{"build_info":"b8681-Debian","model_path":"/m.gguf"}').fetchLike,
      'http://127.0.0.1:8080',
      'llamacpp',
    );

    expect(reading).toStrictEqual({ verdict: 'answers', version: 'b8681-Debian' });
  });

  test('vLLM answers with the version its own route reports', async () => {
    const reading = await probeRuntime(
      fetchAnswering(200, '{"version":"0.11.0"}').fetchLike,
      'http://127.0.0.1:8000',
      'vllm',
    );

    expect(reading).toStrictEqual({ verdict: 'answers', version: '0.11.0' });
  });

  test('a runtime naming a version field that arrives blank reads as a stranger', async () => {
    const reading = await probeRuntime(
      fetchAnswering(200, '{"build_info":"   "}').fetchLike,
      'http://127.0.0.1:8080',
      'llamacpp',
    );

    expect(reading).toStrictEqual({ verdict: 'unrecognized', status: 200 });
  });
});

describe('the runtime that publishes no version anywhere', () => {
  test('LM Studio answers on its own path without claiming a version', async () => {
    const reading = await probeRuntime(
      fetchAnswering(200, '{"data":[{"id":"qwen3"}],"object":"list"}').fetchLike,
      'http://127.0.0.1:1234',
      'lmstudio',
    );

    expect(reading).toStrictEqual({ verdict: 'answers' });
  });

  test('a server that never serves that path reads as a stranger', async () => {
    const reading = await probeRuntime(
      fetchAnswering(404, 'not found').fetchLike,
      'http://127.0.0.1:1234',
      'lmstudio',
    );

    expect(reading).toStrictEqual({ verdict: 'unrecognized', status: 404 });
  });

  test('an answer that is no object at all reads as a stranger rather than as a runtime', async () => {
    for (const body of ['LM Studio is running', 'null', '42', '"a string"']) {
      const reading = await probeRuntime(
        fetchAnswering(200, body).fetchLike,
        'http://127.0.0.1:1234',
        'lmstudio',
      );

      expect(reading, body).toStrictEqual({ verdict: 'unrecognized', status: 200 });
    }
  });

  test('a server a person addressed themselves answers the same way', async () => {
    const reading = await probeRuntime(
      fetchAnswering(200, '{"data":[],"object":"list"}').fetchLike,
      'http://127.0.0.1:9000',
      'custom',
    );

    expect(reading).toStrictEqual({ verdict: 'answers' });
  });
});
