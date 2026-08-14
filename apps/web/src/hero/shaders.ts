import compositeSource from './composite.frag.glsl?raw';
import noiseSource from './noise.glsl?raw';
import quadSource from './quad.vert.glsl?raw';
import trailSource from './trail.frag.glsl?raw';

const withNoise = (source: string) => source.replace('#include noise', noiseSource);

export const QUAD_VERTEX = quadSource;

export const TRAIL_FRAGMENT = withNoise(trailSource);

export const COMPOSITE_FRAGMENT = withNoise(compositeSource);
