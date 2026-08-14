precision highp float;

uniform sampler2D u_prev;
uniform vec2 u_res;
uniform vec2 u_from;
uniform vec2 u_to;
uniform float u_radius;
uniform float u_decay;
uniform float u_time;
uniform float u_active;

#include noise

float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
  return length(pa - ba * h);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float prev = texture2D(u_prev, uv).r * u_decay;
  vec2 p = gl_FragCoord.xy;
  float d = sdSegment(p, u_from, u_to);
  vec2 nearest = mix(u_from, u_to, clamp(dot(p - u_from, u_to - u_from) / max(dot(u_to - u_from, u_to - u_from), 1e-4), 0.0, 1.0));
  vec2 rel = p - nearest;
  float ang = atan(rel.y, rel.x);
  float wobble = fbm(vec2(ang * 1.4 + 7.0, u_time * 0.35)) - 0.5;
  float r = u_radius * (1.0 + 0.55 * wobble);
  float stamp = (1.0 - smoothstep(r * 0.35, r, d)) * u_active;
  gl_FragColor = vec4(vec3(max(prev, stamp)), 1.0);
}
