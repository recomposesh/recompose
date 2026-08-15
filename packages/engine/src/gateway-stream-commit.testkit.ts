import type { Crossing } from './gateway-wire';

export const FIRST_TEXT = 'data: {"type":"message_start","message":{"id":"msg_1"}}\n\n';

export const MESSAGE_STOP = 'data: {"type":"message_stop"}\n\n';

export function aCrossing(): Crossing {
  return {
    dialect: 'anthropic',
    raw: {},
    gatewayName: 'Codex',
    virtualModel: 'fast',
    providerModel: 'gpt-5-mini',
  };
}

export function anEventStream(body: ReadableStream<Uint8Array>, status = 200): Response {
  return new Response(body, { status, headers: { 'content-type': 'text/event-stream' } });
}

export function streamOf(text: string): ReadableStream<Uint8Array> {
  return new Response(text).body ?? new ReadableStream<Uint8Array>();
}

export function textOf(step: { value?: Uint8Array | undefined }): string {
  return step.value === undefined ? '' : new TextDecoder().decode(step.value);
}
