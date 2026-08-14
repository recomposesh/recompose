import { describe, expect, it } from 'vitest';

import { COMPOSITE_FRAGMENT, TRAIL_FRAGMENT } from './shaders';

const uniformsOf = (source: string) =>
  [...source.matchAll(/uniform\s+\w+\s+(\w+)/g)].map(([, name]) => name);

describe('the hero shaders carry only what the canvas feeds them', () => {
  it('drops the protect path, which never ran because nothing filled its rectangles', () => {
    expect(COMPOSITE_FRAGMENT).not.toContain('u_shades');
    expect(COMPOSITE_FRAGMENT).not.toContain('shadeRect');
    expect(COMPOSITE_FRAGMENT).not.toContain('lightScale');
  });

  it('asks the composite pass for the scene, the trail, and the three spotlights', () => {
    expect(uniformsOf(COMPOSITE_FRAGMENT)).toStrictEqual([
      'u_tex',
      'u_trail',
      'u_res',
      'u_imgAspect',
      'u_time',
      'u_aim0',
      'u_aim1',
      'u_aim2',
      'u_idle',
      'u_beam',
      'u_fog',
      'u_grade',
      'u_grain',
      'u_invert',
    ]);
  });

  it('asks the trail pass for the segment the brush paints and how fast it dies', () => {
    expect(uniformsOf(TRAIL_FRAGMENT)).toStrictEqual([
      'u_prev',
      'u_res',
      'u_from',
      'u_to',
      'u_radius',
      'u_decay',
      'u_time',
      'u_active',
    ]);
  });
});
