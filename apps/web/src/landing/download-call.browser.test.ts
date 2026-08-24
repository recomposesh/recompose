import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import type { Platform } from '../lib/detect-platform';

import { DownloadCall } from './download-call';

const roots: Root[] = [];

const mountCall = async (platform: Platform) => {
  const host = document.createElement('div');

  document.body.append(host);

  const root = createRoot(host);

  roots.push(root);
  root.render(createElement(DownloadCall, { platform }));

  await new Promise<void>((resolve) => {
    setTimeout(resolve, 50);
  });

  return host;
};

afterEach(() => {
  while (roots.length > 0) roots.pop()?.unmount();

  document.body.replaceChildren();
});

describe('the download call the landing shows a visitor', () => {
  it('names macOS to a visitor on a Mac', async () => {
    const host = await mountCall('mac');

    expect(host.textContent).toBe('download for macOS');
  });

  it('names Windows to a visitor on Windows', async () => {
    const host = await mountCall('windows');

    expect(host.textContent).toBe('download for Windows');
  });

  it('names Linux to a visitor on Linux', async () => {
    const host = await mountCall('linux');

    expect(host.textContent).toBe('download for Linux');
  });

  it('marks each platform with an emblem of its own', async () => {
    const emblemOf = async (platform: Platform) =>
      (await mountCall(platform)).querySelector('svg')?.innerHTML;

    const emblems = [await emblemOf('mac'), await emblemOf('windows'), await emblemOf('linux')];

    expect(new Set(emblems).size).toBe(3);
  });
});
