import type { Target } from './hero-gl';
import type { HeroMotion } from './hero-motion';

import { type Plate, plateAspect, plateReady } from './hero-plate-source';

const LOOK = {
  brushSize: 212,
  idleLight: 0,
  beamStrength: 0.69,
  fogDensity: 0.63,
  gradeMix: 0.15,
  grain: 0.075,
} as const;

export type Frame = {
  width: number;
  height: number;
  pixelRatio: number;
  seconds: number;
  reveal: number;
  inverted: boolean;
};

const toGl = (point: { x: number; y: number }, frame: Frame) => ({
  x: point.x * frame.pixelRatio,
  y: frame.height - point.y * frame.pixelRatio,
});

export function paintTrail(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  targets: { from: Target; into: Target },
  motion: HeroMotion,
  frame: Frame,
) {
  const at = (name: string) => gl.getUniformLocation(program, name);
  const scale = targets.from.width / frame.width;
  const head = toGl(motion.head, frame);
  const tail = toGl(motion.previousHead, frame);

  gl.useProgram(program);
  gl.bindFramebuffer(gl.FRAMEBUFFER, targets.into.frame);
  gl.viewport(0, 0, targets.from.width, targets.from.height);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, targets.from.texture);
  gl.uniform1i(at('u_prev'), 0);
  gl.uniform2f(at('u_res'), targets.from.width, targets.from.height);
  gl.uniform2f(at('u_from'), tail.x * scale, tail.y * scale);
  gl.uniform2f(at('u_to'), head.x * scale, head.y * scale);
  gl.uniform1f(at('u_radius'), LOOK.brushSize * frame.pixelRatio * scale);
  gl.uniform1f(at('u_decay'), motion.trailDecay);
  gl.uniform1f(at('u_time'), frame.seconds);
  gl.uniform1f(at('u_active'), frame.reveal);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

export function paintComposite(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  textures: { plate: WebGLTexture; trail: Target },
  scene: { plate: Plate; motion: HeroMotion },
  frame: Frame,
) {
  const at = (name: string) => gl.getUniformLocation(program, name);
  const [firstAim, secondAim, thirdAim] = scene.motion.aims;
  const first = toGl(firstAim, frame);
  const second = toGl(secondAim, frame);
  const third = toGl(thirdAim, frame);

  gl.useProgram(program);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, frame.width, frame.height);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textures.plate);

  if (plateReady(scene.plate)) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, scene.plate);
  }

  gl.uniform1i(at('u_tex'), 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, textures.trail.texture);
  gl.uniform1i(at('u_trail'), 1);
  gl.uniform2f(at('u_res'), frame.width, frame.height);
  gl.uniform1f(at('u_imgAspect'), plateAspect(scene.plate));
  gl.uniform1f(at('u_time'), frame.seconds);
  gl.uniform2f(at('u_aim0'), first.x, first.y);
  gl.uniform2f(at('u_aim1'), second.x, second.y);
  gl.uniform2f(at('u_aim2'), third.x, third.y);
  gl.uniform1f(at('u_idle'), LOOK.idleLight);
  gl.uniform1f(at('u_beam'), LOOK.beamStrength);
  gl.uniform1f(at('u_fog'), LOOK.fogDensity);
  gl.uniform1f(at('u_grade'), LOOK.gradeMix);
  gl.uniform1f(at('u_grain'), LOOK.grain);
  gl.uniform1f(at('u_invert'), frame.inverted ? 1 : 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
