

(function (global) {
  'use strict';

  const PHYSICAL = { lift: true, blur: true, magnify: true };

  const falloff = (distance, radius) => {
    if (distance >= radius) return 0;
    const f = 1 - (distance / radius) ** 2;
    return f * f;
  };

  function initScrambledText(root, options = {}) {
    if (typeof root === 'string') {
      root = document.querySelector(root);
    }
    if (!root) return null;

    const ds = root.dataset || {};
    const settings = {
      radius: options.radius !== undefined ? Number(options.radius) : (ds.radius ? Number(ds.radius) : 100),
      duration: options.duration !== undefined ? Number(options.duration) : (ds.duration ? Number(ds.duration) : 1.2),
      speed: options.speed !== undefined ? Number(options.speed) : (ds.speed ? Number(ds.speed) : 0.5),
      scrambleChars: options.scrambleChars || ds.scrambleChars || '.:.:/\\*#+',
      scrambleColor: options.scrambleColor || ds.scrambleColor || '',
      effect: options.effect || ds.effect || 'scramble',
      strength: options.strength !== undefined ? Number(options.strength) : (ds.strength ? Number(ds.strength) : 1),
      trail: options.trail !== undefined ? Number(options.trail) : (ds.trail ? Number(ds.trail) : 0.6),
      clickBurst: options.clickBurst !== undefined ? Boolean(options.clickBurst) : (ds.clickBurst !== 'false'),
      intro: options.intro !== undefined ? Boolean(options.intro) : (ds.intro !== 'false')
    };

    let textEl = root.querySelector('p, span:not(.scrambled-text-sr)');
    if (!textEl) {
      const originalText = root.textContent.trim();
      root.innerHTML = `<span class="scrambled-text-sr">${originalText}</span><p aria-hidden="true">${originalText}</p>`;
      textEl = root.querySelector('p');
    }

    const lines = textEl.innerHTML.split(/<br\s*\/?>/i);
    textEl.innerHTML = '';

    const chars = [];
    const originals = [];
    const glyphs = [];
    const activeTweens = [];

    lines.forEach((lineHTML, lineIdx) => {
      if (lineIdx > 0) {
        textEl.appendChild(document.createElement('br'));
      }
      const temp = document.createElement('div');
      temp.innerHTML = lineHTML;
      const lineText = temp.textContent || '';
      const words = lineText.trim().split(/\s+/);

      words.forEach((word, wordIdx) => {
        if (!word) return;
        if (wordIdx > 0) {
          const space = document.createElement('span');
          space.className = 'scrambled-space';
          space.textContent = ' ';
          textEl.appendChild(space);
        }

        const wordSpan = document.createElement('span');
        wordSpan.className = 'scrambled-word';

        for (let i = 0; i < word.length; i++) {
          const ch = word[i];
          originals.push(ch);

          const charSpan = document.createElement('span');
          charSpan.className = 'scrambled-char';

          const sizer = document.createElement('span');
          sizer.className = 'scrambled-char-sizer';
          sizer.textContent = ch;

          const glyph = document.createElement('span');
          glyph.className = 'scrambled-char-glyph';
          glyph.textContent = ch;

          charSpan.appendChild(sizer);
          charSpan.appendChild(glyph);
          wordSpan.appendChild(charSpan);

          chars.push(charSpan);
          glyphs.push(glyph);
          activeTweens.push({ progress: 1, duration: 0, startTime: 0, revealTime: 0, active: false });
        }

        textEl.appendChild(wordSpan);
      });
    });

    const points = chars.map(() => ({ x: 0, y: 0, energy: 0, dx: 0, dy: 0, shown: false }));
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const pointer = { x: 0, y: 0, sx: 0, sy: 0, inside: false };
    const waves = [];
    let measured = false;
    let fontPx = 16;
    let raf = 0;
    let last = 0;

    const measure = () => {
      fontPx = parseFloat(window.getComputedStyle(textEl).fontSize) || 16;
      const rootRect = root.getBoundingClientRect();
      chars.forEach((char, i) => {
        const rect = char.getBoundingClientRect();
        points[i].x = rect.left - rootRect.left + rect.width / 2;
        points[i].y = rect.top - rootRect.top + rect.height / 2;
      });
      measured = true;
    };

    const toLocal = e => {
      const rect = root.getBoundingClientRect();
      const scaleX = root.offsetWidth ? rect.width / root.offsetWidth : 1;
      const scaleY = root.offsetHeight ? rect.height / root.offsetHeight : 1;
      return [(e.clientX - rect.left) / (scaleX || 1), (e.clientY - rect.top) / (scaleY || 1)];
    };

    const triggerScramble = (index, duration, revealDelay = 0) => {
      if (originals[index] === ' ' || originals[index] === '\n') return;
      const tw = activeTweens[index];
      tw.startTime = performance.now();
      tw.duration = duration * 1000;
      tw.revealTime = tw.startTime + revealDelay * 1000;
      tw.active = true;
      wake();
    };

    const clear = i => {
      const char = chars[i];
      char.style.transform = '';
      char.style.filter = '';
      char.style.opacity = '';
      char.style.zIndex = '';
      points[i].shown = false;
    };

    const paint = (i, mode, amount) => {
      const p = points[i];
      const e = p.energy;
      if (e < 0.001) {
        if (p.shown) clear(i);
        return;
      }
      const char = chars[i];
      p.shown = true;
      if (mode === 'lift') {
        char.style.transform = `translate3d(0, ${(-e * fontPx * 0.75 * amount).toFixed(2)}px, 0)`;
      } else if (mode === 'blur') {
        char.style.filter = `blur(${(e * fontPx * 0.24 * amount).toFixed(2)}px)`;
        char.style.opacity = (1 - e * Math.min(0.7, 0.45 * amount)).toFixed(3);
        char.style.transform = `scale(${(1 + e * 0.15 * amount).toFixed(4)})`;
      } else {
        char.style.transform = `translate3d(${p.dx.toFixed(2)}px, ${p.dy.toFixed(2)}px, 0) scale(${(1 + e * 0.85 * amount).toFixed(4)})`;
        char.style.zIndex = `${Math.round(e * 10)}`;
      }
    };

    const tick = now => {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      if (!measured) measure();

      const s = settings;
      const mode = PHYSICAL[s.effect] && !reduce ? s.effect : '';
      const amount = Math.max(0, s.strength);
      const reach = Math.max(1, s.radius);
      const width = Math.max(fontPx * 1.3, 16);
      const swell = mode === 'magnify' ? 0.55 : 1;
      const follow = 1 - Math.exp(-dt / 0.06);
      const attack = 1 - Math.exp(-dt / 0.08);
      const release = 1 - Math.exp(-dt / Math.max(0.04, s.trail / 3));

      pointer.sx += (pointer.x - pointer.sx) * follow;
      pointer.sy += (pointer.y - pointer.sy) * follow;

      for (const wave of waves) {
        wave.age += dt;
        const t = Math.min(1, wave.age / wave.life);
        wave.r = wave.reach * (1 - (1 - t) * (1 - t));
        wave.fade = t < 0.75 ? 1 : 1 - ((t - 0.75) / 0.25) ** 2;
      }

      let busy = waves.length > 0 || Math.abs(pointer.x - pointer.sx) + Math.abs(pointer.y - pointer.sy) > 0.2;

      for (let i = 0; i < chars.length; i++) {
        const p = points[i];
        let target = 0;
        let tx = 0;
        let ty = 0;

        if (mode && pointer.inside) {
          const ax = p.x - pointer.sx;
          const ay = p.y - pointer.sy;
          target = falloff(Math.hypot(ax, ay), reach);
          tx = ax * 0.5 * amount * target;
          ty = ay * 0.5 * amount * target;
        }

        for (const wave of waves) {
          const ax = p.x - wave.x;
          const ay = p.y - wave.y;
          const d = Math.hypot(ax, ay);
          const strengthAt = 1 - (0.6 * d) / wave.reach;
          if (!wave.hit[i] && d <= wave.r) {
            wave.hit[i] = 1;
            triggerScramble(i, Math.max(0.2, s.duration * (0.2 + 0.5 * strengthAt)));
          }
          if (mode) {
            const band = swell * strengthAt * wave.fade * Math.exp(-(((d - wave.r) / width) ** 2));
            if (band > target) {
              const push = (fontPx * 0.6 * amount * band) / (d || 1);
              target = band;
              tx = ax * push;
              ty = ay * push;
            }
          }
        }

        const k = target > p.energy ? attack : release;
        p.energy += (target - p.energy) * k;
        if (Math.abs(target - p.energy) > 0.0005) busy = true;

        if (mode === 'magnify') {
          p.dx += (tx - p.dx) * k;
          p.dy += (ty - p.dy) * k;
        }

        if (mode) {
          paint(i, mode, amount);
        } else if (p.shown) {
          clear(i);
        }

        const tw = activeTweens[i];
        if (tw.active) {
          busy = true;
          const elapsed = now - tw.startTime;
          const total = tw.duration;

          if (now >= tw.revealTime && elapsed >= total) {
            tw.active = false;
            glyphs[i].textContent = originals[i];
            glyphs[i].style.color = '';
          } else {
            
            if (Math.random() < s.speed * 0.8) {
              const charsList = s.scrambleChars;
              const rndChar = charsList[Math.floor(Math.random() * charsList.length)];
              glyphs[i].textContent = rndChar;
              if (s.scrambleColor) glyphs[i].style.color = s.scrambleColor;
            }
          }
        }
      }

      for (let j = waves.length - 1; j >= 0; j -= 1) {
        if (waves[j].age >= waves[j].life) waves.splice(j, 1);
      }

      if (busy) raf = requestAnimationFrame(tick);
      else last = 0;
    };

    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const scrambleNearPointer = () => {
      if (!measured) measure();
      const { radius, duration } = settings;
      chars.forEach((_, index) => {
        const p = points[index];
        const dist = Math.hypot(pointer.x - p.x, pointer.y - p.y);
        if (dist < radius) {
          triggerScramble(index, duration * (1 - dist / radius));
        }
      });
    };

    const handleEnter = () => {
      measured = false;
    };

    const handleMove = e => {
      const [x, y] = toLocal(e);
      pointer.x = x;
      pointer.y = y;
      if (!pointer.inside) {
        pointer.sx = x;
        pointer.sy = y;
        pointer.inside = true;
      }
      if (PHYSICAL[settings.effect]) {
        if (!reduce) wake();
      } else {
        scrambleNearPointer();
      }
    };

    const handleLeave = () => {
      pointer.inside = false;
      wake();
    };

    const handleDown = e => {
      if (!settings.clickBurst || (e.pointerType === 'mouse' && e.button !== 0)) return;
      if (!measured) measure();
      const [x, y] = toLocal(e);
      let reach = 0;
      for (const p of points) reach = Math.max(reach, Math.hypot(p.x - x, p.y - y));
      reach += fontPx;
      if (waves.length > 3) waves.shift();
      waves.push({ x, y, age: 0, r: 0, fade: 1, reach, life: 0.45 + reach / 1100, hit: new Uint8Array(chars.length) });
      wake();
    };

    if (settings.intro && !reduce) {
      const io = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          io.disconnect();
          const introLength = settings.duration;
          glyphs.forEach((_, index) => {
            const reveal = 0.15 + introLength * (0.75 * (index / glyphs.length) + 0.25 * Math.random());
            triggerScramble(index, reveal + 0.1, reveal);
          });
        },
        { rootMargin: '0px 0px -10% 0px' }
      );
      io.observe(root);
    }

    const resizeObserver = new ResizeObserver(() => {
      measured = false;
    });
    resizeObserver.observe(root);

    root.addEventListener('pointerenter', handleEnter);
    root.addEventListener('pointermove', handleMove);
    root.addEventListener('pointerleave', handleLeave);
    root.addEventListener('pointerdown', handleDown);

    return {
      destroy: () => {
        cancelAnimationFrame(raf);
        resizeObserver.disconnect();
        root.removeEventListener('pointerenter', handleEnter);
        root.removeEventListener('pointermove', handleMove);
        root.removeEventListener('pointerleave', handleLeave);
        root.removeEventListener('pointerdown', handleDown);
      }
    };
  }

  global.initScrambledText = initScrambledText;
  global.ScrambledText = initScrambledText;

  function autoInit() {
    const targets = document.querySelectorAll('[data-scramble-text], .scrambled-text');
    targets.forEach(el => {
      if (!el.__scrambledTextInstance) {
        el.__scrambledTextInstance = initScrambledText(el);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

})(typeof window !== 'undefined' ? window : this);
