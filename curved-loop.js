

(function () {
  'use strict';

  const VIEW_WIDTH = 1440;
  const VIEW_HEIGHT = 64;
  const MAX_FLING = 3800;
  const TAU = Math.PI * 2;

  const wrapOffset = (value, length) => (length > 0 ? (((value % length) + length) % length) - length : value);

  const edgeMask = (amount) => {
    const size = Math.min(Math.max(amount, 0), 1) * 50;
    if (size <= 0) return null;
    const steps = 10;
    const left = [];
    const right = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const alpha = (t * t * t * (t * (t * 6 - 15) + 10)).toFixed(3);
      left.push(`rgba(0, 0, 0, ${alpha}) ${(t * size).toFixed(2)}%`);
      right.unshift(`rgba(0, 0, 0, ${alpha}) ${(100 - t * size).toFixed(2)}%`);
    }
    return `linear-gradient(to right, ${[...left, ...right].join(', ')})`;
  };

  const getGeometry = (shape, curveAmount, fontSize) => {
    const baseline = VIEW_HEIGHT / 2 + fontSize * 0.35;
    const flat = {
      viewBox: `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`,
      baseline
    };

    if (shape === 'line') {
      return {
        ...flat,
        d: `M-400,${baseline} L${VIEW_WIDTH + 400},${baseline}`
      };
    }
    if (shape === 'wave') {
      const amp = curveAmount * 0.25;
      const waveLength = 960;
      const k = TAU / waveLength;
      const count = 12;
      const from = -200;
      const to = VIEW_WIDTH + 200;
      const step = (to - from) / count;
      let d = `M${from},${baseline + amp}`;
      for (let i = 0; i < count; i++) {
        const x0 = from + i * step;
        const x1 = x0 + step;
        const cpX1 = x0 + step / 3;
        const cpX2 = x1 - step / 3;
        const y0 = baseline + amp * Math.cos(k * (x0 - VIEW_WIDTH / 2));
        const y1 = baseline + amp * Math.cos(k * (x1 - VIEW_WIDTH / 2));
        d += ` C${cpX1.toFixed(1)},${y0.toFixed(1)} ${cpX2.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
      }
      return { ...flat, d };
    }
    
    return {
      ...flat,
      d: `M-300,${baseline - 10} Q${VIEW_WIDTH / 2},${baseline + curveAmount} ${VIEW_WIDTH + 300},${baseline - 10}`
    };
  };

  let loopIdCounter = 0;

  class CurvedLoop {
    constructor(element, options = {}) {
      this.container = element;
      this.options = Object.assign(
        {
          marqueeText: 'WEB EXPERIENCES ✦ SOFTWARE SYSTEMS ✦ VISUAL CRAFT ✦ CARE IN THE DETAILS',
          items: ['WEB EXPERIENCES', 'SOFTWARE SYSTEMS', 'VISUAL CRAFT', 'CARE IN THE DETAILS'],
          separator: '✦',
          separatorColor: 'var(--signal)',
          color: 'var(--paper)',
          speed: 0, 
          direction: 'left',
          shape: 'line',
          curveAmount: 0,
          fontSize: 19,
          fontWeight: 700,
          letterSpacing: 2.2,
          interactive: true,
          scrollBoost: 0.35,
          edgeFade: 0.08
        },
        options
      );

      this.pathId = `curved-loop-path-${++loopIdCounter}`;
      this.spacing = 0;
      this.offset = 0;
      this.velocity = 0;
      this.direction = this.options.direction;
      this.dragging = false;
      this.dragX = 0;
      this.dragTime = 0;
      this.dragVelocity = 0;
      this.lastScrollY = window.scrollY;
      this.scrollDistance = 0;
      this.scrollLevel = 0;
      this.rafId = 0;
      this.lastTick = 0;

      this.init();
    }

    init() {
      this.container.classList.add('curved-loop-jacket');
      this.container.setAttribute('role', 'region');
      this.container.setAttribute('aria-label', 'Interactive loop: grab and drag left or right');

      const mask = edgeMask(this.options.edgeFade);
      if (mask) {
        this.container.style.maskImage = mask;
        this.container.style.webkitMaskImage = mask;
      }

      this.render();
      this.bindEvents();
      this.measure();

      if (document.fonts?.ready) {
        document.fonts.ready.then(() => this.measure());
      }

      if ('ResizeObserver' in window) {
        this.resizeObs = new ResizeObserver(() => this.measure());
        this.resizeObs.observe(this.container);
      }

      this.startLoop();
    }

    buildUnitString() {
      
      const sep = String(this.options.separator || '').trim();
      const items = this.options.items || this.options.marqueeText.split(sep).map((s) => s.trim()).filter(Boolean);

      const parts = [];
      items.forEach((item) => {
        parts.push(item);
        if (sep) parts.push(sep);
      });
      return parts;
    }

    render() {
      const { shape, curveAmount, fontSize, fontWeight, letterSpacing, color } = this.options;
      const geometry = getGeometry(shape, curveAmount, fontSize);
      this.geometry = geometry;

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'curved-loop-svg');
      svg.setAttribute('viewBox', geometry.viewBox);
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.setAttribute('aria-hidden', 'true');
      svg.style.fontSize = `${fontSize}px`;
      svg.style.fontWeight = fontWeight;
      svg.style.letterSpacing = `${letterSpacing}px`;

      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('id', this.pathId);
      path.setAttribute('d', geometry.d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'transparent');
      defs.appendChild(path);
      svg.appendChild(defs);

      const measureText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      measureText.setAttribute('class', 'curved-loop-measure');
      measureText.setAttribute('xml:space', 'preserve');
      measureText.style.visibility = 'hidden';
      measureText.style.opacity = '0';
      measureText.style.pointerEvents = 'none';

      const unitParts = this.buildUnitString();
      unitParts.forEach((part) => {
        const span = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        span.textContent = `\u00A0\u00A0\u00A0${part}\u00A0\u00A0\u00A0`;
        measureText.appendChild(span);
      });
      svg.appendChild(measureText);

      const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textEl.setAttribute('class', 'curved-loop-text');
      textEl.setAttribute('xml:space', 'preserve');
      textEl.setAttribute('fill', color);

      const textPath = document.createElementNS('http://www.w3.org/2000/svg', 'textPath');
      textPath.setAttribute('href', `#${this.pathId}`);
      textPath.setAttribute('startOffset', '0px');
      textPath.setAttribute('xml:space', 'preserve');
      textEl.appendChild(textPath);

      svg.appendChild(textEl);

      this.container.innerHTML = '';
      this.container.appendChild(svg);

      this.svgEl = svg;
      this.measureEl = measureText;
      this.textPathEl = textPath;
      this.pathEl = path;
    }

    measure() {
      if (!this.measureEl) return;
      const length = this.measureEl.getComputedTextLength();
      if (!length || length === this.spacing) return;

      this.spacing = length;
      this.pathLength = this.pathEl.getTotalLength?.() || 2400;

      const neededCopies = Math.max(3, Math.ceil((this.pathLength * 1.5) / length) + 2);
      this.populateText(neededCopies);
      this.applyOffset(this.offset);
    }

    populateText(copies) {
      if (!this.textPathEl) return;
      this.textPathEl.innerHTML = '';

      const sep = String(this.options.separator || '').trim();
      const items = this.options.items || this.options.marqueeText.split(sep).map((s) => s.trim()).filter(Boolean);

      for (let c = 0; c < copies; c++) {
        items.forEach((item) => {
          
          const wordSpan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
          wordSpan.textContent = `\u00A0\u00A0\u00A0${item}\u00A0\u00A0\u00A0`;
          wordSpan.setAttribute('fill', this.options.color);
          this.textPathEl.appendChild(wordSpan);

          if (sep) {
            const sepSpan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            sepSpan.textContent = `${sep}`;
            sepSpan.setAttribute('fill', this.options.separatorColor);
            sepSpan.setAttribute('class', 'curved-loop-separator');
            this.textPathEl.appendChild(sepSpan);
          }
        });
      }
    }

    applyOffset(val) {
      if (this.textPathEl) {
        this.textPathEl.setAttribute('startOffset', `${val.toFixed(2)}px`);
      }
    }

    bindEvents() {
      if (!this.options.interactive) return;

      const onPointerDown = (e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        this.dragging = true;
        this.dragX = e.clientX;
        this.dragTime = performance.now();
        this.dragVelocity = 0;
        this.velocity = 0;

        this.container.classList.add('is-dragging');
        if (this.container.setPointerCapture) {
          try {
            this.container.setPointerCapture(e.pointerId);
          } catch (_) {}
        }
      };

      const onPointerMove = (e) => {
        if (!this.dragging) return;
        const now = performance.now();
        const rect = this.svgEl.getBoundingClientRect();
        const width = rect.width || VIEW_WIDTH;
        const scale = VIEW_WIDTH / width;

        const delta = (e.clientX - this.dragX) * scale;
        const dt = Math.max(now - this.dragTime, 1) / 1000;

        this.dragX = e.clientX;
        this.dragTime = now;
        this.dragVelocity = this.dragVelocity * 0.45 + (delta / dt) * 0.55;

        this.offset = wrapOffset(this.offset + delta, this.spacing);
        this.applyOffset(this.offset);
      };

      const onPointerUp = (e) => {
        if (!this.dragging) return;
        this.dragging = false;
        this.container.classList.remove('is-dragging');

        const now = performance.now();
        const fling = now - this.dragTime > 120 ? 0 : Math.max(-MAX_FLING, Math.min(MAX_FLING, this.dragVelocity));
        this.velocity = fling;

        if (this.container.releasePointerCapture && e.pointerId) {
          try {
            this.container.releasePointerCapture(e.pointerId);
          } catch (_) {}
        }
      };

      this.container.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerup', onPointerUp, { passive: true });
      window.addEventListener('pointercancel', onPointerUp, { passive: true });

      if (this.options.scrollBoost) {
        window.addEventListener(
          'scroll',
          () => {
            const currentY = window.scrollY;
            const diff = Math.abs(currentY - this.lastScrollY);
            this.lastScrollY = currentY;
            this.scrollDistance += diff;
          },
          { passive: true }
        );
      }
    }

    startLoop() {
      let isVisible = true;

      const runTick = (now) => {
        this.rafId = 0;
        if (!isVisible) return;

        const dt = this.lastTick ? Math.min((now - this.lastTick) / 1000, 0.05) : 0;
        this.lastTick = now;

        if (!this.dragging && this.spacing > 0) {
          
          const baseVelocity = this.options.speed * 60;
          const target = this.options.direction === 'right' ? baseVelocity : -baseVelocity;

          this.velocity += (target - this.velocity) * (1 - Math.exp(-dt * 3.2));

          let scrollExtra = 0;
          if (this.options.scrollBoost && this.scrollDistance > 0) {
            const rate = this.scrollDistance / Math.max(dt, 0.001);
            this.scrollLevel += (rate - this.scrollLevel) * (1 - Math.exp(-dt * 5));
            this.scrollDistance = 0;
            const sign = this.options.direction === 'right' ? 1 : -1;
            scrollExtra = sign * this.scrollLevel * this.options.scrollBoost * 0.25;
          } else {
            this.scrollLevel *= Math.exp(-dt * 6);
          }

          const step = (this.velocity + scrollExtra) * dt;
          if (Math.abs(step) > 0.001) {
            this.offset = wrapOffset(this.offset + step, this.spacing);
            this.applyOffset(this.offset);
          }
        }

        if (isVisible) {
          this.rafId = requestAnimationFrame(runTick);
        }
      };

      const kick = () => {
        if (!this.rafId && isVisible) {
          this.lastTick = performance.now();
          this.rafId = requestAnimationFrame(runTick);
        }
      };

      if ('IntersectionObserver' in window) {
        const obs = new IntersectionObserver(([entry]) => {
          isVisible = entry.isIntersecting;
          if (isVisible) kick();
          else if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = 0;
          }
        });
        obs.observe(this.container);
      }

      kick();
    }

    destroy() {
      if (this.rafId) cancelAnimationFrame(this.rafId);
      if (this.resizeObs) this.resizeObs.disconnect();
    }
  }

  function initAllCurvedLoops() {
    const targets = document.querySelectorAll('[data-curved-loop], .signal-strip-loop');
    targets.forEach((el) => {
      if (el._curvedLoopInstance) return;

      const shape = el.getAttribute('data-shape') || 'line';
      const speed = parseFloat(el.getAttribute('data-speed') || '0'); 
      const fontSize = parseFloat(el.getAttribute('data-font-size') || '19');
      const letterSpacing = parseFloat(el.getAttribute('data-letter-spacing') || '2.2');
      const separator = el.getAttribute('data-separator') || '✦';

      el._curvedLoopInstance = new CurvedLoop(el, {
        shape,
        speed,
        fontSize,
        letterSpacing,
        separator,
        color: 'var(--paper)',
        separatorColor: 'var(--signal)',
        interactive: true,
        scrollBoost: 0.25
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllCurvedLoops);
  } else {
    initAllCurvedLoops();
  }

  window.CurvedLoop = CurvedLoop;
})();
