import { afterEach, describe, expect, it } from 'vitest';

import { stageHero } from './hero-stage';

const POSTER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const LOOP = '/nothing-here.mp4';

const ALWAYS = '(min-width: 1px)';
const NEVER = '(min-width: 99999px)';

const disposers: Array<() => void> = [];

const stage = (gate: string) => {
  const canvas = document.createElement('canvas');

  document.body.append(canvas);

  const dispose = stageHero(canvas, { poster: POSTER, loop: LOOP }, gate);

  disposers.push(dispose);

  return { canvas, dispose };
};

const sleep = async (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const programOf = (canvas: HTMLCanvasElement) => {
  const gl = canvas.getContext('webgl');

  if (!gl) return null;

  const program: unknown = gl.getParameter(gl.CURRENT_PROGRAM);

  return program;
};

afterEach(() => {
  while (disposers.length > 0) disposers.pop()?.();

  document.body.replaceChildren();
});

describe('the hero stage decides whether the orchestra plays at all', () => {
  it('raises the curtain on a wide stage: the canvas shows and a program runs', async () => {
    const { canvas } = stage(ALWAYS);

    await sleep(150);

    expect(canvas.style.visibility).not.toBe('hidden');
    expect(programOf(canvas)).not.toBeNull();
  });

  it('keeps the curtain down on a small stage: the canvas hides and nothing mounts', async () => {
    const { canvas } = stage(NEVER);

    await sleep(150);

    expect(canvas.style.visibility).toBe('hidden');
    expect(programOf(canvas)).toBeNull();
  });

  it('drops back to the poster when the graphics context is lost', async () => {
    const { canvas } = stage(ALWAYS);

    await sleep(150);

    const extension = canvas.getContext('webgl')?.getExtension('WEBGL_lose_context');

    if (!extension) throw new Error('this browser cannot rehearse a context loss');

    extension.loseContext();

    await sleep(100);

    expect(canvas.style.visibility).toBe('hidden');
  });

  it('lets go twice without complaint, so a double unmount is harmless', () => {
    const { dispose } = stage(ALWAYS);

    dispose();

    expect(() => {
      dispose();
    }).not.toThrow();
  });
});
