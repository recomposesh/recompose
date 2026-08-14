import { COMPOSITE_FRAGMENT, QUAD_VERTEX, TRAIL_FRAGMENT } from './shaders';

export type HeroSources = { poster: string; loop: string };

const MAX_PIXEL_RATIO = 1.75;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);

  if (!shader) throw new Error('the hero could not create a shader');

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  const compiled: unknown = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

  if (compiled !== true) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'the hero could not compile a shader');
  }

  return shader;
}

function link(gl: WebGLRenderingContext, fragment: string) {
  const program = gl.createProgram();

  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, QUAD_VERTEX));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);

  const linked: unknown = gl.getProgramParameter(program, gl.LINK_STATUS);

  if (linked !== true) {
    throw new Error(gl.getProgramInfoLog(program) ?? 'the hero could not link a program');
  }

  return program;
}

export function mountHero(canvas: HTMLCanvasElement, _sources: HeroSources): () => void {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false });

  if (!gl) return () => undefined;

  const pixelRatio = Math.min(devicePixelRatio || 1, MAX_PIXEL_RATIO);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const trailProgram = link(gl, TRAIL_FRAGMENT);
  const compositeProgram = link(gl, COMPOSITE_FRAGMENT);

  for (const program of [trailProgram, compositeProgram]) {
    const position = gl.getAttribLocation(program, 'a_pos');

    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  }

  const resize = () => {
    canvas.width = Math.round(innerWidth * pixelRatio);
    canvas.height = Math.round(innerHeight * pixelRatio);
  };

  resize();
  addEventListener('resize', resize);

  let frameHandle = 0;

  const draw = () => {
    frameHandle = requestAnimationFrame(draw);

    gl.useProgram(compositeProgram);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  frameHandle = requestAnimationFrame(draw);

  return () => {
    cancelAnimationFrame(frameHandle);
    removeEventListener('resize', resize);
  };
}
