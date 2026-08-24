import { describe, expect, test } from 'vitest';

import { updateStateSchema } from './ipc';

describe('where the running app stands against the release feed', () => {
  test('a quiet standing carries no version, because nothing is on its way', () => {
    expect(updateStateSchema.parse({ standing: 'quiet' })).toEqual({ standing: 'quiet' });
    expect(() => updateStateSchema.parse({ standing: 'quiet', version: '0.4.0' })).toThrow();
  });

  test('a download in flight and one waiting both name the version they carry', () => {
    for (const standing of ['downloading', 'ready']) {
      expect(updateStateSchema.parse({ standing, version: '0.4.0' })).toEqual({
        standing,
        version: '0.4.0',
      });
      expect(() => updateStateSchema.parse({ standing })).toThrow();
      expect(() => updateStateSchema.parse({ standing, version: '  ' })).toThrow();
    }
  });

  test('the three standings are the closed set, and a failed check is none of them', () => {
    expect(() => updateStateSchema.parse({ standing: 'failed' })).toThrow();
    expect(() => updateStateSchema.parse({ standing: '' })).toThrow();
    expect(() => updateStateSchema.parse({})).toThrow();
  });

  test('the standing is what tells the three apart, so a reading without one is refused', () => {
    expect(() => updateStateSchema.parse({ version: '0.4.0' })).toThrow();
  });
});
