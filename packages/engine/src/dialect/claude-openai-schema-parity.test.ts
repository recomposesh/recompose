import { describe, expect, it } from 'vitest';

import type { ChatCompletionsRequest } from './chat-completions-wire';
import type { ResponsesRequest } from './responses-wire';

import { translateRequest } from './dispatcher';

function fillFormFields() {
  return {
    type: 'array',
    description: 'Fields to fill in',
    items: {
      type: 'object',
      additionalProperties: false,
      required: ['target', 'name', 'type', 'value'],
      properties: {
        target: { type: 'string', description: 'Exact target element reference' },
        name: { type: 'string', description: 'Human-readable field name' },
        type: {
          type: 'string',
          description: 'Type of the field',
          enum: ['textbox', 'checkbox', 'radio', 'combobox', 'slider'],
        },
        value: { type: 'string', description: 'Value to fill in the field' },
      },
    },
  };
}

function fillFormSchema() {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    additionalProperties: false,
    required: ['fields'],
    properties: { fields: fillFormFields() },
  };
}

function nullableNoteSchema() {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    additionalProperties: false,
    properties: { note: { type: ['string', 'null'] } },
  };
}

function claudeRequestWith(schema: Record<string, unknown>) {
  return {
    max_tokens: 1024,
    messages: [{ role: 'user' as const, content: 'fill the form' }],
    tools: [{ name: 'mcp__playwright__browser_fill_form', input_schema: schema }],
  };
}

function responsesToolParameters(schema: Record<string, unknown>): unknown {
  const translated = translateRequest('anthropic', 'responses', claudeRequestWith(schema));

  if ('outcome' in translated || 'refusal' in translated) throw new Error('expected a request');

  return firstFunctionTool(translated.value).parameters;
}

function firstFunctionTool(request: ResponsesRequest) {
  const tool = request.tools?.[0];

  if (tool?.type !== 'function') throw new Error('expected a function tool');

  return tool;
}

function chatToolParameters(schema: Record<string, unknown>): unknown {
  const translated = translateRequest('anthropic', 'chat-completions', claudeRequestWith(schema));

  if ('outcome' in translated || 'refusal' in translated) throw new Error('expected a request');

  return firstChatFunction(translated.value).parameters;
}

function firstChatFunction(request: ChatCompletionsRequest) {
  const tool = request.tools?.[0];

  if (tool?.type !== 'function') throw new Error('expected a function tool');

  return tool.function;
}

describe('Claude Code tool schemas crossing an OpenAI target', () => {
  it('should carry a property named type into the Responses dialect as a schema', () => {
    expect(responsesToolParameters(fillFormSchema())).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['fields'],
      properties: { fields: fillFormFields() },
    });
  });

  it('should carry a property named type into the Chat Completions dialect as a schema', () => {
    expect(chatToolParameters(fillFormSchema())).toMatchObject({
      properties: { fields: fillFormFields() },
    });
  });

  it('should leave no stringified schema node in the encoded Responses tool', () => {
    expect(JSON.stringify(responsesToolParameters(fillFormSchema()))).not.toContain(
      '[object Object]',
    );
  });

  it('should carry a nullable type union into the Responses dialect unchanged', () => {
    expect(responsesToolParameters(nullableNoteSchema())).toEqual({
      type: 'object',
      additionalProperties: false,
      properties: { note: { type: ['string', 'null'] } },
    });
  });
});
