import { describe, expect, it } from 'vitest';

import { codexImageJsonResponse, codexImageStreamResponse } from './codex-image-response';

describe('an image stream that carries an upstream error', () => {
  it('should answer with the reason upstream gave rather than a flat sentence', async () => {
    const answer = await codexImageJsonResponse(streamOf(errorEvent()), 'b64_json');
    const body = await answer.json();

    expect(answer.status).toBe(400);
    expect(body).toHaveProperty('error.message', 'prompt was rejected by the safety system');
  });

  it('should prefer a buffered error when the channel closes without completing', async () => {
    const answer = await codexImageJsonResponse(
      streamOf(`data: {"type":"response.in_progress"}`, errorEvent()),
      'b64_json',
    );

    expect(answer.status).toBe(400);
    await expect(answer.json()).resolves.toHaveProperty(
      'error.message',
      'prompt was rejected by the safety system',
    );
  });

  it('should keep the flat refusal when the channel closes with nothing to report', async () => {
    const answer = await codexImageJsonResponse(
      streamOf(`data: {"type":"response.created"}`),
      'b64_json',
    );

    expect(answer.status).toBe(502);
    await expect(answer.json()).resolves.toHaveProperty(
      'error.message',
      'upstream did not return image output',
    );
  });

  it('should stop a streamed answer at the error rather than running to the end', async () => {
    const answer = codexImageStreamResponse(streamOf(errorEvent()), 'image', 'b64_json');
    const text = await answer.text();

    expect(text).toContain('prompt was rejected by the safety system');
    expect(text).toContain('error');
  });

  it('should never leak an upstream diagnostic into the error it hands the caller', async () => {
    const answer = await codexImageJsonResponse(streamOf(diagnosticErrorEvent()), 'b64_json');
    const body = await answer.json();

    expect(body).toHaveProperty('error.message', 'the upstream request failed');
    expect(JSON.stringify(body)).not.toContain('internal-trace-9f2a');
  });
});

function errorEvent(): string {
  return `data: {"type":"response.failed","response":{"error":{"message":"prompt was rejected by the safety system","code":"content_policy"}}}`;
}

function diagnosticErrorEvent(): string {
  return `data: {"type":"response.failed","response":{"error":{"internal_trace":"internal-trace-9f2a"}}}`;
}

function streamOf(...lines: readonly string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) controller.enqueue(new TextEncoder().encode(`${line}\n\n`));
      controller.close();
    },
  });

  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}
