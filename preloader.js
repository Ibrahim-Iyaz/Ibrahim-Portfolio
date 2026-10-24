

(function () {
  'use strict';

  function initPreloader() {
    const preloader = document.getElementById('portfolioPreloader');
    if (!preloader) return;

    document.body.classList.add('preloader-active');

    const ringsContainer = document.getElementById('magicRingsContainer');
    let ringsInstance = null;
    if (ringsContainer && window.MagicRingsEngine) {
      ringsInstance = new window.MagicRingsEngine(ringsContainer, {
        color: '#A855F7',
        colorTwo: '#6366F1',
        motion: 'pulse',
        ringCount: 6,
        speed: 1.1,
        lineThickness: 2.2,
        glow: 1.4,
        hoverScale: 1.15,
        clickBurst: true,
        tilt: 18,
        dispersion: 0.22,
        theme: 'dark'
      });
    }

    const focusContainer = document.getElementById('preloaderTrueFocus');
    let focusInstance = null;
    if (focusContainer && window.TrueFocus) {
      focusInstance = new window.TrueFocus(focusContainer, {
        sentence: "IBRAHIM'S PORTFOLIO",
        focusStyle: 'brackets',
        borderColor: '#ff5a28',
        glowColor: 'rgba(255, 90, 40, 0.65)',
        cornerSize: 18,
        borderWidth: 3,
        blurAmount: 5,
        focusScale: 1.08,
        animationDuration: 0.5,
        pauseBetweenAnimations: 1.1
      });
    }

    const fillEl = document.getElementById('preloaderMeterFill');
    const percentEl = document.getElementById('preloaderPercent');
    const substatusEl = document.getElementById('preloaderSubstatus');
    const skipBtn = document.getElementById('preloaderSkipBtn');

    let progress = 0;
    let isDismissed = false;

    const substatuses = [
      { at: 0, text: 'CALIBRATING CORE SYSTEMS...' },
      { at: 22, text: 'SYNTHESIZING 3D VOXEL FIELDS...' },
      { at: 48, text: 'INITIALIZING MICROSLATS ENGINE...' },
      { at: 74, text: 'ALIGNING COMPONENT DESIGN SYSTEM...' },
      { at: 92, text: 'READY · ENTERING SYSTEM' }
    ];

    function updateProgress(val) {
      progress = Math.min(100, Math.max(progress, val));
      if (fillEl) fillEl.style.width = `${progress}%`;
      if (percentEl) percentEl.textContent = `${Math.floor(progress).toString().padStart(2, '0')}%`;

      const match = [...substatuses].reverse().find(s => progress >= s.at);
      if (match && substatusEl && substatusEl.textContent !== match.text) {
        substatusEl.textContent = match.text;
      }

      if (progress >= 100 && !isDismissed) {
        setTimeout(dismissPreloader, 400);
      }
    }

    const startTime = performance.now();
    const duration = 4400; 

    function progressStep(now) {
      if (isDismissed) return;
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      
      const eased = t * (2 - t);
      updateProgress(eased * 100);

      if (t < 1) {
        requestAnimationFrame(progressStep);
      }
    }

    requestAnimationFrame(progressStep);

    function dismissPreloader() {
      if (isDismissed) return;
      isDismissed = true;

      preloader.classList.add('is-dismissing');
      document.body.classList.remove('preloader-active');

      setTimeout(() => {
        if (ringsInstance) ringsInstance.destroy();
        if (focusInstance) focusInstance.destroy();
        preloader.style.display = 'none';

        window._microSlatsInstance?.wake?.();
        window._resumeFlowerLoop?.();
      }, 700);
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', () => dismissPreloader());
    }

    preloader.addEventListener('click', (e) => {
      
      if (e.target === preloader || e.target.closest('#magicRingsContainer')) {
        if (progress > 30) dismissPreloader();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        dismissPreloader();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPreloader);
  } else {
    initPreloader();
  }
})();
