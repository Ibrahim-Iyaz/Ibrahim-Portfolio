

(function () {
  'use strict';

  const GAUSSIAN_EDGE = Math.exp(-2);
  const WAVE_PERIOD = 3.2;
  const WAVE_PEAK = 0.7;

  const parseSettings = (settingsStr) => {
    const map = new Map();
    if (!settingsStr) return map;
    settingsStr
      .split(',')
      .map(part => part.trim())
      .filter(Boolean)
      .forEach(part => {
        const [name, value] = part.split(/\s+/);
        if (name && value !== undefined) {
          map.set(name.replace(/['"]/g, ''), parseFloat(value));
        }
      });
    return map;
  };

  const strengthAt = (distance, radius, falloff) => {
    if (distance >= radius) return 0;
    const norm = 1 - distance / radius;
    switch (falloff) {
      case 'exponential':
        return norm * norm;
      case 'gaussian':
        return (Math.exp(-2 * Math.pow(distance / radius, 2)) - GAUSSIAN_EDGE) / (1 - GAUSSIAN_EDGE);
      case 'linear':
      default:
        return norm;
    }
  };

  function prepareProximityDOM(root) {
    if (root.hasAttribute('data-vp-ready')) return;
    root.setAttribute('data-vp-ready', 'true');

    const fullText = root.textContent.trim().replace(/\s+/g, ' ');
    if (!root.getAttribute('aria-label')) {
      root.setAttribute('aria-label', fullText);
    }

    function processNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (!text) return document.createTextNode('');

        const fragment = document.createDocumentFragment();
        
        const tokens = text.split(/(\s+)/);

        for (const token of tokens) {
          if (!token) continue;
          if (/^\s+$/.test(token)) {
            
            const spaceSpan = document.createElement('span');
            spaceSpan.className = 'vp-space';
            spaceSpan.setAttribute('aria-hidden', 'true');
            spaceSpan.innerHTML = '&nbsp;';
            fragment.appendChild(spaceSpan);
          } else {
            
            const wordSpan = document.createElement('span');
            wordSpan.className = 'vp-word';
            wordSpan.style.display = 'inline-block';
            wordSpan.style.whiteSpace = 'nowrap';
            wordSpan.setAttribute('aria-hidden', 'true');

            for (let i = 0; i < token.length; i++) {
              const char = token[i];
              const charSpan = document.createElement('span');
              charSpan.className = 'vp-char';
              charSpan.textContent = char;
              charSpan.setAttribute('data-vp-char', '');
              charSpan.setAttribute('aria-hidden', 'true');
              wordSpan.appendChild(charSpan);
            }
            fragment.appendChild(wordSpan);
          }
        }
        return fragment;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName.toLowerCase() === 'br') return node;
        const children = Array.from(node.childNodes);
        children.forEach(child => {
          const replacement = processNode(child);
          if (replacement !== child) {
            node.replaceChild(replacement, child);
          }
        });
        return node;
      }
      return node;
    }

    const topChildren = Array.from(root.childNodes);
    topChildren.forEach(child => {
      const replacement = processNode(child);
      if (replacement !== child) {
        root.replaceChild(replacement, child);
      }
    });
  }

  class VariableProximityInstance {
    constructor(element, options = {}) {
      this.element = element;
      prepareProximityDOM(element);

      this.chars = Array.from(element.querySelectorAll('[data-vp-char]'));
      if (!this.chars.length) return;

      this.fromFontVariationSettings =
        options.fromFontVariationSettings ||
        element.getAttribute('data-from-settings') ||
        "'wght' 550, 'wdth' 75";

      this.toFontVariationSettings =
        options.toFontVariationSettings ||
        element.getAttribute('data-to-settings') ||
        "'wght' 950, 'wdth' 88";

      this.radius = parseFloat(options.radius || element.getAttribute('data-radius') || 130);
      this.falloff = options.falloff || element.getAttribute('data-falloff') || 'linear';
      this.smoothing = parseFloat(options.smoothing || element.getAttribute('data-smoothing') || 0.18);
      this.scale = parseFloat(options.scale || element.getAttribute('data-scale') || 1.05);
      this.lift = parseFloat(options.lift || element.getAttribute('data-lift') || 0.04);
      this.idleWave = Boolean(options.idleWave || element.getAttribute('data-idle-wave') === 'true');

      const fromMap = parseSettings(this.fromFontVariationSettings);
      const toMap = parseSettings(this.toFontVariationSettings);
      this.axes = Array.from(fromMap.entries()).map(([axis, fromValue]) => ({
        axis,
        fromValue,
        toValue: toMap.has(axis) ? toMap.get(axis) : fromValue
      }));

      this.growth = (this.scale || 1) - 1;
      this.rise = this.lift || 0;
      this.transformed = this.growth !== 0 || this.rise !== 0;

      this.levels = new Float32Array(this.chars.length);
      this.targets = new Float32Array(this.chars.length);
      this.written = new Array(this.chars.length);
      this.moved = new Array(this.chars.length);

      this.chars.forEach(char => {
        char.style.fontVariationSettings = this.fromFontVariationSettings;
      });

      this.inView = false;
      this.cachedCenters = [];
      this.docLeft = 0;
      this.docTop = 0;
      this.width = 0;
      this.height = 0;
      this.hasMeasured = false;

      if ('IntersectionObserver' in window) {
        this.observer = new IntersectionObserver((entries) => {
          this.inView = entries.some(e => e.isIntersecting);
          if (this.inView && !this.hasMeasured) this.measureLayout();
        }, { rootMargin: '120px 0px 120px 0px' });
        this.observer.observe(this.element);
      } else {
        this.inView = true;
      }

      window.addEventListener('resize', () => {
        this.hasMeasured = false;
        if (this.inView) this.measureLayout();
      }, { passive: true });
    }

    measureLayout() {
      if (!this.chars.length) return;
      const elRect = this.element.getBoundingClientRect();
      this.docLeft = elRect.left + (window.scrollX || window.pageXOffset || 0);
      this.docTop = elRect.top + (window.scrollY || window.pageYOffset || 0);
      this.width = elRect.width;
      this.height = elRect.height;
      this.cachedCenters = this.chars.map(char => {
        const cRect = char.getBoundingClientRect();
        return {
          x: cRect.left + cRect.width * 0.5 - elRect.left,
          y: cRect.top + cRect.height * 0.5 - elRect.top
        };
      });
      this.hasMeasured = true;
    }

    settingsAt(level) {
      return this.axes
        .map(({ axis, fromValue, toValue }) => `'${axis}' ${(fromValue + (toValue - fromValue) * level).toFixed(1)}`)
        .join(', ');
    }

    update(pointer, dt, now) {
      if (!this.chars.length || !this.inView) return false;

      if (!this.hasMeasured) {
        this.measureLayout();
      }

      const scrollX = window.scrollX || window.pageXOffset || 0;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const rectLeft = this.docLeft - scrollX;
      const rectTop = this.docTop - scrollY;
      const rectRight = rectLeft + this.width;
      const rectBottom = rectTop + this.height;

      const dx = Math.max(rectLeft - pointer.x, 0, pointer.x - rectRight);
      const dy = Math.max(rectTop - pointer.y, 0, pointer.y - rectBottom);
      const isNear = pointer.active && (dx * dx + dy * dy < this.radius * this.radius);

      let nearAny = false;
      const count = this.chars.length;

      if (isNear) {
        for (let i = 0; i < count; i++) {
          const center = this.cachedCenters[i];
          const cx = rectLeft + (center ? center.x : 0);
          const cy = rectTop + (center ? center.y : 0);
          const dist = Math.hypot(pointer.x - cx, pointer.y - cy);
          const strength = strengthAt(dist, this.radius, this.falloff);
          this.targets[i] = strength;
          if (strength > 0) nearAny = true;
        }
      } else {
        this.targets.fill(0);
      }

      const ease = this.smoothing > 0 ? 1 - Math.exp(-dt / (this.smoothing * 400)) : 1;
      let settling = false;

      for (let i = 0; i < count; i++) {
        const target = this.targets[i];
        const current = this.levels[i];
        let next = current + (target - current) * ease;

        if (Math.abs(target - next) < 0.002) {
          next = target;
        } else {
          settling = true;
        }
        this.levels[i] = next;

        const settings = next === 0 ? this.fromFontVariationSettings : this.settingsAt(next);
        if (this.written[i] !== settings) {
          this.written[i] = settings;
          this.chars[i].style.fontVariationSettings = settings;
        }

        if (this.transformed) {
          const shift =
            next === 0
              ? ''
              : `translateY(${(-this.rise * next).toFixed(3)}em) scale(${(1 + this.growth * next).toFixed(3)})`;
          if (this.moved[i] !== shift) {
            this.moved[i] = shift;
            this.chars[i].style.transform = shift;
          }
        }
      }

      return settling || nearAny;
    }
  }

  const instances = [];
  const pointer = { x: -1000, y: -1000, active: false };
  let animId = 0;
  let lastTime = 0;

  function tick(now) {
    animId = 0;
    const dt = lastTime ? Math.min(now - lastTime, 64) : 16;
    lastTime = now;

    let needsNext = false;
    for (let i = 0; i < instances.length; i++) {
      if (instances[i].update(pointer, dt, now)) {
        needsNext = true;
      }
    }

    if (needsNext) {
      animId = requestAnimationFrame(tick);
    } else {
      lastTime = 0;
    }
  }

  function schedule() {
    if (!animId) {
      lastTime = performance.now();
      animId = requestAnimationFrame(tick);
    }
  }

  function handleMove(x, y) {
    pointer.x = x;
    pointer.y = y;
    pointer.active = true;
    schedule();
  }

  window.addEventListener('pointermove', e => handleMove(e.clientX, e.clientY), { passive: true });
  window.addEventListener('touchmove', e => {
    const t = e.touches[0];
    if (t) handleMove(t.clientX, t.clientY);
  }, { passive: true });

  const onLeave = () => {
    pointer.active = false;
    schedule();
  };
  window.addEventListener('touchend', onLeave, { passive: true });
  window.addEventListener('touchcancel', onLeave, { passive: true });
  document.documentElement.addEventListener('mouseleave', onLeave, { passive: true });

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      schedule();
    });
  }

  function initVariableProximity(target, options = {}) {
    let elements = [];
    if (typeof target === 'string') {
      elements = Array.from(document.querySelectorAll(target));
    } else if (target instanceof HTMLElement) {
      elements = [target];
    } else if (target && target.length) {
      elements = Array.from(target);
    }

    elements.forEach(el => {
      if (el && !el.hasAttribute('data-vp-initialized')) {
        el.setAttribute('data-vp-initialized', 'true');
        el.classList.add('variable-proximity');
        const inst = new VariableProximityInstance(el, options);
        instances.push(inst);
      }
    });

    schedule();
  }

  function autoInit() {
    const headingSelectors = [
      '#heroTitle',
      '#workTitle',
      '#aboutTitle',
      '#experienceTitle',
      '#toolkitTitle',
      '#certTitle',
      '#creativeTitle',
      '#contactTitle',
      '.interlude > p',
      '.section-heading h2',
      '.contact-copy h2',
      '[data-variable-proximity]'
    ];

    headingSelectors.forEach(sel => {
      initVariableProximity(sel, {
        fromFontVariationSettings: "'wght' 550, 'wdth' 75",
        toFontVariationSettings: "'wght' 950, 'wdth' 88",
        radius: 135,
        falloff: 'linear',
        smoothing: 0.18,
        scale: 1.045,
        lift: 0.04
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

  window.initVariableProximity = initVariableProximity;
})();
