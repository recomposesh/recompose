import { describe, expect, test } from 'vitest';

import { titleBarOverlayFor, titleBarOverlayPaintsOn } from './title-bar-overlay';

describe('the caption strip Windows draws over the renderer', () => {
  test('a light window gets the toolbar surface under dark symbols', () => {
    expect(titleBarOverlayFor('light')).toEqual({
      color: '#f4f4f6',
      symbolColor: '#1c1c1e',
      height: 53,
    });
  });

  test('a dark window gets the toolbar surface under light symbols', () => {
    expect(titleBarOverlayFor('dark')).toEqual({
      color: '#28282c',
      symbolColor: '#f9f9fb',
      height: 53,
    });
  });

  test('the strip stops short of the bar hairline, so the line runs the whole width', () => {
    expect(titleBarOverlayFor('light').height).toBe(53);
    expect(titleBarOverlayFor('light').height).toBe(titleBarOverlayFor('dark').height);
  });
});

describe('which platforms hold a caption strip to repaint', () => {
  test('Windows holds one', () => {
    expect(titleBarOverlayPaintsOn('win32')).toBe(true);
  });

  test('macOS and Linux hold none', () => {
    expect(titleBarOverlayPaintsOn('darwin')).toBe(false);
    expect(titleBarOverlayPaintsOn('linux')).toBe(false);
  });
});
