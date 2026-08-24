import { describe, expect, test } from 'vitest';

import { windowControlsFor } from './window-controls';

describe('which edge a platform takes for its window controls', () => {
  test('macOS takes the leading edge, where the traffic lights float', () => {
    expect(windowControlsFor('darwin')).toBe('leading');
  });

  test('Windows takes the trailing edge, where the caption buttons stand', () => {
    expect(windowControlsFor('win32')).toBe('trailing');
  });

  test('a platform whose own title bar carries them takes neither', () => {
    expect(windowControlsFor('linux')).toBe('none');
    expect(windowControlsFor('freebsd')).toBe('none');
  });
});
