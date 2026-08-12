/** @resolution */
uniform vec2 u_resolution;

/**
 * @label Dot color
 * @color
 * @default #000000
 */
uniform vec3 u_dot;

/**
 * @label Dot opacity
 * @range 0.0, 0.25
 * @default 0.08
 */
uniform float u_alpha;

void main() {
  vec2 cell = mod(gl_FragCoord.xy, 22.0) - 11.0;
  float mask = 1.0 - smoothstep(0.7, 1.3, length(cell));

  gl_FragColor = vec4(u_dot, u_alpha * mask);
}
