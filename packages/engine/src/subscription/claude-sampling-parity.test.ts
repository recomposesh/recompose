import { describe, expect, it } from 'vitest';

import { normalizedClaudeSampling } from './claude-sampling';

describe('sampling knobs crossing into native Claude', () => {
  it('should keep every knob the wire accepts while thinking is off', () => {
    expect(normalizedClaudeSampling({ temperature: 0.5, top_k: 40 })).toEqual({
      temperature: 0.5,
      top_k: 40,
    });
  });

  it('should drop top_p only where temperature stands beside it', () => {
    expect(normalizedClaudeSampling({ temperature: 0.5, top_p: 0.9 })).toEqual({
      temperature: 0.5,
    });
  });

  it('should keep a lone top_p', () => {
    expect(normalizedClaudeSampling({ top_p: 0.9 })).toEqual({ top_p: 0.9 });
  });

  it('should drop both knobs once thinking is on, which the wire rejects', () => {
    expect(
      normalizedClaudeSampling({ temperature: 0.5, top_p: 0.9, thinking: { type: 'enabled' } }),
    ).toEqual({ thinking: { type: 'enabled' } });
  });
});
