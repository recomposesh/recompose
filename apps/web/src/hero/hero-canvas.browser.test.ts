import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { HeroCanvas } from './hero-canvas';

const OVERLAP = '32svh';

const roots: Root[] = [];

const mountCanvas = async () => {
  const host = document.createElement('div');

  document.documentElement.style.setProperty('--diorama-overlap', OVERLAP);
  document.body.append(host);

  const root = createRoot(host);

  roots.push(root);
  root.render(createElement(HeroCanvas));

  await new Promise<void>((resolve) => {
    setTimeout(resolve, 50);
  });

  const backdrop = host.querySelector('canvas');

  if (!backdrop) throw new Error('the hero rendered no canvas to look at');

  return backdrop;
};

const measuredOverlap = () => {
  const probe = document.createElement('div');

  probe.style.cssText = 'position:absolute;visibility:hidden;height:var(--diorama-overlap)';
  document.body.append(probe);

  const height = probe.getBoundingClientRect().height;

  probe.remove();

  return height;
};

afterEach(() => {
  while (roots.length > 0) roots.pop()?.unmount();

  document.documentElement.style.removeProperty('--diorama-overlap');
  document.body.replaceChildren();
});

describe('the hero backdrop meets the section that scrolls over it', () => {
  it('thins its paint to nothing before its own bottom edge, so a scroll never shears it', async () => {
    const backdrop = await mountCanvas();

    const fade = getComputedStyle(backdrop).maskImage;

    expect(fade).not.toBe('none');
    expect(fade).toContain('rgba(0, 0, 0, 0)');
  });

  it('holds full strength across everything the next section leaves uncovered', async () => {
    const backdrop = await mountCanvas();

    const fade = getComputedStyle(backdrop).maskImage;
    const opaqueUntil = /calc\(100% - ([\d.]+)px\)/.exec(fade)?.[1];

    expect(Number(opaqueUntil)).toBeCloseTo(measuredOverlap(), 1);
  });
});
