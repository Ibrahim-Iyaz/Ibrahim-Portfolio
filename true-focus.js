

(function () {
  'use strict';

  const CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  const FRAME_GAP = 10;

  class TrueFocus {
    constructor(container, options = {}) {
      this.container = container;
      this.options = Object.assign(
        {
          sentence: "IBRAHIM'S PORTFOLIO",
          separator: ' ',
          manualMode: false,
          focusStyle: 'brackets',
          order: 'sequential',
          easing: 'smooth',
          blurAmount: 5,
          focusScale: 1.05,
          borderColor: '#A855F7',
          highlightColor: undefined,
          glowColor: 'rgba(168, 85, 247, 0.65)',
          animationDuration: 0.5,
          pauseBetweenAnimations: 0.85,
          cornerSize: 16,
          borderWidth: 3,
          unfocusedOpacity: 0.35
        },
        options
      );

      this.words = this.options.sentence.split(this.options.separator).filter(w => w.trim() !== '');
      this.currentIndex = 0;
      this.wordEls = [];
      this.cornerEls = {};
      this.timer = null;
      this.resizeObs = null;
      this.isAlive = true;

      this.init();
    }

    init() {
      this.container.classList.add('focus-container');
      this.container.style.setProperty('--border-color', this.options.borderColor);
      this.container.style.setProperty(
        '--highlight-color',
        `color-mix(in srgb, ${this.options.highlightColor ?? this.options.borderColor} 30%, transparent)`
      );
      this.container.style.setProperty('--glow-color', this.options.glowColor);
      this.container.style.setProperty('--corner-size', `${this.options.cornerSize}px`);
      this.container.style.setProperty('--border-width', `${this.options.borderWidth}px`);

      this.container.innerHTML = '';

      this.words.forEach((wordText, i) => {
        const span = document.createElement('span');
        span.className = `focus-word ${this.options.manualMode ? 'manual' : ''}`;
        span.textContent = wordText;
        if (this.options.manualMode) {
          span.addEventListener('mouseenter', () => this.setIndex(i));
        }
        this.container.appendChild(span);
        this.wordEls.push(span);
      });

      this.frameEl = document.createElement('div');
      this.frameEl.className = 'focus-frame';
      this.frameEl.setAttribute('aria-hidden', 'true');

      CORNERS.forEach(corner => {
        const c = document.createElement('span');
        c.className = `corner ${corner}`;
        this.frameEl.appendChild(c);
        this.cornerEls[corner] = c;
      });

      this.container.appendChild(this.frameEl);

      this.measureAndAlign();

      if (!this.options.manualMode && this.words.length > 1) {
        this.startCycle();
      }

      if ('ResizeObserver' in window) {
        this.resizeObs = new ResizeObserver(() => this.measureAndAlign());
        this.resizeObs.observe(this.container);
        this.wordEls.forEach(el => this.resizeObs.observe(el));
      }
    }

    startCycle() {
      if (this.timer) clearInterval(this.timer);
      const interval = (this.options.animationDuration + this.options.pauseBetweenAnimations) * 1000;
      this.timer = setInterval(() => {
        if (!this.isAlive) return;
        this.setIndex((this.currentIndex + 1) % this.words.length);
      }, interval);
    }

    setIndex(idx) {
      if (!this.isAlive) return;
      this.currentIndex = idx % this.words.length;
      this.measureAndAlign();
    }

    measureAndAlign() {
      if (!this.isAlive || !this.wordEls.length) return;
      const activeWord = this.wordEls[this.currentIndex];
      if (!activeWord) return;

      const dur = this.options.animationDuration;
      const blur = this.options.blurAmount;
      const unfocusedOp = this.options.unfocusedOpacity;
      const scale = this.options.focusScale;

      this.wordEls.forEach((el, idx) => {
        const isActive = idx === this.currentIndex;
        el.style.filter = `blur(${isActive ? 0 : blur}px)`;
        el.style.opacity = isActive ? 1 : unfocusedOp;
        el.style.transform = scale !== 1 ? `scale(${isActive ? scale : 1})` : 'none';
        el.style.transition = `filter ${dur}s ease, opacity ${dur}s ease, transform ${dur}s cubic-bezier(0.65, 0, 0.35, 1)`;
        if (isActive) el.classList.add('active');
        else el.classList.remove('active');
      });

      const x = activeWord.offsetLeft - (activeWord.offsetWidth * (scale - 1)) / 2;
      const y = activeWord.offsetTop - (activeWord.offsetHeight * (scale - 1)) / 2;
      const width = activeWord.offsetWidth * scale;
      const height = activeWord.offsetHeight * scale;
      const cornerSize = this.options.cornerSize;

      const corners = {
        'top-left': { x: x - FRAME_GAP, y: y - FRAME_GAP },
        'top-right': { x: x + width + FRAME_GAP - cornerSize, y: y - FRAME_GAP },
        'bottom-left': { x: x - FRAME_GAP, y: y + height + FRAME_GAP - cornerSize },
        'bottom-right': { x: x + width + FRAME_GAP - cornerSize, y: y + height + FRAME_GAP - cornerSize }
      };

      CORNERS.forEach(corner => {
        const el = this.cornerEls[corner];
        if (el) {
          const pt = corners[corner];
          el.style.transform = `translate3d(${pt.x}px, ${pt.y}px, 0)`;
          el.style.transition = `transform ${dur}s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease`;
          el.style.opacity = '1';
        }
      });
    }

    destroy() {
      this.isAlive = false;
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      if (this.resizeObs) this.resizeObs.disconnect();
    }
  }

  window.TrueFocus = TrueFocus;
})();
