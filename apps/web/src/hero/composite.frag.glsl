precision highp float;

uniform sampler2D u_tex;
uniform sampler2D u_trail;
uniform vec2 u_res;
uniform float u_imgAspect;
uniform float u_time;
uniform vec2 u_aim0;
uniform vec2 u_aim1;
uniform vec2 u_aim2;
uniform float u_idle;
uniform float u_beam;
uniform float u_fog;
uniform float u_grade;
uniform float u_grain;
uniform float u_invert;

#include noise

vec3 scene(vec2 st) {
  float screenAspect = u_res.x / u_res.y;
  vec2 uv = st;
  if (screenAspect >= u_imgAspect) {
    uv.y = 0.5 + (st.y - 0.5) * (u_imgAspect / screenAspect);
  } else {
    uv.x = 0.5 + (st.x - 0.5) * (screenAspect / u_imgAspect);
  }
  return texture2D(u_tex, clamp(uv, 0.0, 1.0)).rgb;
}

float beam(vec2 p, vec2 anchor, vec2 aim) {
  vec2 axis = normalize(aim - anchor);
  vec2 d = p - anchor;
  float along = dot(d, axis);
  if (along < 0.0) return 0.0;
  float perp = abs(d.x * axis.y - d.y * axis.x);
  float halfWidth = 18.0 + along * 0.24;
  float core = 1.0 - smoothstep(0.0, halfWidth * 0.7, perp);
  float halo = 1.0 - smoothstep(halfWidth * 0.4, halfWidth * 2.2, perp);
  float reach = length(aim - anchor);
  float tipFade = 1.0 - smoothstep(reach * 0.9, reach * 1.3, along);
  float sourceGlow = exp(-along / (reach * 0.55));
  return (core * 0.6 + halo * 0.5) * tipFade * (0.45 + 0.9 * sourceGlow);
}

void main() {
  vec2 st = vec2(gl_FragCoord.x / u_res.x, (u_res.y - gl_FragCoord.y) / u_res.y);
  vec2 p = gl_FragCoord.xy;

  vec3 img = scene(st);

  float trail = texture2D(u_trail, gl_FragCoord.xy / u_res).r;
  float mask = smoothstep(0.12, 0.72, trail);

  float topWeight = mix(1.0, 0.30, st.y);
  float qx = fbm(st * 2.4 + vec2(u_time * 0.020, -u_time * 0.008));
  float qy = fbm(st * 2.4 + vec2(4.7, 1.9) + vec2(-u_time * 0.014, u_time * 0.010));
  float haze = pow(fbm(st * vec2(3.0, 2.1) + 1.5 * vec2(qx, qy)), 1.35) * topWeight;

  vec3 lit = img * (u_idle + mask * vec3(0.98, 1.01, 1.08));

  vec2 a0 = vec2(0.16 * u_res.x, u_res.y * 1.05);
  vec2 a1 = vec2(0.50 * u_res.x, u_res.y * 1.08);
  vec2 a2 = vec2(0.84 * u_res.x, u_res.y * 1.05);
  vec3 beams =
    beam(p, a0, u_aim0) * vec3(0.62, 0.72, 0.95) +
    beam(p, a1, u_aim1) * vec3(0.70, 0.78, 0.98) +
    beam(p, a2, u_aim2) * vec3(0.58, 0.68, 0.92);
  float scatter = 0.22 + 0.78 * mix(0.35, 1.15, u_fog) * haze;
  vec3 color = lit + beams * scatter * u_beam * 0.75;

  color += vec3(0.55, 0.65, 0.9) * haze * haze * smoothstep(0.6, 0.0, st.y) * 0.05 * u_fog;

  float lum = dot(color, vec3(0.299, 0.587, 0.114));
  vec3 duo = mix(vec3(0.012, 0.022, 0.075), vec3(0.149, 0.251, 0.851), smoothstep(0.0, 0.62, lum));
  duo += vec3(0.75, 0.8, 0.92) * pow(lum, 3.0);
  color = mix(color, duo, u_grade * smoothstep(0.01, 0.2, lum));

  float vig = smoothstep(0.0, 0.18, st.x) * smoothstep(1.0, 0.82, st.x) * smoothstep(0.0, 0.10, st.y);
  color *= mix(0.35, 1.0, vig);

  float glow = (beams.r + beams.g + beams.b) * 0.3333 * u_beam;
  float reveal = clamp(0.04 + mask * 0.88 + glow * 0.22, 0.0, 1.0);
  color = mix(color, mix(vec3(1.0), img, reveal), u_invert);

  float grain = hash(gl_FragCoord.xy + fract(u_time * 7.31) * vec2(191.0, 122.0)) - 0.5;
  color += grain * u_grain;

  gl_FragColor = vec4(color, 1.0);
}
