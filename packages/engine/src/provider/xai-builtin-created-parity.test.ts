import { describe, expect, it } from 'vitest';

import { xaiBuiltinCreatedAt, xaiBuiltinImageModels } from './model-metadata';

describe('the xAI builtin catalog', () => {
  it('should name when the Image 2.0 builtin was published', () => {
    expect(xaiBuiltinImageModels).toContain('grok-imagine-image-2.0');
    expect(xaiBuiltinCreatedAt('grok-imagine-image-2.0')).toBe(1_786_060_800);
  });

  it('should leave a model it never published without a stamp', () => {
    expect(xaiBuiltinCreatedAt('grok-4.5')).toBeUndefined();
  });
});
