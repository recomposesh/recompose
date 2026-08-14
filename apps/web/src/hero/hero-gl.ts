import { COMPOSITE_FRAGMENT, QUAD_VERTEX, TRAIL_FRAGMENT } from './shaders';

const TRAIL_SCALE = 4;

export function trailSize(edge: number) {
  return Math.max(2, Math.round(edge / TRAIL_SCALE));
}

export type Target = {
  texture: WebGLTexture;
  frame: WebGLFramebuffer;
  width: number;
  height: number;
};

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

export function createPrograms(gl: WebGLRenderingContext) {
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const trail = link(gl, TRAIL_FRAGMENT);
  const composite = link(gl, COMPOSITE_FRAGMENT);

  for (const program of [trail, composite]) {
    const position = gl.getAttribLocation(program, 'a_pos');

    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  }

  return { trail, composite };
}

function sampleSmoothlyClamped(gl: WebGLRenderingContext, texture: WebGLTexture) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return texture;
}

export function createTarget(gl: WebGLRenderingContext, width: number, height: number): Target {
  const texture = gl.createTexture();
  const frame = gl.createFramebuffer();

  sampleSmoothlyClamped(gl, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, frame);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return { texture, frame, width, height };
}

export function destroyTarget(gl: WebGLRenderingContext, target: Target) {
  gl.deleteFramebuffer(target.frame);
  gl.deleteTexture(target.texture);
}

export function createPlateTexture(gl: WebGLRenderingContext) {
  const texture = sampleSmoothlyClamped(gl, gl.createTexture());

  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGB,
    1,
    1,
    0,
    gl.RGB,
    gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0]),
  );

  return texture;
}
