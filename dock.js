

(function () {
  'use strict';

  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

  class DockEngine {
    constructor(container, options = {}) {
      this.container = container;
      this.options = Object.assign(
        {
          baseItemSize: 46,
          magnification: 68,
          distance: 140,
          panelHeight: 62,
          gap: 10,
          bounce: true
        },
        options
      );

      this.dockEl = container.querySelector('.dock') || container;
      this.items = Array.from(this.dockEl.querySelectorAll('.dock-item:not(.dock-separator)'));
      this.separators = Array.from(this.dockEl.querySelectorAll('.dock-separator'));
      if (!this.items.length) return;

      this.pointer = { x: 0, y: 0, localX: -9999, inside: false };
      this.motion = new Map();
      this.itemCenters = [];
      this.dockRect = null;
      this.raf = 0;
      this.lastTick = 0;
      this.fit = 1;
      this.activeSection = '';

      this.init();
    }

    init() {
      this.dockEl.classList.add('dock', 'dock--bottom');

      this.items.forEach((item, index) => {
        item.setAttribute('tabindex', '0');
        let tile = item.querySelector('.dock-tile');
        if (!tile) {
          tile = document.createElement('span');
          tile.className = 'dock-tile';
          while (item.firstChild) tile.appendChild(item.firstChild);
          item.appendChild(tile);
        }

        const labelText = item.getAttribute('data-label') || item.getAttribute('aria-label');
        if (labelText && !item.querySelector('.dock-label')) {
          const label = document.createElement('span');
          label.className = 'dock-label';
          label.setAttribute('aria-hidden', 'true');
          label.textContent = labelText;
          item.appendChild(label);
        }

        if (!item.querySelector('.dock-dot')) {
          const dot = document.createElement('span');
          dot.className = 'dock-dot';
          dot.setAttribute('aria-hidden', 'true');
          item.appendChild(dot);
        }

        this.motion.set(index, {
          scale: 1,
          liftY: 0,
          shiftX: 0,
          hopOffset: 0,
          hopVelocity: 0,
          hopping: false,
          tile,
          node: item
        });
      });

      this.measureFit();
      this.bindEvents();
      this.initSectionObserver();
      this.wake();
    }

    measureFit() {
      const room = (window.innerWidth || document.documentElement.clientWidth) - 32;
      const totalWidth =
        this.items.length * this.options.baseItemSize +
        this.separators.length * 2 +
        (this.items.length + this.separators.length) * this.options.gap +
        36;
      this.fit = totalWidth > room ? Math.max(0.68, room / totalWidth) : 1;

      const base = this.options.baseItemSize * this.fit;
      const thickness = this.options.panelHeight * this.fit;
      const gap = this.options.gap * this.fit;

      this.dockEl.style.setProperty('--dock-base', `${base.toFixed(1)}px`);
      this.dockEl.style.setProperty('--dock-thickness', `${thickness.toFixed(1)}px`);
      this.dockEl.style.setProperty('--dock-gap', `${gap.toFixed(1)}px`);

      this.dockRect = this.dockEl.getBoundingClientRect();
      this.itemCenters = this.items.map(item => item.offsetLeft + item.offsetWidth * 0.5);
    }

    hop(index) {
      if (!this.options.bounce) return;
      const state = this.motion.get(index);
      if (!state || state.hopping) return;

      state.hopping = true;
      state.hopVelocity = 380 * this.fit; 
      state.hopOffset = 0;
      state.node.setAttribute('data-hop', '');
      this.wake();
    }

    bindEvents() {
      const updatePointer = (e) => {
        if (!this.dockRect) this.dockRect = this.dockEl.getBoundingClientRect();
        this.pointer.x = e.clientX;
        this.pointer.y = e.clientY;
        this.pointer.localX = e.clientX - this.dockRect.left;
        this.pointer.inside = true;
        this.wake();
      };

      const onEnter = (e) => {
        this.dockRect = this.dockEl.getBoundingClientRect();
        this.itemCenters = this.items.map(item => item.offsetLeft + item.offsetWidth * 0.5);
        updatePointer(e);
      };

      const onLeave = () => {
        this.pointer.inside = false;
        this.wake();
      };

      this.dockEl.addEventListener('pointerenter', onEnter, { passive: true });
      this.dockEl.addEventListener('pointermove', updatePointer, { passive: true });
      this.dockEl.addEventListener('pointerdown', updatePointer, { passive: true });
      this.dockEl.addEventListener('pointerleave', onLeave, { passive: true });
      this.dockEl.addEventListener('pointercancel', onLeave, { passive: true });

      window.addEventListener('resize', () => {
        this.measureFit();
        this.wake();
      }, { passive: true });

      window.addEventListener('scroll', () => {
        this.dockRect = null;
      }, { passive: true });

      this.items.forEach((item, index) => {
        item.addEventListener('click', (e) => {
          this.hop(index);

          const targetSelector = item.getAttribute('data-target') || item.getAttribute('href');
          if (targetSelector && targetSelector.startsWith('#')) {
            e.preventDefault();
            const targetEl = document.querySelector(targetSelector);
            if (targetEl) {
              const navHeight = 70;
              const top = targetEl.getBoundingClientRect().top + window.scrollY - navHeight;
              window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
              history.pushState(null, '', targetSelector);
            }
          }
        });
      });
    }

    initSectionObserver() {
      
      const sectionIds = [
        'top',
        'work',
        'about',
        'breakoutGame',
        'toolkit',
        'certifications',
        'creative',
        'contact'
      ];

      const sections = sectionIds
        .map((id) => document.getElementById(id))
        .filter(Boolean);

      if (!('IntersectionObserver' in window)) return;

      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const id = entry.target.id;
              this.activeSection = id;
              this.items.forEach((item) => {
                const target = (item.getAttribute('data-target') || item.getAttribute('href') || '').replace('#', '');
                if (target === id) {
                  item.classList.add('is-active');
                } else {
                  item.classList.remove('is-active');
                }
              });
            }
          });
        },
        { threshold: 0.22, rootMargin: '-10% 0px -40% 0px' }
      );

      sections.forEach((s) => obs.observe(s));
    }

    wake() {
      if (this.raf) return;
      this.lastTick = performance.now();
      this.raf = requestAnimationFrame((now) => this.tick(now));
    }

    tick(now) {
      this.raf = 0;
      const dt = Math.min(1 / 30, Math.max(0.001, (now - this.lastTick) / 1000));
      this.lastTick = now;

      const maxScale = (this.options.magnification / this.options.baseItemSize);
      const radius = this.options.distance * this.fit;
      const blend = 1 - Math.exp(-dt * 36); 
      let isMoving = false;

      const localX = this.pointer.inside ? this.pointer.localX : -9999;

      this.items.forEach((item, index) => {
        const state = this.motion.get(index);
        if (!state) return;

        const itemCenter = this.itemCenters[index] || 0;
        const dist = Math.abs(localX - itemCenter);

        let targetScale = 1.0;
        let targetLiftY = 0;
        let targetShiftX = 0;

        if (this.pointer.inside && dist < radius) {
          const norm = dist / radius;
          
          const factor = Math.cos((norm * Math.PI) / 2) ** 2;
          targetScale = 1.0 + (maxScale - 1.0) * factor;
          targetLiftY = (targetScale - 1.0) * (20 * this.fit);
          
          const dir = localX < itemCenter ? 1 : -1;
          targetShiftX = dir * (targetScale - 1.0) * (10 * this.fit) * (1 - norm);
        }

        state.scale += (targetScale - state.scale) * blend;
        state.liftY += (targetLiftY - state.liftY) * blend;
        state.shiftX += (targetShiftX - state.shiftX) * blend;

        if (state.hopping) {
          state.hopVelocity -= 1400 * dt; 
          state.hopOffset += state.hopVelocity * dt;

          if (state.hopOffset <= 0) {
            state.hopOffset = 0;
            state.hopVelocity *= -0.32; 
            if (Math.abs(state.hopVelocity) < 60) {
              state.hopVelocity = 0;
              state.hopOffset = 0;
              state.hopping = false;
              item.removeAttribute('data-hop');
            }
          }
        }

        const effectiveLift = state.liftY + state.hopOffset;

        if (
          Math.abs(targetScale - state.scale) > 0.001 ||
          Math.abs(targetLiftY - state.liftY) > 0.05 ||
          Math.abs(targetShiftX - state.shiftX) > 0.05 ||
          state.hopping
        ) {
          isMoving = true;
        }

        state.tile.style.transform = `translate3d(${state.shiftX.toFixed(2)}px, ${(-effectiveLift).toFixed(2)}px, 0) scale(${state.scale.toFixed(3)})`;

        item.style.zIndex = state.scale > 1.08 ? '10' : '1';
      });

      if (isMoving) {
        this.raf = requestAnimationFrame((n) => this.tick(n));
      }
    }
  }

  function initDock() {
    const dockContainer = document.getElementById('dockContainer');
    if (dockContainer) {
      window._portfolioDock = new DockEngine(dockContainer);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDock);
  } else {
    initDock();
  }

  window.DockEngine = DockEngine;
})();
