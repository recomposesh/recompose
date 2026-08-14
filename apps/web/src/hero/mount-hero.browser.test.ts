import { afterEach, describe, expect, it, vi } from 'vitest';

import { mountHero } from './mount-hero';

const POSTER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const LOOP = '/nothing-here.mp4';

const disposers: Array<() => void> = [];

const mount = () => {
  const canvas = document.createElement('canvas');

  document.body.append(canvas);

  const dispose = mountHero(canvas, { poster: POSTER, loop: LOOP });

  disposers.push(dispose);

  return { canvas, dispose };
};

const sleep = async (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

afterEach(() => {
  while (disposers.length > 0) disposers.pop()?.();

  document.body.replaceChildren();
});

describe('the hero canvas mounts against a real graphics context', () => {
  it('compiles both shader programs, so the split into files still assembles', () => {
    expect(() => mount()).not.toThrow();
  });

  it('leaves a linked program running on the context, having drawn through it', async () => {
    const { canvas } = mount();

    await sleep(120);

    const gl = canvas.getContext('webgl');

    expect(gl).not.toBeNull();
    expect(gl?.getParameter(gl.CURRENT_PROGRAM)).not.toBeNull();
  });

  it('sizes its drawing buffer to the window rather than the default canvas box', async () => {
    const { canvas } = mount();

    await sleep(120);

    expect(canvas.width).toBeGreaterThan(300);
    expect(canvas.height).toBeGreaterThan(150);
  });

  it('paints while it is mounted', async () => {
    mount();

    const scheduled = vi.spyOn(window, 'requestAnimationFrame');

    await sleep(120);

    expect(scheduled.mock.calls.length).toBeGreaterThan(0);

    scheduled.mockRestore();
  });

  it('stops painting once the page lets it go', async () => {
    const { dispose } = mount();
    const scheduled = vi.spyOn(window, 'requestAnimationFrame');

    await sleep(120);

    expect(scheduled.mock.calls.length).toBeGreaterThan(0);

    dispose();
    scheduled.mockClear();

    await sleep(120);

    expect(scheduled.mock.calls.length).toBe(0);

    scheduled.mockRestore();
  });

  it('lets go twice without complaint, so a double unmount is harmless', () => {
    const { dispose } = mount();

    dispose();

    expect(() => {
      dispose();
    }).not.toThrow();
  });
});
