import { describe, expect, it } from 'vitest';

import { normalizeResponsesExtensions } from './responses-extended-tools';

describe('a custom tool output that arrived as an encoded string', () => {
  it('should unwrap an image the caller stringified', () => {
    const normalized = normalizeResponsesExtensions(requestWith(JSON.stringify(anImage())));

    expect(outputOf(normalized)).toEqual([anImage()]);
  });

  it('should leave plain text alone', () => {
    const normalized = normalizeResponsesExtensions(requestWith('/workspace'));

    expect(outputOf(normalized)).toBe('/workspace');
  });

  it('should leave a string that only looks like JSON alone', () => {
    const normalized = normalizeResponsesExtensions(requestWith('{not json'));

    expect(outputOf(normalized)).toBe('{not json');
  });
});

function anImage() {
  return { type: 'input_image', image_url: 'data:image/png;base64,iVBORw0KGgo=' };
}

function requestWith(output: string) {
  return {
    input: [{ type: 'custom_tool_call_output' as const, call_id: 'call_1', output }],
  };
}

function outputOf(request: { input: readonly unknown[] }): unknown {
  const item = request.input.at(0);

  return item !== null && typeof item === 'object' && 'output' in item ? item.output : undefined;
}
