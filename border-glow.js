

(function () {
  'use strict';

  function parseHSL(hslStr) {
    if (!hslStr) return { h: 28, s: 95, l: 65 };
    const match = String(hslStr).match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
    if (!match) return { h: 28, s: 95, l: 65 };
    return { h: parseFloat(match[1]), s: parseFloat(match[2]), l: parseFloat(match[3]) };
  }

  function buildGlowVars(glowColor, intensity = 1.0) {
    const { h, s, l } = parseHSL(glowColor);
    const base = `${h}deg ${s}% ${l}%`;
    const opacities = [100, 60, 50, 40, 30, 20, 10];
    const keys = ['', '-60', '-50', '-40', '-30', '-20', '-10'];
    const vars = {};
    for (let i = 0; i < opacities.length; i++) {
      vars[`--glow-color${keys[i]}`] = `hsl(${base} / ${Math.min(opacities[i] * intensity, 100)}%)`;
    }
    vars['--glow-color-solid'] = `hsl(${base})`;
    return vars;
  }

  const GRADIENT_POSITIONS = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%'];
  const GRADIENT_KEYS = [
    '--gradient-one',
    '--gradient-two',
    '--gradient-three',
    '--gradient-four',
    '--gradient-five',
    '--gradient-six',
    '--gradient-seven'
  ];
  const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];

  function buildGradientVars(colors) {
    const vars = {};
    for (let i = 0; i < 7; i++) {
      const c = colors[Math.min(COLOR_MAP[i], colors.length - 1)];
      vars[GRADIENT_KEYS[i]] = `radial-gradient(at ${GRADIENT_POSITIONS[i]}, ${c} 0px, transparent 50%)`;
    }
    vars['--gradient-base'] = `linear-gradient(${colors[0]} 0 100%)`;
    return vars;
  }

  function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
  }
  function easeInCubic(x) {
    return x * x * x;
  }

  function animateValue({ start = 0, end = 100, duration = 1000, delay = 0, ease = easeOutCubic, onUpdate, onEnd }) {
    const t0 = performance.now() + delay;
    function tick() {
      const elapsed = performance.now() - t0;
      const t = Math.min(Math.max(elapsed / duration, 0), 1);
      onUpdate(start + (end - start) * ease(t));
      if (t < 1) requestAnimationFrame(tick);
      else if (onEnd) onEnd();
    }
    setTimeout(() => requestAnimationFrame(tick), delay);
  }

  class BorderGlowInstance {
    constructor(element, options = {}) {
      this.card = element;
      this.options = Object.assign(
        {
          edgeSensitivity: 25,
          glowColor: '28 95 65', 
          colors: ['#ff5a28', '#c084fc', '#38bdf8'], 
          borderRadius: 20,
          glowRadius: 36,
          glowIntensity: 1.1,
          coneSpread: 26,
          fillOpacity: 0.45,
          animatedSweep: false
        },
        options
      );

      this.rafScheduled = false;
      this.pointerX = 0;
      this.pointerY = 0;
      this.bounds = null;

      this.init();
    }

    init() {
      const card = this.card;
      card.classList.add('border-glow-card');

      let edgeLight = card.querySelector(':scope > .edge-light');
      if (!edgeLight) {
        edgeLight = document.createElement('span');
        edgeLight.className = 'edge-light';
        edgeLight.setAttribute('aria-hidden', 'true');
        card.prepend(edgeLight);
      }
      this.edgeLight = edgeLight;

      const computedRadius = window.getComputedStyle(card).borderRadius;
      const numericRadius = parseFloat(computedRadius) || this.options.borderRadius;

      card.style.setProperty('--border-radius', `${numericRadius}px`);
      card.style.setProperty('--edge-sensitivity', this.options.edgeSensitivity);
      card.style.setProperty('--glow-padding', `${this.options.glowRadius}px`);
      card.style.setProperty('--cone-spread', this.options.coneSpread);
      card.style.setProperty('--fill-opacity', this.options.fillOpacity);

      this.applyTheme();
      this.bindEvents();

      if (this.options.animatedSweep) {
        this.triggerSweep();
      }
    }

    applyTheme() {
      const isDark = document.documentElement.dataset.theme === 'dark';
      const activeTheme = isDark
        ? (this.options.darkTheme || { colors: this.options.colors, glowColor: this.options.glowColor })
        : (this.options.lightTheme || { colors: this.options.colors, glowColor: this.options.glowColor });

      const glowVars = buildGlowVars(activeTheme.glowColor, this.options.glowIntensity);
      Object.entries(glowVars).forEach(([k, v]) => this.card.style.setProperty(k, v));

      const gradVars = buildGradientVars(activeTheme.colors);
      Object.entries(gradVars).forEach(([k, v]) => this.card.style.setProperty(k, v));
    }

    getCenterOfElement() {
      if (!this.bounds) this.bounds = this.card.getBoundingClientRect();
      return [this.bounds.width / 2, this.bounds.height / 2];
    }

    getEdgeProximity(x, y) {
      const [cx, cy] = this.getCenterOfElement();
      const dx = x - cx;
      const dy = y - cy;
      let kx = Infinity;
      let ky = Infinity;
      if (dx !== 0) kx = cx / Math.abs(dx);
      if (dy !== 0) ky = cy / Math.abs(dy);
      return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
    }

    getCursorAngle(x, y) {
      const [cx, cy] = this.getCenterOfElement();
      const dx = x - cx;
      const dy = y - cy;
      if (dx === 0 && dy === 0) return 0;
      const radians = Math.atan2(dy, dx);
      let degrees = radians * (180 / Math.PI) + 90;
      if (degrees < 0) degrees += 360;
      return degrees;
    }

    updateGlow() {
      this.rafScheduled = false;
      const card = this.card;
      if (!this.bounds) this.bounds = card.getBoundingClientRect();

      const x = this.pointerX - this.bounds.left;
      const y = this.pointerY - this.bounds.top;

      const edge = this.getEdgeProximity(x, y);
      const angle = this.getCursorAngle(x, y);

      card.style.setProperty('--edge-proximity', (edge * 100).toFixed(2));
      card.style.setProperty('--cursor-angle', `${angle.toFixed(1)}deg`);
    }

    bindEvents() {
      const card = this.card;

      const onPointerEnter = (e) => {
        this.bounds = card.getBoundingClientRect();
        this.pointerX = e.clientX;
        this.pointerY = e.clientY;
        this.updateGlow();
      };

      const onPointerMove = (e) => {
        this.pointerX = e.clientX;
        this.pointerY = e.clientY;
        if (!this.rafScheduled) {
          this.rafScheduled = true;
          requestAnimationFrame(() => this.updateGlow());
        }
      };

      const onPointerLeave = () => {
        this.bounds = null;
        card.style.setProperty('--edge-proximity', '0');
      };

      card.addEventListener('pointerenter', onPointerEnter, { passive: true });
      card.addEventListener('pointermove', onPointerMove, { passive: true });
      card.addEventListener('pointerleave', onPointerLeave, { passive: true });
    }

    triggerSweep() {
      const card = this.card;
      const angleStart = 110;
      const angleEnd = 470;
      card.classList.add('sweep-active');
      card.style.setProperty('--cursor-angle', `${angleStart}deg`);

      animateValue({ duration: 450, onUpdate: (v) => card.style.setProperty('--edge-proximity', v) });
      animateValue({
        ease: easeInCubic,
        duration: 1200,
        end: 50,
        onUpdate: (v) => {
          card.style.setProperty('--cursor-angle', `${(angleEnd - angleStart) * (v / 100) + angleStart}deg`);
        }
      });
      animateValue({
        ease: easeOutCubic,
        delay: 1200,
        duration: 1600,
        start: 50,
        end: 100,
        onUpdate: (v) => {
          card.style.setProperty('--cursor-angle', `${(angleEnd - angleStart) * (v / 100) + angleStart}deg`);
        }
      });
      animateValue({
        ease: easeInCubic,
        delay: 2400,
        duration: 900,
        start: 100,
        end: 0,
        onUpdate: (v) => card.style.setProperty('--edge-proximity', v),
        onEnd: () => card.classList.remove('sweep-active')
      });
    }
  }

  function initAllBorderGlows() {
    const selector = `
      .project-feature,
      .project-row,
      .about-statement,
      .about-details,
      .about-card,
      .experience-item,
      .toolkit-card,
      .cert-card,
      [data-border-glow]
    `;

    const isDark = document.documentElement.dataset.theme === 'dark';

    const cards = document.querySelectorAll(selector);
    cards.forEach((card) => {
      if (card._borderGlowInstance) return;

      let darkTheme = {
        colors: ['#ff5a28', '#c084fc', '#38bdf8'],
        glowColor: '28 95 65'
      };
      let lightTheme = {
        colors: ['#ea580c', '#9333ea', '#0284c7'],
        glowColor: '24 100 50'
      };

      if (card.classList.contains('solar-card') || card.classList.contains('project-feature')) {
        darkTheme = {
          colors: ['#ff5a28', '#fbbf24', '#38bdf8'],
          glowColor: '32 95 60'
        };
        lightTheme = {
          colors: ['#ea580c', '#d97706', '#0284c7'],
          glowColor: '22 100 50'
        };
      } else if (card.classList.contains('toolkit-card')) {
        darkTheme = {
          colors: ['#c084fc', '#38bdf8', '#ff5a28'],
          glowColor: '265 85 70'
        };
        lightTheme = {
          colors: ['#9333ea', '#0284c7', '#ea580c'],
          glowColor: '270 95 56'
        };
      } else if (card.classList.contains('cert-card')) {
        darkTheme = {
          colors: ['#38bdf8', '#ff5a28', '#4ade80'],
          glowColor: '198 90 60'
        };
        lightTheme = {
          colors: ['#0284c7', '#ea580c', '#16a34a'],
          glowColor: '200 100 48'
        };
      }

      card._borderGlowInstance = new BorderGlowInstance(card, {
        darkTheme,
        lightTheme,
        colors: isDark ? darkTheme.colors : lightTheme.colors,
        glowColor: isDark ? darkTheme.glowColor : lightTheme.glowColor,
        edgeSensitivity: 24,
        coneSpread: 28,
        glowRadius: 36,
        glowIntensity: 1.15
      });
    });

    if (!window._borderGlowThemeObserver) {
      window._borderGlowThemeObserver = new MutationObserver(() => {
        document.querySelectorAll(selector).forEach((card) => {
          if (card._borderGlowInstance) card._borderGlowInstance.applyTheme();
        });
      });
      window._borderGlowThemeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
      });
      window.addEventListener('themechange', () => {
        document.querySelectorAll(selector).forEach((card) => {
          if (card._borderGlowInstance) card._borderGlowInstance.applyTheme();
        });
      }, { passive: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllBorderGlows);
  } else {
    initAllBorderGlows();
  }

  window.BorderGlow = BorderGlowInstance;
})();
