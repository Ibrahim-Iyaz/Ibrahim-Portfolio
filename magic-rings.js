

(function () {
  'use strict';

  const MAX_RINGS = 12;
  const MAX_BURSTS = 3;
  const SLOTS = MAX_RINGS + MAX_BURSTS;
  const SEGMENTS = 128;

  const FULLSCREEN = `
const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0);
}`;

  const STRIP = `
layout(location = 0) in vec2 aSegment;
uniform mat3 uForward;
uniform vec2 uResolution;
uniform float uUnit;
uniform vec2 uCenter;
uniform vec4 uShape[SLOTS];
uniform vec4 uFrame[SLOTS];
uniform float uReach;
uniform float uSplit;
flat out int vSlot;
out vec2 vPlane;
void main() {
  vec4 shape = uShape[gl_InstanceID];
  vec2 origin = uCenter + uFrame[gl_InstanceID].xy;
  float angle = aSegment.x * 6.2831853;
  vec2 direction = vec2(cos(angle), sin(angle));
  vec3 inner = uForward * vec3(origin + direction * shape.x, 1.0);
  vec3 outer = uForward * vec3(origin + direction * (shape.x + 0.01), 1.0);
  float pixels = length(outer.xy / outer.z - inner.xy / inner.z) * 100.0 * uUnit;
  float band = uReach / max(pixels, 1e-3) + uSplit * shape.x;
  vec2 plane = origin + direction * max(shape.x + aSegment.y * band, 0.0);
  vec3 screen = uForward * vec3(plane, 1.0);
  gl_Position = vec4(screen.xy * (2.0 * uUnit / uResolution), 0.0, screen.z);
  vPlane = plane;
  vSlot = gl_InstanceID;
}`;

  const COMMON = `
uniform vec2 uResolution;
uniform vec2 uScale;
uniform float uUnit;
uniform mat3 uInverse;
uniform vec2 uCenter;
uniform int uCount;
uniform vec4 uShape[SLOTS];
uniform vec4 uFrame[SLOTS];
uniform vec4 uTint[SLOTS];
uniform vec4 uHover;
uniform vec2 uBounds;
uniform float uSplit;
uniform float uOpacity;

out vec4 fragColor;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float angleOf(vec2 v) {
  vec2 a = abs(v);
  float t = min(a.x, a.y) / max(max(a.x, a.y), 1e-6);
  float r = t * (0.5 + 0.1738 * (1.0 - t));
  return a.y > a.x ? 1.0 - r : r;
}

float nearness(vec2 plane) {
  vec2 offset = plane - uHover.xy;
  return uHover.z * exp(-dot(offset, offset) * uHover.w);
}

vec3 prismOf(vec3 tint) {
  return mix(tint, vec3(dot(tint, vec3(0.3333))), 0.65) * 0.85;
}

vec4 toneMap(vec3 light) {
  float peak = max(max(light.r, light.g), light.b);
  if (peak <= 0.0) return vec4(0.0);
  float level = 1.0 - exp(-peak);
  vec3 color = mix(light * (level / peak), vec3(level), smoothstep(1.4, 3.6, peak) * 0.4);
  return vec4(color, level);
}
`;

  const GLOW = `
uniform vec4 uHalo;
uniform vec3 uRange;

float haloOf(float d) {
  float fall = exp(-d * uHalo.y);
  float tight = fall * fall;
  tight *= tight;
  float window = clamp(1.0 - (d - uRange.x) * uRange.y, 0.0, 1.0);
  return (uHalo.z * tight + uHalo.w * fall) * window * window;
}

void main() {
  vec3 projected = uInverse * vec3((gl_FragCoord.xy * uScale - 0.5 * uResolution) / uUnit, 1.0);
  vec2 plane = projected.xy / projected.z;
  vec2 base = plane - uCenter;
  float reach = length(base);
  if (projected.z <= 0.0 || reach < uBounds.x || reach > uBounds.y) {
    fragColor = vec4(0.0);
    return;
  }
  float boost = 1.0 + 1.6 * nearness(plane);
  float limit = uRange.z + uSplit;
  vec3 light = vec3(0.0);
  float alpha = 0.0;

  for (int i = 0; i < SLOTS; i++) {
    if (i >= uCount) break;
    vec4 shape = uShape[i];
    vec4 frame = uFrame[i];
    vec2 w = base - frame.xy;
    float len = length(w);
    float d = abs(len - shape.x);
    if (d > limit) continue;
    float a = angleOf(vec2(dot(w, frame.zw), frame.z * w.y - frame.w * w.x));
    if (a > shape.w) continue;
    float energy = shape.y * max(exp(-shape.z * a * a * a) - 0.002, 0.0) * boost;
    vec3 tint = uTint[i].rgb;
#ifdef PRISM
    float offset = uSplit * shape.x;
    vec3 halo = vec3(haloOf(abs(len - shape.x - offset)), haloOf(d), haloOf(abs(len - shape.x + offset)));
#else
    vec3 halo = vec3(haloOf(d));
#endif
#ifdef LIGHT
    float layer = clamp(energy * dot(halo, vec3(0.3333)), 0.0, 1.0);
    light = tint * layer + light * (1.0 - layer);
    alpha = layer + alpha * (1.0 - layer);
#else
#ifdef PRISM
    tint = prismOf(tint);
#endif
    light += tint * energy * halo;
#endif
  }
#ifdef LIGHT
  fragColor = vec4(light, alpha);
#elif defined(PACKED)
  fragColor = vec4(1.0 - exp(-light), 1.0);
#else
  fragColor = vec4(light, 1.0);
#endif
}`;

  const COMPOSE = `
uniform sampler2D uGlow;
uniform float uGrain;
uniform float uTime;

void main() {
  vec4 glow = texture(uGlow, gl_FragCoord.xy / uResolution);
  float grain = 1.0;
  if (uGrain > 0.0) grain += uGrain * (hash(gl_FragCoord.xy + fract(uTime * 7.31) * 413.0) - 0.5) * 1.8;
  float dither = (hash(gl_FragCoord.xy) - 0.5) / 255.0;
#ifdef LIGHT
  float alpha = clamp(glow.a * grain, 0.0, 1.0);
  if (alpha <= 0.0) {
    fragColor = vec4(0.0);
    return;
  }
  vec3 ink = glow.rgb * grain;
  alpha = clamp(alpha + dither, 0.0, 1.0);
  fragColor = vec4(min(ink, vec3(alpha)), alpha) * uOpacity;
#else
#ifdef PACKED
  vec3 light = -log(1.0 - min(glow.rgb, vec3(0.9995))) * grain;
#else
  vec3 light = glow.rgb * grain;
#endif
  vec4 color = toneMap(light);
  if (color.a <= 0.0) {
    fragColor = vec4(0.0);
    return;
  }
  float alpha = clamp(color.a + dither, 0.0, 1.0);
  fragColor = vec4(min(color.rgb, vec3(alpha)), alpha) * uOpacity;
#endif
}`;

  const LINE = `
flat in int vSlot;
in vec2 vPlane;
uniform float uWidth;

float coverage(float pixels, float halfWidth) {
  return clamp(max(halfWidth, 0.5) - pixels + 0.5, 0.0, 1.0) * min(halfWidth * 2.0, 1.0);
}

void main() {
  vec4 shape = uShape[vSlot];
  vec4 frame = uFrame[vSlot];
  vec4 tint = uTint[vSlot];
  vec2 w = vPlane - uCenter - frame.xy;
  float len = length(w);
  float stretch = 1.0 / max(length(vec2(dFdx(len), dFdy(len))), 1e-6);
  float a = angleOf(vec2(dot(w, frame.zw), frame.z * w.y - frame.w * w.x));
  float near = nearness(vPlane);
  float energy = shape.y * max(exp(-shape.z * a * a * a) - 0.002, 0.0) * (1.0 + 1.6 * near) * step(a, shape.w);
  float halfWidth = uWidth * (1.0 + 0.45 * near) * max(1.0 - a, 0.5) * tint.w;
  float pixels = abs(len - shape.x) * stretch;
#ifdef PRISM
  float offset = uSplit * shape.x;
  vec3 core = vec3(
    coverage(abs(len - shape.x - offset) * stretch, halfWidth),
    coverage(pixels, halfWidth),
    coverage(abs(len - shape.x + offset) * stretch, halfWidth)
  );
#else
  vec3 core = vec3(coverage(pixels, halfWidth));
#endif
#ifdef LIGHT
  float hot = core.g * clamp(1.0 - pixels / max(halfWidth * 0.35, 0.3), 0.0, 1.0);
  float layer = energy * max(max(core.r, core.g), core.b);
  if (layer <= 0.0) discard;
#ifdef PRISM
  vec3 color = clamp(1.0 - (1.0 - tint.rgb) * core * 1.4, 0.0, 1.0);
#else
  vec3 color = tint.rgb;
#endif
  color = mix(color, vec3(1.0), hot * 0.7);
  fragColor = vec4(color * layer, layer) * uOpacity;
#else
#ifdef PRISM
  vec4 color = toneMap(prismOf(tint.rgb) * energy * core * 1.7);
#else
  vec4 color = toneMap(tint.rgb * energy * core * 1.7);
#endif
  if (color.a <= 0.0) discard;
  fragColor = color * uOpacity;
#endif
}`;

  const shaderSource = (body, flags) =>
    [
      '#version 300 es',
      'precision highp float;',
      `#define SLOTS ${SLOTS}`,
      ...flags.map(flag => `#define ${flag}`),
      body
    ].join('\n');

  const FRAGMENTS = { glow: GLOW, compose: COMPOSE, line: LINE };
  const MOTIONS = ['pulse', 'ripple', 'breathe'];
  const CYCLE = 3.45;
  const STAGGER = 0.5;
  const DEPTH = 2.6;
  const BURST_LIFE = 1.1;
  const BURST_SPEED = 0.9;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const smoothstep = (from, to, value) => {
    const t = clamp((value - from) / (to - from), 0, 1);
    return t * t * (3 - 2 * t);
  };

  const pulseLife = t => Math.min(smoothstep(0, 0.7, t), 1 - smoothstep(0.5, 3.25, t));
  const toLinear = channel => (channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4));

  const parseColor = value => {
    const text = String(value || '').trim();
    const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text);
    if (hex) {
      const full = hex[1].length === 3 ? hex[1].replace(/./g, digit => digit + digit) : hex[1];
      return [0, 2, 4].map(index => parseInt(full.slice(index, index + 2), 16) / 255);
    }
    const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(text);
    if (rgb) return [rgb[1], rgb[2], rgb[3]].map(channel => clamp(parseFloat(channel) / 255, 0, 1));
    if (typeof document !== 'undefined') {
      const context = document.createElement('canvas').getContext('2d');
      if (context) {
        context.fillStyle = '#000000';
        context.fillStyle = text;
        const normal = String(context.fillStyle);
        if (normal !== '#000000' || /^(#0{3}|#0{6}|black)$/i.test(text)) return parseColor(normal);
      }
    }
    return [0.66, 0.33, 0.97];
  };

  const compile = (gl, type, source) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const link = (gl, vertexSource, fragmentSource) => {
    const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = vertex && fragment ? gl.createProgram() : null;
    if (!vertex || !fragment || !program) {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
      return null;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let index = 0; index < count; index++) {
      const info = gl.getActiveUniform(program, index);
      if (info) uniforms[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(program, info.name);
    }
    return { program, uniforms };
  };

  const invert = m => {
    const [a, b, c, d, e, f, g, h, i] = m;
    const A = e * i - f * h;
    const B = f * g - d * i;
    const C = d * h - e * g;
    const det = a * A + b * B + c * C;
    return [A, c * h - b * i, b * f - c * e, B, a * i - c * g, c * d - a * f, C, b * g - a * h, a * e - b * d].map(
      value => value / det
    );
  };

  const planeFor = (tiltX, tiltY) => {
    const ax = (tiltX * Math.PI) / 180;
    const ay = (tiltY * Math.PI) / 180;
    const cx = Math.cos(ax);
    const sx = Math.sin(ax);
    const cy = Math.cos(ay);
    const sy = Math.sin(ay);
    const forward = [cy, sy * sx, 0, 0, cx, 0, (sy * cx) / DEPTH, -sx / DEPTH, 1];
    return { forward, inverse: invert(forward) };
  };

  const project = (m, x, y) => {
    const w = m[6] * x + m[7] * y + m[8];
    return [(m[0] * x + m[1] * y + m[2]) / w, (m[3] * x + m[4] * y + m[5]) / w, w];
  };

  class MagicRingsEngine {
    constructor(container, options = {}) {
      this.container = container;
      this.canvas = container.querySelector('canvas') || document.createElement('canvas');
      if (!this.canvas.parentNode) {
        this.canvas.className = 'magic-rings__canvas';
        this.canvas.setAttribute('aria-hidden', 'true');
        container.appendChild(this.canvas);
      }

      const light = options.theme === 'light';
      const first = parseColor(options.color || '#A855F7');
      const second = parseColor(options.colorTwo || '#6366F1');

      this.options = {
        color: light ? first : first.map(toLinear),
        colorTwo: light ? second : second.map(toLinear),
        ringCount: clamp(Math.round(options.ringCount ?? 6), 1, MAX_RINGS),
        motion: MOTIONS.includes(options.motion) ? options.motion : 'pulse',
        speed: Math.max(0, options.speed ?? 1),
        lineThickness: Math.max(0.25, options.lineThickness ?? 2.5),
        glow: clamp(options.glow ?? 1.3, 0, 3),
        baseRadius: Math.max(0.01, options.baseRadius ?? 0.32),
        radiusStep: Math.max(0, options.radiusStep ?? 0.095),
        expansion: options.expansion ?? 0.1,
        taper: Math.max(0.5, options.taper ?? 1.5),
        rotation: ((options.rotation ?? 0) * Math.PI) / 180,
        spin: options.spin ?? 0,
        tilt: clamp(options.tilt ?? 15, -80, 80),
        dispersion: clamp(options.dispersion ?? 0.2, 0, 1),
        grain: clamp(options.grain ?? 0, 0, 1),
        opacity: clamp(options.opacity ?? 1, 0, 1),
        followMouse: options.followMouse ?? true,
        mouseInfluence: options.mouseInfluence ?? 0.22,
        hoverScale: Math.max(0.5, options.hoverScale ?? 1.15),
        hoverIntensity: Math.max(0, options.hoverIntensity ?? 1),
        parallax: options.parallax ?? 0.05,
        clickBurst: options.clickBurst ?? true,
        intro: options.intro ?? true,
        light,
        maxRatio: clamp(options.maxDevicePixelRatio ?? 1.35, 0.5, 2)
      };

      this.initGL();
    }

    initGL() {
      const gl = this.canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: 'high-performance'
      });
      if (!gl) return;
      this.gl = gl;

      const programs = new Map();
      this.programFor = (name, flags) => {
        const key = `${name}|${flags.join(',')}`;
        if (!programs.has(key)) {
          const vertex = shaderSource(name === 'line' ? STRIP : FULLSCREEN, flags);
          programs.set(key, link(gl, vertex, shaderSource(`${COMMON}${FRAGMENTS[name]}`, flags)));
        }
        return programs.get(key);
      };

      if (!this.programFor('glow', []) || !this.programFor('compose', []) || !this.programFor('line', [])) return;

      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.vao = gl.createVertexArray();
      this.stripVao = gl.createVertexArray();
      this.stripBuffer = gl.createBuffer();
      const strip = new Float32Array((SEGMENTS + 1) * 4);
      for (let index = 0; index <= SEGMENTS; index++) {
        strip.set([index / SEGMENTS, -1, index / SEGMENTS, 1], index * 4);
      }
      gl.bindVertexArray(this.stripVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.stripBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, strip, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);

      this.glowTexture = gl.createTexture();
      this.glowBuffer = gl.createFramebuffer();
      this.glowSize = { width: 0, height: 0 };
      this.floatGlow = Boolean(gl.getExtension('EXT_color_buffer_float'));

      this.shape = new Float32Array(SLOTS * 4);
      this.frameData = new Float32Array(SLOTS * 4);
      this.tints = new Float32Array(SLOTS * 4);
      this.size = { width: 1, height: 1, ratio: 1, unit: 1 };
      this.pointer = { x: 0, y: 0, inside: false, touch: false };
      this.spring = { x: 0, y: 0, vx: 0, vy: 0, hover: 0, hoverVelocity: 0 };
      this.bursts = [];

      this.introLive = this.options.intro && this.options.speed > 0 && !this.reduced;
      this.time = this.introLive ? 0 : 1.6;
      this.clock = 0;
      this.raf = 0;
      this.last = 0;
      this.visible = true;
      this.pageVisible = document.visibilityState !== 'hidden';
      this.lost = false;
      this.isAlive = true;

      this.bindEvents();
      this.resize();
      this.wake();
    }

    resize() {
      if (!this.gl || this.lost) return;
      const gl = this.gl;
      const s = this.options;
      const rect = this.container.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, s.maxRatio);
      const width = Math.max(1, Math.round(rect.width * ratio));
      const height = Math.max(1, Math.round(rect.height * ratio));
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
      }
      Object.assign(this.size, { width, height, ratio, unit: Math.max(1, Math.min(width, height)) });
      const glowWidth = Math.max(1, Math.ceil(width / 2));
      const glowHeight = Math.max(1, Math.ceil(height / 2));
      if (this.glowSize.width === glowWidth && this.glowSize.height === glowHeight) return;
      Object.assign(this.glowSize, { width: glowWidth, height: glowHeight });

      const allocate = useFloat => {
        gl.bindTexture(gl.TEXTURE_2D, this.glowTexture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          useFloat ? gl.RGBA16F : gl.RGBA8,
          glowWidth,
          glowHeight,
          0,
          gl.RGBA,
          useFloat ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE,
          null
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.glowBuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.glowTexture, 0);
        const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return complete;
      };
      if (!allocate(this.floatGlow)) {
        this.floatGlow = false;
        allocate(false);
      }
    }

    ringState(s, index, count) {
      const mix = count > 1 ? index / (count - 1) : 0;
      if (s.motion === 'ripple') {
        const span = count * s.radiusStep + s.expansion;
        const period = CYCLE * Math.max(1, count) * 0.32;
        const phase = this.time / period + index / count;
        const progress = phase - Math.floor(phase);
        const born = this.time - progress * period >= -1e-4 || !this.introLive;
        const life = born ? smoothstep(0, 0.12, progress) * (1 - smoothstep(0.62, 1, progress)) : 0;
        const position = progress * Math.max(1, count - 1);
        return { radius: s.baseRadius + progress * span, life, virtual: position, mix: progress, opening: 1 };
      }
      if (s.motion === 'breathe') {
        const wave = Math.sin((this.time / 4) * Math.PI * 2 - index * 0.55);
        const rise = this.introLive ? smoothstep(index * 0.12, index * 0.12 + 0.9, this.time) : 1;
        return {
          radius: s.baseRadius + index * s.radiusStep + s.expansion * 0.5 * (1 + wave),
          life: (0.78 + 0.22 * wave) * rise,
          virtual: index,
          mix,
          opening: 1
        };
      }
      const local = this.time - index * STAGGER;
      const t = ((local % CYCLE) + CYCLE) % CYCLE;
      const life = this.introLive && local < 0 ? 0 : pulseLife(t);
      return {
        radius: s.baseRadius + index * s.radiusStep + (1 - Math.pow(1 - t / CYCLE, 2)) * s.expansion,
        life,
        virtual: index,
        mix,
        opening: this.introLive && local < CYCLE ? smoothstep(0, 0.9, local) : 1
      };
    }

    render() {
      if (!this.gl || this.lost) return;
      const gl = this.gl;
      const s = this.options;
      const count = s.ringCount;
      const hover = this.spring.hover;
      const still = this.reduced ? 0 : 1;
      const scale = 1 + (s.hoverScale - 1) * hover * still;
      const mouseX = this.spring.x * still;
      const mouseY = this.spring.y * still;
      const leanX = s.tilt - mouseY * s.parallax * 260;
      const leanY = mouseX * s.parallax * 260;
      const view = planeFor(leanX, leanY);
      const center = s.followMouse ? [mouseX * s.mouseInfluence, mouseY * s.mouseInfluence] : [0, 0];
      const spinBase = s.spin * this.time * 0.6;

      let slots = 0;
      let lowest = Infinity;
      let highest = 0;
      let shiftMax = 0;

      const place = (radius, life, cut, angle, shiftX, shiftY, mix, width) => {
        if (life <= 0.002) return;
        const gain = 10 * radius * cut * cut * cut;
        this.shape.set([radius, life, gain, gain > 6.2 ? Math.cbrt(6.2 / gain) : 2], slots * 4);
        this.frameData.set([shiftX, shiftY, Math.cos(angle), Math.sin(angle)], slots * 4);
        this.tints.set(
          [
            s.color[0] + (s.colorTwo[0] - s.color[0]) * mix,
            s.color[1] + (s.colorTwo[1] - s.color[1]) * mix,
            s.color[2] + (s.colorTwo[2] - s.color[2]) * mix,
            width
          ],
          slots * 4
        );
        lowest = Math.min(lowest, radius);
        highest = Math.max(highest, radius);
        shiftMax = Math.max(shiftMax, Math.hypot(shiftX, shiftY));
        slots++;
      };

      for (let index = 0; index < count; index++) {
        const state = this.ringState(s, index, count);
        let radius = state.radius * scale;
        let life = state.life;
        for (const burst of this.bursts) {
          const age = this.clock - burst.start;
          const wave = (burst.radius + age * BURST_SPEED) * scale;
          const fade = Math.pow(Math.max(0, 1 - age / BURST_LIFE), 1.5);
          const gap = (wave - radius) / 0.08;
          radius += 0.04 * Math.exp(-gap * gap) * fade;
          life = Math.min(1.6, life + 0.9 * Math.exp(-gap * gap * 1.6) * fade);
        }
        const cut = Math.pow(s.taper, state.virtual) / Math.max(0.08, state.opening);
        const angle = s.rotation + spinBase * (index % 2 ? -1 : 1) * (1 + index * 0.15);
        place(radius, life, cut, angle, index * s.parallax * mouseX, index * s.parallax * mouseY, state.mix, 1);
      }

      for (const burst of this.bursts) {
        const age = this.clock - burst.start;
        const fade = Math.pow(Math.max(0, 1 - age / BURST_LIFE), 1.5);
        const radius = (burst.radius + age * BURST_SPEED) * scale;
        place(radius, 1.5 * fade, 0.85, s.rotation, 0, 0, clamp(age / BURST_LIFE, 0, 1), 1.15);
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (!slots) return;

      const flags = [];
      if (s.light) flags.push('LIGHT');
      if (s.dispersion > 0) flags.push('PRISM');
      if (!this.floatGlow) flags.push('PACKED');
      const glowProgram = this.programFor('glow', flags);
      const composeProgram = this.programFor('compose', flags);
      const lineProgram = this.programFor('line', flags);
      if (!glowProgram || !composeProgram || !lineProgram) return;

      const glowScale = (s.light ? 0.3 : 1) * (1 - s.dispersion * 0.45);
      const outer = 0.012 + 0.033 * s.glow;
      const innerAmount = 0.5 * Math.min(1, s.glow) * glowScale;
      const outerAmount = 0.9 * s.glow * glowScale;
      const range = outer * 4.5 + 0.008;
      const split = s.dispersion * 0.03;
      const margin = range + split * highest + shiftMax + 0.01;
      const width = s.lineThickness * this.size.ratio;
      const reach = width * (1 + 0.45 * s.hoverIntensity) * 1.15 + 1.5;
      const cursor = project(view.inverse, this.pointer.x, this.pointer.y);

      const shared = program => {
        const u = program.uniforms;
        gl.useProgram(program.program);
        gl.uniform2f(u.uResolution, this.canvas.width, this.canvas.height);
        gl.uniform1f(u.uUnit, this.size.unit);
        gl.uniform2f(u.uCenter, center[0], center[1]);
        gl.uniform1i(u.uCount, slots);
        gl.uniform4fv(u.uShape, this.shape);
        gl.uniform4fv(u.uFrame, this.frameData);
        gl.uniform4fv(u.uTint, this.tints);
        gl.uniform4f(u.uHover, cursor[0] - center[0], cursor[1] - center[1], hover * s.hoverIntensity, 1 / 0.03);
        gl.uniform1f(u.uSplit, split);
        gl.uniform1f(u.uOpacity, s.opacity);
        return u;
      };

      gl.bindVertexArray(this.vao);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.glowBuffer);
      gl.viewport(0, 0, this.glowSize.width, this.glowSize.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const glowUniforms = shared(glowProgram);
      gl.uniform2f(glowUniforms.uScale, this.canvas.width / this.glowSize.width, this.canvas.height / this.glowSize.height);
      gl.uniformMatrix3fv(glowUniforms.uInverse, true, view.inverse);
      gl.uniform2f(glowUniforms.uBounds, Math.max(0, lowest - margin), highest + margin);
      gl.uniform4f(glowUniforms.uHalo, 0, 1 / outer, innerAmount, outerAmount);
      gl.uniform3f(glowUniforms.uRange, range * 0.45, 1 / (range * 0.55), range);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      const composeUniforms = shared(composeProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.glowTexture);
      gl.uniform1i(composeUniforms.uGlow, 0);
      gl.uniform1f(composeUniforms.uGrain, s.grain);
      gl.uniform1f(composeUniforms.uTime, this.clock);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      const lineUniforms = shared(lineProgram);
      gl.uniformMatrix3fv(lineUniforms.uForward, true, view.forward);
      gl.uniform1f(lineUniforms.uReach, reach);
      gl.uniform1f(lineUniforms.uWidth, width);
      gl.enable(gl.BLEND);
      if (s.light) gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      else gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_COLOR, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindVertexArray(this.stripVao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, (SEGMENTS + 1) * 2, slots);
      gl.disable(gl.BLEND);
      gl.bindVertexArray(null);
    }

    frame(now) {
      this.raf = 0;
      if (this.lost || !this.isAlive) return;
      const s = this.options;
      const dt = clamp((now - this.last) / 1000 || 0, 0, 0.05);
      this.last = Math.max(this.last, now);
      this.clock += dt;
      if (!this.reduced) this.time += dt * s.speed;

      const targetX = this.pointer.inside ? this.pointer.x / Math.max(1e-6, this.size.width / this.size.unit) : 0;
      const targetY = this.pointer.inside ? this.pointer.y / Math.max(1e-6, this.size.height / this.size.unit) : 0;
      const stiffness = 70;
      const damping = 2 * Math.sqrt(stiffness) * 0.9;
      const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
      const h = dt / steps;
      for (let step = 0; step < steps; step++) {
        this.spring.vx += (stiffness * (targetX - this.spring.x) - damping * this.spring.vx) * h;
        this.spring.vy += (stiffness * (targetY - this.spring.y) - damping * this.spring.vy) * h;
        this.spring.x += this.spring.vx * h;
        this.spring.y += this.spring.vy * h;
        const hoverTarget = this.pointer.inside ? 1 : 0;
        this.spring.hoverVelocity += (40 * (hoverTarget - this.spring.hover) - 2 * Math.sqrt(40) * this.spring.hoverVelocity) * h;
        this.spring.hover += this.spring.hoverVelocity * h;
      }

      for (let index = this.bursts.length - 1; index >= 0; index--) {
        if (this.clock - this.bursts[index].start > BURST_LIFE) this.bursts.splice(index, 1);
      }
      if (this.introLive && this.time > (s.ringCount + 2) * STAGGER + CYCLE) this.introLive = false;

      this.render();

      const settling =
        Math.abs(this.spring.vx) + Math.abs(this.spring.vy) + Math.abs(this.spring.hoverVelocity) > 1e-4 ||
        Math.abs((this.pointer.inside ? 1 : 0) - this.spring.hover) > 1e-3;
      const busy = (s.speed > 0 && !this.reduced) || settling || this.bursts.length > 0 || this.introLive;
      if (busy && this.visible && this.pageVisible && this.isAlive) {
        this.raf = requestAnimationFrame(n => this.frame(n));
      }
    }

    wake() {
      if (this.raf || this.lost || !this.visible || !this.pageVisible || !this.isAlive) return;
      this.last = performance.now();
      this.raf = requestAnimationFrame(n => this.frame(n));
    }

    bindEvents() {
      const locate = event => {
        const rect = this.container.getBoundingClientRect();
        const inside =
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom;
        const unit = Math.max(1, Math.min(rect.width, rect.height));
        return {
          x: (event.clientX - rect.left - rect.width / 2) / unit,
          y: (rect.top + rect.height / 2 - event.clientY) / unit,
          inside
        };
      };

      this._onPointerMove = event => {
        if (event.pointerType === 'touch' && !this.pointer.touch) return;
        const spot = locate(event);
        this.pointer.x = spot.x;
        this.pointer.y = spot.y;
        this.pointer.inside = spot.inside;
        this.wake();
      };

      this._onPointerDown = event => {
        const spot = locate(event);
        if (!spot.inside) return;
        this.pointer.x = spot.x;
        this.pointer.y = spot.y;
        this.pointer.inside = true;
        this.pointer.touch = event.pointerType === 'touch';
        if (this.options.clickBurst && !this.reduced) {
          this.bursts.push({ start: this.clock, radius: Math.max(0.04, this.options.baseRadius * 0.45) });
          if (this.bursts.length > MAX_BURSTS) this.bursts.shift();
        }
        this.wake();
      };

      this._onPointerUp = event => {
        if (event.pointerType !== 'touch') return;
        this.pointer.touch = false;
        this.pointer.inside = false;
        this.wake();
      };

      this._onLeave = () => {
        this.pointer.inside = false;
        this.wake();
      };

      window.addEventListener('pointermove', this._onPointerMove, { passive: true });
      window.addEventListener('pointerdown', this._onPointerDown, { passive: true });
      window.addEventListener('pointerup', this._onPointerUp, { passive: true });
      window.addEventListener('pointercancel', this._onPointerUp, { passive: true });
      document.documentElement.addEventListener('pointerleave', this._onLeave);

      this.resizeObserver = new ResizeObserver(() => {
        this.resize();
        this.wake();
      });
      this.resizeObserver.observe(this.container);

      this.intersection = new IntersectionObserver(entries => {
        this.visible = entries.some(entry => entry.isIntersecting);
        this.wake();
      });
      this.intersection.observe(this.container);

      this._onVisibility = () => {
        this.pageVisible = document.visibilityState !== 'hidden';
        this.wake();
      };
      document.addEventListener('visibilitychange', this._onVisibility);
    }

    destroy() {
      this.isAlive = false;
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;

      if (this.resizeObserver) this.resizeObserver.disconnect();
      if (this.intersection) this.intersection.disconnect();

      window.removeEventListener('pointermove', this._onPointerMove);
      window.removeEventListener('pointerdown', this._onPointerDown);
      window.removeEventListener('pointerup', this._onPointerUp);
      window.removeEventListener('pointercancel', this._onPointerUp);
      document.documentElement.removeEventListener('pointerleave', this._onLeave);
      document.removeEventListener('visibilitychange', this._onVisibility);

      if (this.gl && !this.gl.isContextLost()) {
        const gl = this.gl;
        gl.deleteVertexArray(this.vao);
        gl.deleteTexture(this.glowTexture);
        gl.deleteFramebuffer(this.glowBuffer);
        gl.deleteVertexArray(this.stripVao);
        gl.deleteBuffer(this.stripBuffer);
      }
    }
  }

  window.MagicRingsEngine = MagicRingsEngine;
})();
