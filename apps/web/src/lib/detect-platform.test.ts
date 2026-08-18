import { describe, expect, it } from 'vitest';

import { detectPlatform } from './detect-platform';

const safariOnMac =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
const chromeOnWindows =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const firefoxOnUbuntu =
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0';

describe('the download page reads the visitor platform from the browser', () => {
  it('recognizes a Mac, even when Safari hides the architecture', () => {
    expect(detectPlatform(safariOnMac)).toBe('mac');
  });

  it('recognizes Windows', () => {
    expect(detectPlatform(chromeOnWindows)).toBe('windows');
  });

  it('recognizes Linux', () => {
    expect(detectPlatform(firefoxOnUbuntu)).toBe('linux');
  });

  it('sends an iPhone to the Mac block, the closest desktop it maps to', () => {
    expect(
      detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15'),
    ).toBe('mac');
  });

  it('sends Android to the Linux block', () => {
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36')).toBe(
      'linux',
    );
  });

  it('falls back to the Mac block when the browser says nothing it knows', () => {
    expect(detectPlatform('')).toBe('mac');
    expect(detectPlatform('curl/8.6.0')).toBe('mac');
  });
});
