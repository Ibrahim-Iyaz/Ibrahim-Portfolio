

(function () {
  'use strict';

  const GRADIENTS = {
    blue: 'linear-gradient(135deg, hsl(214, 95%, 66%), hsl(226, 80%, 50%))',
    purple: 'linear-gradient(135deg, hsl(276, 84%, 70%), hsl(262, 66%, 52%))',
    red: 'linear-gradient(135deg, hsl(354, 95%, 68%), hsl(342, 80%, 52%))',
    indigo: 'linear-gradient(135deg, hsl(236, 90%, 72%), hsl(246, 64%, 54%))',
    orange: 'linear-gradient(135deg, hsl(38, 100%, 62%), hsl(20, 94%, 54%))',
    green: 'linear-gradient(135deg, hsl(146, 66%, 54%), hsl(162, 82%, 34%))',
    teal: 'linear-gradient(135deg, hsl(184, 80%, 56%), hsl(196, 84%, 40%))',
    pink: 'linear-gradient(135deg, hsl(326, 92%, 74%), hsl(314, 70%, 54%))',
    graphite: 'linear-gradient(135deg, hsl(250, 6%, 46%), hsl(250, 8%, 22%))',
    silver: 'linear-gradient(135deg, hsl(240, 6%, 92%), hsl(240, 5%, 70%))'
  };

  const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
  const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const fade = (from, to, t) => {
    const x = clamp((t - from) / (to - from), 0, 1);
    return x * x * (3 - 2 * x);
  };

  const drive = (value, velocity, target, stiffness, damping, dt) => {
    const next = velocity + (stiffness * (target - value) - damping * velocity) * dt;
    return [value + next * dt, next];
  };

  class HeaderGlassIcons {
    constructor(navContainer, options = {}) {
      this.container = navContainer;
      this.links = Array.from(navContainer.querySelectorAll('.nav-glass-link'));
      if (!this.links.length) return;

      this.size = options.size || 24;
      this.tilt = options.tilt || 14;
      this.spread = options.spread || 0.45;
      this.parallax = options.parallax || 0.8;
      this.hoverMode = options.hover || 'press'; 

      this.reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

      this.items = this.links.map((link, i) => {
        const iconEl = link.querySelector('.glass-icon');
        const plateEl = link.querySelector('.glass-icon-plate');
        const glassEl = link.querySelector('.glass-icon-glass');
        const faceEl = link.querySelector('.glass-icon-face');

        return {
          link,
          iconEl,
          plateEl,
          glassEl,
          faceEl,
          state: {
            h: 0, hv: 0, ht: 0, 
            p: 0, pv: 0, pt: 0, 
            x: 0, xv: 0, xt: 0, 
            y: 0, yv: 0, yt: 0, 
            e: this.reduceMotion ? 1 : 0, ev: 0, et: 1 
          }
        };
      });

      this.raf = 0;
      this.lastTime = 0;
      this.bindEvents();
      this.wake();
    }

    poseOf(item) {
      const state = item.state;
      const size = this.size;
      const enter = clamp(state.e, 0, 1);
      const swing = ease((enter - 0.15) / 0.85);
      const hover = state.h;
      const lift = this.hoverMode === 'lift' ? hover : 0;

      let liftY = 0;
      let glassScale = 1;
      if (this.hoverMode === 'lift') liftY = -0.1 * size * hover;
      if (this.hoverMode === 'float') liftY = -0.14 * size * hover;
      if (this.hoverMode === 'press') {
        liftY = -0.04 * size * hover;
        glassScale = 1 - 0.08 * state.p;
      }

      const settle = 0.94 + 0.06 * ease(enter);
      const shift = [-state.x * this.parallax * 0.08 * size, -state.y * this.parallax * 0.08 * size];
      const angle = (this.tilt + 12 * hover) * swing;
      const offset = [-0.08 * size * (hover * 0.5 + 0.5), -0.08 * size * (hover * 0.5 + 0.5)];

      return {
        liftY,
        glassScale: glassScale * settle,
        glassAlpha: fade(0, 0.6, enter),
        plateAlpha: fade(0, 0.4, enter),
        faceY: liftY,
        faceScale: glassScale,
        faceAlpha: fade(0.2, 0.9, enter),
        plateScale: 1 - 0.05 * state.p,
        shift,
        angle,
        offset
      };
    }

    applyItem(item) {
      const pose = this.poseOf(item);

      if (item.glassEl) {
        item.glassEl.style.transform = `translate3d(0, ${pose.liftY.toFixed(2)}px, 0) scale(${pose.glassScale.toFixed(4)})`;
        item.glassEl.style.opacity = pose.glassAlpha.toFixed(3);
      }
      if (item.faceEl) {
        item.faceEl.style.transform = `translate3d(0, ${pose.faceY.toFixed(2)}px, 0) scale(${pose.faceScale.toFixed(4)})`;
        item.faceEl.style.opacity = pose.faceAlpha.toFixed(3);
      }
      if (item.plateEl) {
        const [sx, sy] = pose.shift;
        const [ox, oy] = pose.offset;
        item.plateEl.style.transform = `translate(${sx.toFixed(2)}px, ${sy.toFixed(2)}px) scale(${pose.plateScale.toFixed(4)}) rotate(${pose.angle.toFixed(3)}deg) translate(${ox.toFixed(2)}px, ${oy.toFixed(2)}px)`;
        item.plateEl.style.opacity = pose.plateAlpha.toFixed(3);
      }
    }

    tick(now) {
      this.raf = 0;
      const time = now / 1000;
      const dt = this.lastTime ? Math.min(1 / 30, time - this.lastTime) : 1 / 60;
      this.lastTime = time;

      const steps = Math.max(1, Math.ceil(dt * 240));
      const h = dt / steps;
      let moving = false;

      for (let i = 0; i < this.items.length; i++) {
        const item = this.items[i];
        const state = item.state;

        if (this.reduceMotion) {
          state.h = state.ht;
          state.p = state.pt;
          state.x = state.xt;
          state.y = state.yt;
          state.e = state.et;
          this.applyItem(item);
          continue;
        }

        for (let k = 0; k < steps; k++) {
          [state.h, state.hv] = drive(state.h, state.hv, state.ht, 180, 24, h);
          [state.p, state.pv] = drive(state.p, state.pv, state.pt, 440, 42, h);
          [state.x, state.xv] = drive(state.x, state.xv, state.xt, 100, 20, h);
          [state.y, state.yv] = drive(state.y, state.yv, state.yt, 100, 20, h);
          [state.e, state.ev] = drive(state.e, state.ev, state.et, 65, 16, h);
        }

        const pairs = [
          ['h', 'hv', 'ht'],
          ['p', 'pv', 'pt'],
          ['x', 'xv', 'xt'],
          ['y', 'yv', 'yt'],
          ['e', 'ev', 'et']
        ];
        for (const [val, vel, target] of pairs) {
          if (Math.abs(state[target] - state[val]) < 0.0005 && Math.abs(state[vel]) < 0.001) {
            state[val] = state[target];
            state[vel] = 0;
          } else {
            moving = true;
          }
        }

        this.applyItem(item);
      }

      if (moving) this.raf = requestAnimationFrame(t => this.tick(t));
      else this.lastTime = 0;
    }

    wake() {
      if (!this.raf) {
        this.lastTime = performance.now() / 1000;
        this.raf = requestAnimationFrame(t => this.tick(t));
      }
    }

    bindEvents() {
      this.items.forEach(item => {
        const link = item.link;

        link.addEventListener('pointerenter', e => {
          if (e.pointerType !== 'touch') {
            item.state.ht = 1;
            this.wake();
          }
        });

        link.addEventListener('pointermove', e => {
          if (e.pointerType === 'touch') return;
          const rect = (item.iconEl || link).getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
          item.state.xt = clamp(x, -1, 1);
          item.state.yt = clamp(y, -1, 1);
          this.wake();
        });

        link.addEventListener('pointerleave', () => {
          item.state.ht = 0;
          item.state.xt = 0;
          item.state.yt = 0;
          item.state.pt = 0;
          this.wake();
        });

        link.addEventListener('pointerdown', () => {
          item.state.pt = 1;
          this.wake();
        });

        const release = () => {
          item.state.pt = 0;
          this.wake();
        };
        link.addEventListener('pointerup', release);
        link.addEventListener('pointercancel', release);

        link.addEventListener('focus', () => {
          item.state.ht = 1;
          this.wake();
        });
        link.addEventListener('blur', () => {
          item.state.ht = 0;
          this.wake();
        });
      });
    }
  }

  function initHeaderGlassIcons() {
    const nav = document.querySelector('.main-nav');
    if (!nav) return;
    window._headerGlassIcons = new HeaderGlassIcons(nav, {
      size: 26,
      tilt: 26,
      spread: 0.45,
      parallax: 0.85,
      hover: 'press'
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeaderGlassIcons);
  } else {
    initHeaderGlassIcons();
  }

  window.HeaderGlassIcons = HeaderGlassIcons;
})();
