import { afterEach, describe, expect, it, vi } from 'vitest';

import { mountHero } from './mount-hero';

const POSTER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const LOOP = '/nothing-here.mp4';

const disposers: Array<() => void> = [];

const mount = (offScreen = false) => {
  const canvas = document.createElement('canvas');

  if (offScreen) canvas.style.cssText = 'position:fixed;top:-9000px;width:8px;height:8px';

  document.body.append(canvas);

  const dispose = mountHero(canvas, { poster: POSTER, loop: LOOP });

  disposers.push(dispose);

  return { canvas, dispose };
};

const uniformOf = (canvas: HTMLCanvasElement, name: string) => {
  const gl = canvas.getContext('webgl');

  if (!gl) return null;

  const program: unknown = gl.getParameter(gl.CURRENT_PROGRAM);

  if (!(program instanceof WebGLProgram)) return null;

  const location = gl.getUniformLocation(program, name);

  if (!location) return null;

  const value: unknown = gl.getUniform(program, location);

  return value instanceof Float32Array ? [...value] : value;
};

const aimOf = (canvas: HTMLCanvasElement) => {
  const gl = canvas.getContext('webgl');

  if (!gl) return null;

  const program: unknown = gl.getParameter(gl.CURRENT_PROGRAM);

  if (!(program instanceof WebGLProgram)) return null;

  const location = gl.getUniformLocation(program, 'u_aim0');

  if (!location) return null;

  const aim: unknown = gl.getUniform(program, location);

  return aim instanceof Float32Array ? [...aim] : null;
};

const sleep = async (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const settledSpot = async (mark: HTMLElement) => {
  let last = mark.style.getPropertyValue('--spot-y');

  for (let attempt = 0; attempt < 40; attempt += 1) {
    await sleep(150);

    const now = mark.style.getPropertyValue('--spot-y');

    if (now !== '' && now === last) return now;

    last = now;
  }

  return last;
};

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

  it('sizes its drawing buffer to the box it fills, and follows the box when it changes', async () => {
    const { canvas } = mount();

    canvas.style.cssText = 'display:block;width:640px;height:360px';

    await sleep(150);

    expect(canvas.width).toBeGreaterThanOrEqual(640);

    canvas.style.width = '900px';

    await sleep(150);

    expect(canvas.width).toBeGreaterThanOrEqual(900);
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

describe('the hero gives its graphics memory back', () => {
  it('leaves no live texture behind once the page lets it go', async () => {
    const canvas = document.createElement('canvas');

    document.body.append(canvas);

    const context = canvas.getContext('webgl');

    if (!context) throw new Error('this browser gave no webgl context');

    const born: WebGLTexture[] = [];
    const create = context.createTexture.bind(context);

    context.createTexture = () => {
      const texture = create();

      born.push(texture);

      return texture;
    };

    const dispose = mountHero(canvas, { poster: POSTER, loop: LOOP });

    canvas.style.cssText = 'display:block;width:640px;height:360px';

    await sleep(150);

    canvas.style.width = '820px';

    await sleep(150);

    dispose();

    expect(born.length).toBeGreaterThan(0);
    expect(born.filter((texture) => context.isTexture(texture))).toStrictEqual([]);
  });
});

describe('the hero keeps the spotlight over the words it lights', () => {
  it('re-reads where the words sit after the page scrolls under them', async () => {
    const canvas = document.createElement('canvas');
    const mark = document.createElement('p');
    const tail = document.createElement('div');

    mark.dataset['spot'] = 'text';
    mark.textContent = 'every model';
    mark.style.cssText = 'margin-top:1200px';
    tail.style.cssText = 'height:3000px';

    document.body.append(canvas, mark, tail);

    const dispose = mountHero(canvas, { poster: POSTER, loop: LOOP });

    disposers.push(dispose);

    dispatchEvent(new PointerEvent('pointermove', { clientX: 200, clientY: 200 }));

    const before = await settledSpot(mark);

    scrollTo(0, 900);
    dispatchEvent(new Event('scroll'));

    await sleep(250);

    expect(before).not.toBe('');
    expect(mark.style.getPropertyValue('--spot-y')).not.toBe(before);
  });
});

describe('the hero paints what it was pointed at', () => {
  it('carries the pointer into the light it aims', async () => {
    const { canvas } = mount();

    await sleep(150);

    const before = aimOf(canvas);

    dispatchEvent(new PointerEvent('pointermove', { clientX: 20, clientY: 20 }));

    await sleep(150);

    const after = aimOf(canvas);

    expect(before).not.toBeNull();
    expect(after).not.toStrictEqual(before);
  });

  it('never binds a program while it sits off screen', async () => {
    const { canvas } = mount(true);

    await sleep(200);

    const gl = canvas.getContext('webgl');

    expect(gl?.getParameter(gl.CURRENT_PROGRAM)).toBeNull();
  });

  it('uploads the still frame it was given, so the reveal has a scene to uncover', async () => {
    const { canvas } = mount();

    await sleep(250);

    expect(uniformOf(canvas, 'u_imgAspect')).toBe(1);
  });
});
