(() => {
  const root = document.documentElement;
  const themeToggle = document.getElementById("themeToggle");
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const year = document.getElementById("year");
  const progress = document.getElementById("pageProgress");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (year) year.textContent = String(new Date().getFullYear());

  function getSavedTheme() {
    try {
      return localStorage.getItem("portfolio-theme");
    } catch {
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem("portfolio-theme", theme);
    } catch {
      
    }
  }

  function applyTheme(theme, persist = false) {
    const nextTheme = theme === "dark" ? "dark" : "light";
    root.dataset.theme = nextTheme;
    if (themeToggle) {
      const isDark = nextTheme === "dark";
      themeToggle.setAttribute("aria-pressed", String(isDark));
      themeToggle.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} theme`);
    }
    if (themeColor) {
      themeColor.content = nextTheme === "dark" ? "#242329" : "#f2f0e9";
    }
    if (persist) {
      hasUserThemeSelection = true;
      saveTheme(nextTheme);
    }
  }

  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  const savedTheme = getSavedTheme();
  let hasUserThemeSelection = Boolean(savedTheme);
  applyTheme(savedTheme || (systemTheme.matches ? "dark" : "light"));
  systemTheme.addEventListener?.("change", (event) => {
    if (!hasUserThemeSelection) applyTheme(event.matches ? "dark" : "light");
  });

  themeToggle?.addEventListener("click", () => {
    applyTheme(root.dataset.theme === "dark" ? "light" : "dark", true);
    if (reducedMotion.matches) draw(0);
  });

  const updateProgress = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
    if (progress) progress.style.width = `${Math.min(1, Math.max(0, ratio)) * 100}%`;
  };
  let progressFrame = 0;
  window.addEventListener("scroll", () => {
    if (progressFrame) return;
    progressFrame = window.requestAnimationFrame(() => {
      updateProgress();
      progressFrame = 0;
    });
  }, { passive: true });
  window.addEventListener("resize", updateProgress, { passive: true });
  updateProgress();

  const navLinks = [...document.querySelectorAll('.main-nav a[href^="#"]')];
  const navTargets = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window && navTargets.length) {
    const navObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      navLinks.forEach((link) => {
        if (link.getAttribute("href") === `#${visible.target.id}`) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    }, { rootMargin: "-25% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75] });
    navTargets.forEach((target) => navObserver.observe(target));
  }

  const form = document.getElementById("contactForm");
  const formStatus = document.getElementById("formStatus");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const fields = new FormData(form);
    const name = String(fields.get("name") || "").trim();
    const email = String(fields.get("email") || "").trim();
    const message = String(fields.get("message") || "").trim();
    const subject = `Portfolio message from ${name}`;
    const body = `Hi Ibrahim,\n\n${message}\n\n- ${name}\n${email}`;
    const mailto = `mailto:ibrahimiyaz567@yahoo.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    if (formStatus) {
      formStatus.textContent = "Your email app should open with this message. If it doesn’t, use the email link beside the form.";
    }
    window.location.href = mailto;
  });

  const cursor = document.getElementById("cursorOrb");
  const finePointer = window.matchMedia("(pointer: fine)");
  if (cursor && finePointer.matches && !reducedMotion.matches) {
    let cursorFrame = 0;
    let cursorX = 0;
    let cursorY = 0;
    document.addEventListener("pointermove", (event) => {
      cursorX = event.clientX;
      cursorY = event.clientY;
      if (cursorFrame) return;
      cursorFrame = window.requestAnimationFrame(() => {
        cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%)`;
        cursor.classList.add("is-visible");
        cursorFrame = 0;
      });
    }, { passive: true });
    document.addEventListener("pointerover", (event) => {
      if (event.target instanceof Element && event.target.closest("a, button, summary, input, textarea")) {
        cursor.classList.add("is-hovering");
      }
    });
    document.addEventListener("pointerout", (event) => {
      if (event.target instanceof Element && event.target.closest("a, button, summary, input, textarea")) {
        cursor.classList.remove("is-hovering");
      }
    });
    document.addEventListener("pointerleave", () => cursor.classList.remove("is-visible"));
  }

  const canvas = document.getElementById("signalCanvas");
  const artwork = canvas?.closest(".hero-art");
  if (!canvas || !artwork) return;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;

  let width = 0;
  let height = 0;
  let points = [];
  let pointer = { x: -1000, y: -1000 };
  let isInView = true;
  let animationFrame = 0;
  let lastFrame = 0;
  const pointCount = 92;
  const signalColor = () => getComputedStyle(root).getPropertyValue("--signal").trim() || "#d85a32";

  function resizeCanvas() {
    const rect = artwork.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 1.6);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    points = Array.from({ length: pointCount }, (_, index) => {
      const column = index % 10;
      const row = Math.floor(index / 10);
      return {
        x: width * (0.11 + column * 0.087),
        y: height * (0.12 + row * 0.083),
        phase: index * 0.73,
        size: index % 13 === 0 ? 2 : 1.1
      };
    });
    draw(0);
  }

  function draw(time = 0) {
    if (!width || !height) return;
    const accent = signalColor();
    const inkColor = getComputedStyle(root).getPropertyValue("--ink").trim() || "#27272d";
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const pointerActive = pointer.x >= 0 && pointer.y >= 0;
    context.clearRect(0, 0, width, height);

    const positions = points.map((point) => {
      const driftX = Math.sin(time * 0.00032 + point.phase) * 5;
      const driftY = Math.cos(time * 0.00027 + point.phase * 1.3) * 5;
      let x = point.x + driftX;
      let y = point.y + driftY;
      if (pointerActive) {
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 95 && distance > 0) {
          const force = (95 - distance) / 95;
          x += (dx / distance) * force * 17;
          y += (dy / distance) * force * 17;
        }
      }
      return { x, y, size: point.size, phase: point.phase };
    });

    context.lineWidth = 0.7;
    for (let index = 0; index < positions.length; index += 1) {
      const point = positions[index];
      for (let next = index + 1; next < positions.length; next += 1) {
        const candidate = positions[next];
        const distance = Math.hypot(point.x - candidate.x, point.y - candidate.y);
        if (distance < 72) {
          context.globalAlpha = (1 - distance / 72) * 0.28;
          context.strokeStyle = accent;
          context.beginPath();
          context.moveTo(point.x, point.y);
          context.lineTo(candidate.x, candidate.y);
          context.stroke();
        }
      }
    }

    positions.forEach((point) => {
      const distanceToCenter = Math.hypot(point.x - centerX, point.y - centerY);
      context.globalAlpha = Math.max(0.18, 0.74 - distanceToCenter / (Math.max(width, height) * 1.4));
      context.fillStyle = point.phase % 3 < 1 ? accent : inkColor;
      context.beginPath();
      context.arc(point.x, point.y, point.size, 0, Math.PI * 2);
      context.fill();
    });
    context.globalAlpha = 1;

    context.globalAlpha = 0.35;
    context.strokeStyle = accent;
    context.beginPath();
    context.arc(centerX, centerY, Math.min(width, height) * (0.2 + Math.sin(time * 0.00045) * 0.008), 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = 1;
  }

  function animate(time) {
    animationFrame = 0;
    if (reducedMotion.matches || !isInView || document.hidden) return;
    if (time - lastFrame >= 32) {
      draw(time);
      lastFrame = time;
    }
    animationFrame = window.requestAnimationFrame(animate);
  }

  function startAnimation() {
    if (animationFrame || reducedMotion.matches || !isInView || document.hidden) return;
    animationFrame = window.requestAnimationFrame(animate);
  }

  function stopAnimation() {
    if (!animationFrame) return;
    window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  artwork.addEventListener("pointermove", (event) => {
    if (reducedMotion.matches) return;
    const rect = artwork.getBoundingClientRect();
    pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    startAnimation();
  }, { passive: true });
  artwork.addEventListener("pointerleave", () => {
    pointer = { x: -1000, y: -1000 };
  }, { passive: true });
  artwork.addEventListener("click", (event) => {
    const rect = artwork.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    points.forEach((p) => {
      const d = Math.hypot(p.x - clickX, p.y - clickY);
      if (d < 160) {
        p.phase += 2.0 * (1 - d / 160);
      }
    });
    startAnimation();
  });

  if ("ResizeObserver" in window) {
    new ResizeObserver(resizeCanvas).observe(artwork);
  } else {
    window.addEventListener("resize", resizeCanvas, { passive: true });
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      isInView = entry.isIntersecting;
      if (isInView) startAnimation();
      else stopAnimation();
    }, { threshold: 0.05 }).observe(artwork);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAnimation();
    else startAnimation();
  });
  reducedMotion.addEventListener?.("change", () => {
    if (reducedMotion.matches) {
      stopAnimation();
      draw(0);
    } else {
      startAnimation();
    }
  });
  resizeCanvas();
  startAnimation();
})();

(() => {
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  const resetToTop = () => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  window.addEventListener("pageshow", resetToTop);
  window.addEventListener("beforeunload", resetToTop);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", resetToTop);
  } else {
    resetToTop();
  }

  if (window.location.hash) {
    setTimeout(resetToTop, 1);
  }
})();

(() => {
  const stages = document.querySelectorAll(".interactive-card-stage");
  const finePointer = window.matchMedia("(pointer: fine)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  stages.forEach((stage) => {
    const card = stage.querySelector(".interactive-tilt-card");
    if (!card) return;

    let targetRotX = 0;
    let targetRotY = 0;
    let currentRotX = 0;
    let currentRotY = 0;
    let isHovered = false;
    let animFrame = 0;

    const render = () => {
      currentRotX += (targetRotX - currentRotX) * 0.14;
      currentRotY += (targetRotY - currentRotY) * 0.14;

      if (isHovered || Math.abs(currentRotX) > 0.05 || Math.abs(currentRotY) > 0.05) {
        card.style.transform = `perspective(900px) rotateX(${currentRotX.toFixed(2)}deg) rotateY(${currentRotY.toFixed(2)}deg) translateZ(12px)`;
        animFrame = requestAnimationFrame(render);
      } else {
        card.style.transform = "";
        animFrame = 0;
      }
    };

    let stageRect = null;
    stage.addEventListener("pointerenter", () => {
      stageRect = stage.getBoundingClientRect();
    }, { passive: true });

    stage.addEventListener("pointermove", (e) => {
      if (reducedMotion.matches || !finePointer.matches) return;
      if (!stageRect) stageRect = stage.getBoundingClientRect();
      const x = (e.clientX - stageRect.left) / stageRect.width - 0.5;
      const y = (e.clientY - stageRect.top) / stageRect.height - 0.5;

      targetRotY = x * 22;
      targetRotX = -y * 22;
      isHovered = true;

      if (!animFrame) animFrame = requestAnimationFrame(render);
    }, { passive: true });

    stage.addEventListener("pointerleave", () => {
      stageRect = null;
      targetRotX = 0;
      targetRotY = 0;
      isHovered = false;
      if (!animFrame) animFrame = requestAnimationFrame(render);
    }, { passive: true });
  });
})();

(() => {
  const pills = document.querySelectorAll(".solar-metric-pill");
  const genVal = document.getElementById("solarGenVal");
  const loadVal = document.getElementById("solarLoadVal");
  const batVal = document.getElementById("solarBatVal");
  const gridVal = document.getElementById("solarGridVal");
  const tariffBar = document.querySelector(".solar-tariff-bar");
  const tariffStatus = document.getElementById("solarTariffStatus");
  const progressBar = document.getElementById("solarProgressBar");
  const tariffTag = document.getElementById("solarTariffTag");

  const metricProfiles = {
    gen: {
      tag: "SOLAR GENERATION · PEAK SINK ACTIVE",
      progress: "82%",
      note: "PANEL TEMP 41°C · EFFICIENCY 98.2%",
      gen: "5.40 kW", load: "2.10 kW", bat: "96%", grid: "+3.30 kW"
    },
    load: {
      tag: "HOUSEHOLD LOAD · DYNAMIC MONITOR",
      progress: "45%",
      note: "AC 1.2kW · PUMP 0.6kW · APPLIANCES 0.35kW",
      gen: "4.82 kW", load: "2.85 kW", bat: "92%", grid: "+1.97 kW"
    },
    battery: {
      tag: "LiFePO4 STORAGE · BALANCED CHARGE",
      progress: "94%",
      note: "REMAINING CAPACITY 14.8 kWh · HEALTH 99%",
      gen: "4.82 kW", load: "2.15 kW", bat: "94%", grid: "+2.67 kW"
    },
    grid: {
      tag: "GEPCO NET-METERING FEED-IN",
      progress: "68%",
      note: "MONTHLY UNITS EXPORTED: 412 kWh",
      gen: "4.82 kW", load: "1.90 kW", bat: "98%", grid: "+2.92 kW"
    }
  };

  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      pills.forEach((p) => p.classList.remove("metric-active"));
      pill.classList.add("metric-active");

      const metric = pill.dataset.metric;
      const data = metricProfiles[metric];
      if (!data) return;

      if (genVal) genVal.textContent = data.gen;
      if (loadVal) loadVal.textContent = data.load;
      if (batVal) batVal.textContent = data.bat;
      if (gridVal) gridVal.textContent = data.grid;
      if (tariffStatus) tariffStatus.textContent = data.tag;
      if (progressBar) progressBar.style.width = data.progress;
      if (tariffTag) tariffTag.textContent = data.note;
    });
  });

  const tariffs = [
    { title: "GEPCO / LESCO / K-ELECTRIC TARIFF ENGINE", tag: "NET-METERING ACTIVE (CLICK TO TOGGLE)", width: "68%" },
    { title: "PEAK TIME-OF-USE (TOU) SLAB: Rs. 42.00/kWh", tag: "BATTERY SHAVING PEAK LOAD", width: "90%" },
    { title: "OFF-PEAK TOU SLAB: Rs. 14.50/kWh", tag: "GRID CHARGING WINDOW OPTIMIZED", width: "32%" }
  ];
  let tariffIdx = 0;

  tariffBar?.addEventListener("click", () => {
    tariffIdx = (tariffIdx + 1) % tariffs.length;
    const t = tariffs[tariffIdx];
    if (tariffStatus) tariffStatus.textContent = t.title;
    if (tariffTag) tariffTag.textContent = t.tag;
    if (progressBar) progressBar.style.width = t.width;
  });
})();

(() => {
  const cubeCard = document.getElementById("gestureCubeCard");
  const shaderTag = document.getElementById("gestureShaderTag");
  const landmarksTag = document.getElementById("gestureLandmarks");
  const cubeGlow = document.getElementById("cubeGlow");
  if (!cubeCard) return;

  const shaders = [
    { name: "60 FPS GLSL · GALAXY", glow: "radial-gradient(circle, rgba(94, 234, 212, 0.45) 0%, transparent 70%)" },
    { name: "60 FPS GLSL · FIRE PORTAL", glow: "radial-gradient(circle, rgba(249, 115, 22, 0.6) 0%, transparent 70%)" },
    { name: "60 FPS GLSL · MATRIX RAIN", glow: "radial-gradient(circle, rgba(34, 197, 94, 0.55) 0%, transparent 70%)" },
    { name: "60 FPS GLSL · HOLOGRAPHIC PRISM", glow: "radial-gradient(circle, rgba(168, 85, 247, 0.55) 0%, transparent 70%)" },
    { name: "60 FPS GLSL · NEBULA FLUID", glow: "radial-gradient(circle, rgba(56, 189, 248, 0.55) 0%, transparent 70%)" }
  ];
  let shaderIndex = 0;

  cubeCard.addEventListener("click", () => {
    shaderIndex = (shaderIndex + 1) % shaders.length;
    const current = shaders[shaderIndex];
    if (shaderTag) shaderTag.textContent = current.name;
    if (cubeGlow) cubeGlow.style.background = current.glow;
  });

  let cubeRect = null;
  cubeCard.addEventListener("pointerenter", () => {
    cubeRect = cubeCard.getBoundingClientRect();
  }, { passive: true });

  cubeCard.addEventListener("pointermove", (e) => {
    if (!cubeRect) cubeRect = cubeCard.getBoundingClientRect();
    const x = Math.round(((e.clientX - cubeRect.left) / cubeRect.width) * 100);
    const y = Math.round(((e.clientY - cubeRect.top) / cubeRect.height) * 100);
    if (landmarksTag) landmarksTag.textContent = `21+21 LANDMARKS: (${x}, ${y})`;
  }, { passive: true });

  cubeCard.addEventListener("pointerleave", () => {
    cubeRect = null;
    if (landmarksTag) landmarksTag.textContent = "21+21 LANDMARKS ACTIVE";
  }, { passive: true });
})();

(() => {
  const railBtns = document.querySelectorAll(".quran-rail-btn");
  const arabicLine = document.getElementById("quranArabicLine");
  const translation = document.getElementById("quranTranslation");
  const metaSurah = document.getElementById("quranMetaSurah");
  const metaStatus = document.getElementById("quranMetaStatus");
  const chip = document.getElementById("quranChip");
  const audioTrack = document.getElementById("quranAudioTrack");
  const protocolBadge = document.getElementById("quranProtocolBadge");
  const headerTitle = document.getElementById("quranHeaderTitle");
  const menuBtn = document.getElementById("quranMenuBtn");

  const views = {
    index: {
      surah: "114 SURAHS · MECCAN & MEDINAN",
      status: "◎ INDEX VIEW",
      arabic: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
      trans: "[Surah 1: Al-Fatihah] All praise is due to Allah, Lord of the worlds.",
      chip: "SURAH CATALOG",
      audio: "12%",
      badge: "INDEX LOADED",
      title: "QURAN / SURAH LIST"
    },
    reader: {
      surah: "02 / AL-BAQARAH",
      status: "◉ SAVED AYAH 1",
      arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
      trans: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
      chip: "◈ RUST PROTOCOL",
      audio: "44%",
      badge: "SHA-256 VERIFIED",
      title: "QURAN / TAURI READER"
    },
    audio: {
      surah: "RECITATION · MISHARY RASHID",
      status: "▶ PLAYING 320kbps",
      arabic: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ",
      trans: "[Ayat al-Kursi] Allah - there is no deity except Him, the Ever-Living, the Sustainer of existence.",
      chip: "♫ quran-audio://",
      audio: "78%",
      badge: "STREAMING BUFFER 100%",
      title: "QURAN / AUDIO STREAM"
    },
    bookmarks: {
      surah: "FAVORITES · 3 SAVED",
      status: "★ BOOKMARKS",
      arabic: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
      trans: "It is You we worship and You we ask for help.",
      chip: "LOCAL SQLITE",
      audio: "100%",
      badge: "SYNCED OFFLINE",
      title: "QURAN / BOOKMARKS"
    },
    settings: {
      surah: "TAURI ENGINE CONFIG",
      status: "⚙ v2.0 RUST",
      arabic: "وَقُل رَّبِّ زِدْنِي عِلْمًا",
      trans: "And say: 'My Lord, increase me in knowledge.'",
      chip: "NATIVE THREADS",
      audio: "100%",
      badge: "ZERO RUNTIME CRASH",
      title: "QURAN / SETTINGS"
    }
  };

  railBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      railBtns.forEach((b) => b.classList.remove("rail-active"));
      btn.classList.add("rail-active");

      const view = views[btn.dataset.view];
      if (!view) return;

      if (metaSurah) metaSurah.textContent = view.surah;
      if (metaStatus) metaStatus.textContent = view.status;
      if (arabicLine) arabicLine.textContent = view.arabic;
      if (translation) translation.textContent = view.trans;
      if (chip) chip.textContent = view.chip;
      if (audioTrack) audioTrack.style.width = view.audio;
      if (protocolBadge) protocolBadge.textContent = view.badge;
      if (headerTitle) headerTitle.textContent = view.title;
    });
  });

  const reciters = ["Mishary Rashid Alafasy", "Abdul Basit", "Mahmoud Khalil Al-Husary", "Saad Al-Ghamdi"];
  let reciterIdx = 0;
  menuBtn?.addEventListener("click", () => {
    reciterIdx = (reciterIdx + 1) % reciters.length;
    if (chip) chip.textContent = `RECITER: ${reciters[reciterIdx]}`;
  });

  let toggleVerse = false;
  arabicLine?.addEventListener("click", () => {
    toggleVerse = !toggleVerse;
    if (toggleVerse) {
      arabicLine.textContent = "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ";
      if (translation) translation.textContent = "Allah - there is no deity except Him, the Ever-Living, the Sustainer of existence.";
      if (metaSurah) metaSurah.textContent = "02 / AL-BAQARAH (AYAH 255)";
    } else {
      arabicLine.textContent = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";
      if (translation) translation.textContent = "In the name of Allah, the Entirely Merciful, the Especially Merciful.";
      if (metaSurah) metaSurah.textContent = "02 / AL-BAQARAH";
    }
  });
})();

(() => {
  const songs = [
    { title: "Starboy", artist: "The Weeknd · Spotify" },
    { title: "Blinding Lights", artist: "The Weeknd · Spotify" },
    { title: "Midnight City", artist: "M83 · Spotify" },
    { title: "Instant Crush", artist: "Daft Punk · Spotify" },
    { title: "Nightcall", artist: "Kavinsky · Spotify" }
  ];
  let currentSong = 0;
  let isPlaying = true;

  const trackTitle = document.getElementById("ipodTrackTitle");
  const artistTag = document.getElementById("ipodArtistTag");
  const nextBtn = document.getElementById("ipodNextBtn");
  const prevBtn = document.getElementById("ipodPrevBtn");
  const playBtn = document.getElementById("ipodPlayBtn");
  const centerBtn = document.getElementById("ipodCenterBtn");
  const menuBtn = document.getElementById("ipodMenuBtn");
  const appTag = document.getElementById("ipodAppTag");

  const updateDisplay = () => {
    const s = songs[currentSong];
    if (trackTitle) trackTitle.textContent = s.title;
    if (artistTag) artistTag.textContent = s.artist;
    if (appTag) appTag.textContent = isPlaying ? "iPodify ▶" : "iPodify ❚❚";
  };

  const nextSong = () => {
    currentSong = (currentSong + 1) % songs.length;
    updateDisplay();
  };

  const prevSong = () => {
    currentSong = (currentSong - 1 + songs.length) % songs.length;
    updateDisplay();
  };

  nextBtn?.addEventListener("click", nextSong);
  prevBtn?.addEventListener("click", prevSong);
  centerBtn?.addEventListener("click", nextSong);
  playBtn?.addEventListener("click", () => {
    isPlaying = !isPlaying;
    updateDisplay();
  });
  menuBtn?.addEventListener("click", () => {
    if (trackTitle) trackTitle.textContent = "Playlists (5)";
    if (artistTag) artistTag.textContent = "Favorites · Chill · Work";
  });
})();

(() => {
  const weatherCard = document.getElementById("weatherCardUI");
  const tempTag = document.getElementById("weatherTemp");
  const stateTag = document.getElementById("weatherStateTag");
  const sunIcon = document.getElementById("weatherIconSun");
  if (!weatherCard) return;

  const states = [
    { temp: "28°C", text: "SUNNY · CLEAR SKY", bg: "oklch(85% 0.18 85)", shadow: "0 0 14px oklch(85% 0.18 85)" },
    { temp: "19°C", text: "DRIZZLE · HUMIDITY 84%", bg: "oklch(70% 0.12 220)", shadow: "0 0 14px oklch(70% 0.12 220)" },
    { temp: "22°C", text: "CLEAR NIGHT · MOONLIT", bg: "oklch(92% 0.05 100)", shadow: "0 0 16px rgba(255,255,255,0.7)" },
    { temp: "17°C", text: "THUNDERSTORM · RAIN", bg: "oklch(75% 0.22 300)", shadow: "0 0 16px oklch(75% 0.22 300)" }
  ];
  let stateIndex = 0;

  weatherCard.addEventListener("click", () => {
    stateIndex = (stateIndex + 1) % states.length;
    const current = states[stateIndex];
    if (tempTag) tempTag.textContent = current.temp;
    if (stateTag) stateTag.textContent = current.text;
    if (sunIcon) {
      sunIcon.style.background = current.bg;
      sunIcon.style.boxShadow = current.shadow;
    }
  });
})();

(() => {
  const interlude = document.getElementById("interludeSection");
  const canvas = document.getElementById("interludeCanvas");
  if (!interlude || !canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let animId = 0;
  let time = 0;
  let pointer = { x: -1000, y: -1000, active: false };
  let ripples = [];

  const resize = () => {
    const rect = interlude.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const drawWaves = () => {
    if (!width || !height) return;
    ctx.clearRect(0, 0, width, height);

    const midY = height * 0.52;
    const isDark = document.documentElement.dataset.theme === "dark";
    const copper = isDark ? "#ff7a45" : "#e05822";
    const gold = isDark ? "rgba(255, 214, 102, 0.75)" : "rgba(212, 160, 23, 0.65)";
    const cyan = isDark ? "rgba(100, 210, 255, 0.7)" : "rgba(35, 130, 200, 0.55)";
    const dotColor = isDark ? "rgba(255, 255, 255, 0.85)" : "rgba(40, 40, 40, 0.75)";

    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.radius += 4;
      r.alpha *= 0.96;
      if (r.alpha < 0.01) {
        ripples.splice(i, 1);
      } else {
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = copper;
        ctx.globalAlpha = r.alpha * 0.5;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    const computeDisplacement = (x, y) => {
      let offset = 0;
      if (pointer.active) {
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 180) {
          const force = Math.cos((dist / 180) * (Math.PI / 2));
          offset += (pointer.y - y) * force * 0.45;
        }
      }
      ripples.forEach((r) => {
        const dist = Math.hypot(x - r.x, y - r.y);
        const diff = Math.abs(dist - r.radius);
        if (diff < 40) {
          offset += Math.sin((diff / 40) * Math.PI) * 14 * r.alpha;
        }
      });
      return offset;
    };

    ctx.beginPath();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = copper;
    for (let x = 0; x <= width; x += 4) {
      const baseY = midY + Math.sin(x * 0.007 + time * 0.035) * 36 + Math.cos(x * 0.014 - time * 0.02) * 16;
      const y = baseY + computeDisplacement(x, baseY);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = gold;
    ctx.setLineDash([6, 8]);
    for (let x = 0; x <= width; x += 4) {
      const baseY = midY + Math.sin(x * 0.009 - time * 0.028 + 1.2) * 44 + Math.sin(x * 0.003 + time * 0.01) * 20;
      const y = baseY + computeDisplacement(x, baseY);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = cyan;
    for (let x = 0; x <= width; x += 4) {
      const baseY = midY + Math.cos(x * 0.006 + time * 0.022 + 2.5) * 48 + Math.sin(x * 0.012 + time * 0.03) * 12;
      const y = baseY + computeDisplacement(x, baseY);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    const beadCount = 7;
    for (let b = 0; b < beadCount; b++) {
      const bx = ((time * 30 + b * (width / beadCount)) % width);
      const by = midY + Math.sin(bx * 0.007 + time * 0.035) * 36 + Math.cos(bx * 0.014 - time * 0.02) * 16 + computeDisplacement(bx, midY);
      ctx.beginPath();
      ctx.arc(bx, by, b % 2 === 0 ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = b % 2 === 0 ? copper : dotColor;
      ctx.fill();
    }
  };

  let isInterludeVisible = false;
  const loop = () => {
    if (!isInterludeVisible) {
      animId = 0;
      return;
    }
    time += 0.55;
    drawWaves();
    animId = requestAnimationFrame(loop);
  };

  const startInterludeLoop = () => {
    if (!animId && isInterludeVisible) {
      animId = requestAnimationFrame(loop);
    }
  };

  let interludeRect = null;
  interlude.addEventListener("pointerenter", () => {
    interludeRect = interlude.getBoundingClientRect();
  }, { passive: true });

  interlude.addEventListener("pointermove", (e) => {
    if (!interludeRect) interludeRect = interlude.getBoundingClientRect();
    pointer.x = e.clientX - interludeRect.left;
    pointer.y = e.clientY - interludeRect.top;
    pointer.active = true;
  }, { passive: true });

  interlude.addEventListener("pointerleave", () => {
    interludeRect = null;
    pointer.active = false;
  }, { passive: true });

  interlude.addEventListener("click", (e) => {
    if (!interludeRect) interludeRect = interlude.getBoundingClientRect();
    ripples.push({
      x: e.clientX - interludeRect.left,
      y: e.clientY - interludeRect.top,
      radius: 5,
      alpha: 1
    });
  });

  window.addEventListener("resize", resize, { passive: true });
  resize();

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      isInterludeVisible = entry.isIntersecting;
      if (isInterludeVisible) startInterludeLoop();
    }, { threshold: 0.05 }).observe(interlude);
  } else {
    isInterludeVisible = true;
    startInterludeLoop();
  }
})();

(() => {
  const section = document.querySelector(".vt-section");
  const stage = document.getElementById("vtFlowerStage");
  const canvas = document.getElementById("flower3dCanvas");
  const statusLabel = document.getElementById("flowerStatusLabel");
  if (!section || !canvas) return;

  let isFlowerInView = false;

  function initFlower() {
    if (typeof THREE === "undefined") {
      setTimeout(initFlower, 60);
      return;
    }

    const COUNT = 2400;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050406, 0.025);

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
    camera.position.set(0, 0, 18.5);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));

    const resize = () => {
      const rect = stage.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    const geom = new THREE.BoxGeometry(0.12, 0.44, 0.12);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95
    });

    const mesh = new THREE.InstancedMesh(geom, mat, COUNT);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const assembledPos = new Float32Array(COUNT * 3);
    const assembledRot = new Float32Array(COUNT * 3);
    const scatterPos = new Float32Array(COUNT * 3);
    const scatterRot = new Float32Array(COUNT * 3);
    const currentPos = new Float32Array(COUNT * 3);
    const currentRot = new Float32Array(COUNT * 3);
    const bitColors = new Float32Array(COUNT * 3);
    const bitLayers = new Float32Array(COUNT);

    const colorCore = new THREE.Color(0xfff08a);    
    const colorAmber = new THREE.Color(0xff9436);   
    const colorRed = new THREE.Color(0xe62c1e);     
    const colorDeep = new THREE.Color(0x941212);    
    const tempColor = new THREE.Color();

    for (let i = 0; i < COUNT; i++) {
      let x = 0, y = 0, z = 0;
      let rx = 0, ry = 0, rz = 0;

      if (i < 380) {
        
        const p = i / 380;
        const rad = Math.sqrt(p) * 1.1;
        const theta = i * 2.399963; 
        x = Math.cos(theta) * rad;
        y = Math.sin(theta) * rad;
        z = (1 - rad / 1.1) * 0.85 + (Math.random() - 0.5) * 0.25;

        rx = (Math.random() - 0.5) * 0.2;
        ry = (Math.random() - 0.5) * 0.2;
        rz = theta;

        tempColor.copy(colorCore).lerp(colorAmber, rad / 1.1);
        bitLayers[i] = 0;
      } else if (i < 1050) {
        
        const p = (i - 380) / (1050 - 380);
        const petalIdx = Math.floor(p * 5);
        const petalProg = (p * 5) % 1;
        const baseAngle = (petalIdx / 5) * Math.PI * 2;
        const angleSpread = (petalProg - 0.5) * 0.72;
        const theta = baseAngle + angleSpread;

        const rad = 1.0 + Math.sin(petalProg * Math.PI) * 1.85 + (Math.random() - 0.5) * 0.2;
        const curl = Math.pow(petalProg, 1.3) * 1.25;
        x = Math.cos(theta) * rad;
        y = Math.sin(theta) * rad;
        z = curl - 0.2 + (Math.random() - 0.5) * 0.2;

        rx = -Math.sin(theta) * 0.5;
        ry = Math.cos(theta) * 0.5;
        rz = theta;

        tempColor.copy(colorAmber).lerp(colorRed, petalProg * 0.6);
        bitLayers[i] = 1;
      } else if (i < 1800) {
        
        const p = (i - 1050) / (1800 - 1050);
        const petalIdx = Math.floor(p * 8);
        const petalProg = (p * 8) % 1;
        const baseAngle = (petalIdx / 8) * Math.PI * 2 + 0.38;
        const angleSpread = (petalProg - 0.5) * 0.58;
        const theta = baseAngle + angleSpread;

        const rad = 2.4 + Math.sin(petalProg * Math.PI) * 2.3 + (Math.random() - 0.5) * 0.3;
        const elevation = Math.sin(petalProg * Math.PI) * 0.95 - (rad * 0.12);
        x = Math.cos(theta) * rad;
        y = Math.sin(theta) * rad;
        z = elevation + (Math.random() - 0.5) * 0.25;

        rx = -Math.sin(theta) * 0.7;
        ry = Math.cos(theta) * 0.7;
        rz = theta;

        tempColor.copy(colorRed).lerp(colorAmber, Math.sin(petalProg * Math.PI) * 0.7);
        bitLayers[i] = 2;
      } else {
        
        const p = (i - 1800) / (COUNT - 1800);
        const petalIdx = Math.floor(p * 12);
        const petalProg = (p * 12) % 1;
        const baseAngle = (petalIdx / 12) * Math.PI * 2 + 0.22;
        const angleSpread = (petalProg - 0.5) * 0.44;
        const theta = baseAngle + angleSpread;

        const rad = 3.8 + Math.sin(petalProg * Math.PI) * 2.6 + (Math.random() - 0.5) * 0.35;
        const elevation = -0.4 - Math.pow(rad / 6.4, 1.8) * 0.8;
        x = Math.cos(theta) * rad;
        y = Math.sin(theta) * rad;
        z = elevation + (Math.random() - 0.5) * 0.3;

        rx = -Math.sin(theta) * 0.85;
        ry = Math.cos(theta) * 0.85;
        rz = theta;

        tempColor.copy(colorDeep).lerp(colorRed, petalProg);
        bitLayers[i] = 3;
      }

      assembledPos[i * 3 + 0] = x;
      assembledPos[i * 3 + 1] = y;
      assembledPos[i * 3 + 2] = z;

      assembledRot[i * 3 + 0] = rx;
      assembledRot[i * 3 + 1] = ry;
      assembledRot[i * 3 + 2] = rz;

      const scatterDist = 8 + Math.random() * 16;
      const sTheta = Math.random() * Math.PI * 2;
      const sPhi = (Math.random() - 0.5) * Math.PI;
      scatterPos[i * 3 + 0] = Math.cos(sTheta) * Math.cos(sPhi) * scatterDist;
      scatterPos[i * 3 + 1] = Math.sin(sPhi) * scatterDist * 0.75;
      scatterPos[i * 3 + 2] = Math.sin(sTheta) * Math.cos(sPhi) * scatterDist - 2;

      scatterRot[i * 3 + 0] = (Math.random() - 0.5) * 4;
      scatterRot[i * 3 + 1] = (Math.random() - 0.5) * 4;
      scatterRot[i * 3 + 2] = (Math.random() - 0.5) * 4;

      currentPos[i * 3 + 0] = scatterPos[i * 3 + 0];
      currentPos[i * 3 + 1] = scatterPos[i * 3 + 1];
      currentPos[i * 3 + 2] = scatterPos[i * 3 + 2];

      currentRot[i * 3 + 0] = scatterRot[i * 3 + 0];
      currentRot[i * 3 + 1] = scatterRot[i * 3 + 1];
      currentRot[i * 3 + 2] = scatterRot[i * 3 + 2];

      mesh.setColorAt(i, tempColor);
      bitColors[i * 3 + 0] = tempColor.r;
      bitColors[i * 3 + 1] = tempColor.g;
      bitColors[i * 3 + 2] = tempColor.b;
    }
    mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);

    const flowerGroup = new THREE.Group();
    flowerGroup.add(mesh);
    
    flowerGroup.scale.set(0.72, 0.72, 0.72);
    
    flowerGroup.position.set(2.0, 0.1, 0);
    
    flowerGroup.rotation.x = -0.06;
    scene.add(flowerGroup);

    const spaceObjectsGroup = new THREE.Group();
    scene.add(spaceObjectsGroup);

    const relicRaycaster = new THREE.Raycaster();
    const relicMouseNDC = new THREE.Vector2(-999, -999);
    const relicHitMeshes = [];
    const relics = [];
    const relicDummy = new THREE.Object3D();
    const relicBitGeom = new THREE.BoxGeometry(0.19, 0.19, 0.19);

    function createRelic(config) {
      const {
        name,
        colorHex,
        accentHex,
        baseX,
        baseY,
        baseZ,
        shapeFn,
        bitCount,
        orbitSpeed,
        phase
      } = config;

      const relicGroup = new THREE.Group();
      relicGroup.position.set(baseX, baseY, baseZ);

      const relicMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95
      });
      const relicMesh = new THREE.InstancedMesh(relicBitGeom, relicMat, bitCount);
      relicMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

      const targetPos = new Float32Array(bitCount * 3);
      const targetRot = new Float32Array(bitCount * 3);
      const currentPos = new Float32Array(bitCount * 3);
      const currentRot = new Float32Array(bitCount * 3);
      const velocities = new Float32Array(bitCount * 3);
      const spinVels = new Float32Array(bitCount * 3);

      const mainCol = new THREE.Color(colorHex);
      const accCol = new THREE.Color(accentHex);
      const tmpCol = new THREE.Color();

      for (let i = 0; i < bitCount; i++) {
        const pt = shapeFn(i, bitCount);
        targetPos[i * 3 + 0] = pt.x;
        targetPos[i * 3 + 1] = pt.y;
        targetPos[i * 3 + 2] = pt.z;

        targetRot[i * 3 + 0] = pt.rx || 0;
        targetRot[i * 3 + 1] = pt.ry || 0;
        targetRot[i * 3 + 2] = pt.rz || 0;

        currentPos[i * 3 + 0] = pt.x;
        currentPos[i * 3 + 1] = pt.y;
        currentPos[i * 3 + 2] = pt.z;

        currentRot[i * 3 + 0] = pt.rx || 0;
        currentRot[i * 3 + 1] = pt.ry || 0;
        currentRot[i * 3 + 2] = pt.rz || 0;

        const blend = pt.blend !== undefined ? pt.blend : (i / bitCount);
        tmpCol.copy(mainCol).lerp(accCol, blend);
        relicMesh.setColorAt(i, tmpCol);

        relicDummy.position.set(pt.x, pt.y, pt.z);
        relicDummy.rotation.set(pt.rx || 0, pt.ry || 0, pt.rz || 0);
        relicDummy.scale.set(1, 1, 1);
        relicDummy.updateMatrix();
        relicMesh.setMatrixAt(i, relicDummy.matrix);
      }
      relicMesh.instanceColor.needsUpdate = true;
      relicMesh.instanceMatrix.needsUpdate = true;
      relicGroup.add(relicMesh);

      const hitSphereGeom = new THREE.SphereGeometry(1.8, 8, 8);
      const hitSphereMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitSphere = new THREE.Mesh(hitSphereGeom, hitSphereMat);
      relicGroup.add(hitSphere);

      spaceObjectsGroup.add(relicGroup);

      const relicObj = {
        name,
        group: relicGroup,
        mesh: relicMesh,
        hitSphere,
        bitCount,
        baseX,
        baseY,
        baseZ,
        orbitSpeed,
        phase,
        targetPos,
        targetRot,
        currentPos,
        currentRot,
        velocities,
        spinVels,
        shattered: false,
        shatterTimer: 0,
        isHovered: false,
        scale: 0.0,
        targetScale: 1.0
      };

      hitSphere.userData = { relic: relicObj };
      relicHitMeshes.push(hitSphere);
      relics.push(relicObj);

      return relicObj;
    }

    createRelic({
      name: "Quantum Hypercube",
      colorHex: 0x00f5ff,
      accentHex: 0xe0f2fe,
      baseX: -9.2,
      baseY: 4.2,
      baseZ: 0.4,
      bitCount: 32,
      orbitSpeed: 0.75,
      phase: 0.0,
      shapeFn: (i) => {
        if (i < 8) {
          return {
            x: (i & 1 ? 1 : -1) * 0.75,
            y: (i & 2 ? 1 : -1) * 0.75,
            z: (i & 4 ? 1 : -1) * 0.75,
            blend: 0.15
          };
        }
        if (i < 20) {
          const e = i - 8;
          const axis = Math.floor(e / 4);
          const sub = e % 4;
          const s1 = (sub & 1 ? 1 : -1) * 0.75;
          const s2 = (sub & 2 ? 1 : -1) * 0.75;
          let x = 0, y = 0, z = 0;
          if (axis === 0) { x = 0; y = s1; z = s2; }
          else if (axis === 1) { x = s1; y = 0; z = s2; }
          else { x = s1; y = s2; z = 0; }
          return { x, y, z, blend: 0.5 };
        }
        if (i < 26) {
          const f = i - 20;
          const sign = f % 2 === 0 ? 1 : -1;
          const axis = Math.floor(f / 2);
          let x = 0, y = 0, z = 0;
          if (axis === 0) x = sign * 0.75;
          else if (axis === 1) y = sign * 0.75;
          else z = sign * 0.75;
          return { x, y, z, blend: 0.85 };
        }
        const ang = ((i - 26) / 6) * Math.PI * 2;
        return {
          x: Math.cos(ang) * 0.28,
          y: Math.sin(ang) * 0.28,
          z: (Math.random() - 0.5) * 0.15,
          blend: 1.0
        };
      }
    });

    createRelic({
      name: "Cosmic Star Prism",
      colorHex: 0xf43f5e,
      accentHex: 0xfecdd3,
      baseX: -4.8,
      baseY: 5.6,
      baseZ: -0.4,
      bitCount: 30,
      orbitSpeed: 0.85,
      phase: 1.2,
      shapeFn: (i) => {
        const verts = [
          [0, 1.15, 0], [0, -1.15, 0],
          [1.05, 0, 0], [-1.05, 0, 0],
          [0, 0, 1.05], [0, 0, -1.05]
        ];
        if (i < 6) return { x: verts[i][0], y: verts[i][1], z: verts[i][2], blend: 0.9 };
        if (i < 22) {
          const e = i - 6;
          const top = e < 8 ? 0 : 1;
          const midIdx = (e % 4) + 2;
          const factor = (e % 2 === 0) ? 0.45 : 0.75;
          return {
            x: verts[midIdx][0] * factor,
            y: verts[top][1] * (1 - factor),
            z: verts[midIdx][2] * factor,
            blend: 0.35
          };
        }
        const k = i - 22;
        const theta = (k / 8) * Math.PI * 2;
        return {
          x: Math.cos(theta) * 0.32,
          y: (k % 2 === 0 ? 0.22 : -0.22),
          z: Math.sin(theta) * 0.32,
          blend: 0.1
        };
      }
    });

    createRelic({
      name: "Solar Energy Halo",
      colorHex: 0xf59e0b,
      accentHex: 0xfef08a,
      baseX: 2.2,
      baseY: 6.2,
      baseZ: 0.5,
      bitCount: 36,
      orbitSpeed: 0.7,
      phase: 2.4,
      shapeFn: (i) => {
        if (i === 0) return { x: 0, y: 0, z: 0, blend: 1.0 };
        if (i < 24) {
          const theta = (i / 23) * Math.PI * 2;
          const r = 0.98;
          return {
            x: Math.cos(theta) * r,
            y: Math.sin(theta) * r,
            z: Math.sin(theta * 3) * 0.25,
            rz: theta,
            blend: 0.2 + (i % 2) * 0.4
          };
        }
        const j = i - 24;
        const theta = (j / 12) * Math.PI * 2;
        const r = 0.58;
        return {
          x: Math.cos(theta) * r,
          y: Math.sin(theta) * r * 0.6,
          z: Math.cos(theta) * r * 0.7,
          blend: 0.85
        };
      }
    });

    createRelic({
      name: "Emerald Starburst",
      colorHex: 0x10b981,
      accentHex: 0xa7f3d0,
      baseX: 8.2,
      baseY: 5.4,
      baseZ: -0.3,
      bitCount: 32,
      orbitSpeed: 0.8,
      phase: 3.6,
      shapeFn: (i) => {
        if (i === 0) return { x: 0, y: 0, z: 0, blend: 1.0 };
        if (i < 19) {
          const rayIdx = Math.floor((i - 1) / 3);
          const step = (((i - 1) % 3) + 1) * 0.36;
          let x = 0, y = 0, z = 0;
          if (rayIdx === 0) x = step;
          else if (rayIdx === 1) x = -step;
          else if (rayIdx === 2) y = step;
          else if (rayIdx === 3) y = -step;
          else if (rayIdx === 4) z = step;
          else z = -step;
          return { x, y, z, blend: 0.2 + (((i - 1) % 3) * 0.35) };
        }
        const d = i - 19;
        const theta = (d / 12) * Math.PI * 2;
        const r = 0.78;
        return {
          x: Math.cos(theta) * r,
          y: Math.sin(theta) * r,
          z: Math.cos(theta * 2) * 0.38,
          blend: 0.75
        };
      }
    });

    createRelic({
      name: "Azure Vortex Gyro",
      colorHex: 0x06b6d4,
      accentHex: 0xcffafe,
      baseX: 10.4,
      baseY: 2.2,
      baseZ: 0.4,
      bitCount: 34,
      orbitSpeed: 0.9,
      phase: 4.8,
      shapeFn: (i) => {
        if (i < 16) {
          const theta = (i / 16) * Math.PI * 2;
          const r = 0.92;
          return {
            x: Math.cos(theta) * r,
            y: Math.sin(theta) * r,
            z: Math.sin(theta * 2) * 0.3,
            blend: 0.25
          };
        }
        if (i < 30) {
          const phi = ((i - 16) / 14) * Math.PI * 2;
          const r = 0.74;
          return {
            x: Math.sin(phi) * 0.25,
            y: Math.cos(phi) * r,
            z: Math.sin(phi) * r,
            blend: 0.7
          };
        }
        const ang = ((i - 30) / 4) * Math.PI * 2;
        return {
          x: Math.cos(ang) * 0.28,
          y: 0,
          z: Math.sin(ang) * 0.28,
          blend: 1.0
        };
      }
    });

    createRelic({
      name: "Violet Tachyon Matrix",
      colorHex: 0x8b5cf6,
      accentHex: 0xede9fe,
      baseX: 10.5,
      baseY: -2.2,
      baseZ: -0.4,
      bitCount: 30,
      orbitSpeed: 0.75,
      phase: 0.8,
      shapeFn: (i) => {
        const t = (i / 30) * Math.PI * 4;
        const isStrandB = i % 2 === 1;
        const radius = 0.72;
        const phaseShift = isStrandB ? Math.PI : 0;
        return {
          x: Math.cos(t + phaseShift) * radius,
          y: (i / 30 - 0.5) * 2.2,
          z: Math.sin(t + phaseShift) * radius,
          blend: isStrandB ? 0.3 : 0.85
        };
      }
    });

    createRelic({
      name: "Supernova Plasma Core",
      colorHex: 0xf97316,
      accentHex: 0xffedd5,
      baseX: 8.2,
      baseY: -5.0,
      baseZ: 0.4,
      bitCount: 32,
      orbitSpeed: 0.85,
      phase: 2.1,
      shapeFn: (i) => {
        const phi = Math.acos(1 - 2 * (i + 0.5) / 32);
        const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
        const r = 0.88 + (i % 3 === 0 ? 0.25 : 0);
        return {
          x: Math.sin(phi) * Math.cos(theta) * r,
          y: Math.sin(phi) * Math.sin(theta) * r,
          z: Math.cos(phi) * r,
          blend: i / 32
        };
      }
    });

    createRelic({
      name: "Starlight Celeste Ring",
      colorHex: 0xeab308,
      accentHex: 0xfef9c3,
      baseX: 2.2,
      baseY: -5.8,
      baseZ: -0.3,
      bitCount: 36,
      orbitSpeed: 0.72,
      phase: 3.4,
      shapeFn: (i) => {
        if (i === 0) return { x: 0, y: 0, z: 0, blend: 1.0 };
        if (i < 24) {
          const theta = (i / 23) * Math.PI * 2;
          const r = 0.94;
          return {
            x: Math.cos(theta) * r,
            y: Math.sin(theta) * r * 0.7,
            z: Math.cos(theta * 2) * 0.35,
            blend: 0.3 + (i % 2) * 0.5
          };
        }
        const ang = ((i - 24) / 12) * Math.PI * 2;
        const r2 = 0.52;
        return {
          x: Math.cos(ang) * r2,
          y: Math.sin(ang) * r2 * 0.5,
          z: (i % 2 === 0 ? 0.3 : -0.3),
          blend: 0.85
        };
      }
    });

    createRelic({
      name: "Aquamarine Matrix Lattice",
      colorHex: 0x14b8a6,
      accentHex: 0xccfbf1,
      baseX: -4.5,
      baseY: -4.8,
      baseZ: 0.4,
      bitCount: 32,
      orbitSpeed: 0.82,
      phase: 4.6,
      shapeFn: (i) => {
        if (i < 12) {
          const theta = (i / 12) * Math.PI * 2;
          const r = 0.88;
          return { x: Math.cos(theta) * r, y: -0.5, z: Math.sin(theta) * r, blend: 0.3 };
        }
        if (i < 24) {
          const theta = ((i - 12) / 12) * Math.PI * 2 + Math.PI / 12;
          const r = 0.88;
          return { x: Math.cos(theta) * r, y: 0.5, z: Math.sin(theta) * r, blend: 0.7 };
        }
        const tip = i - 24;
        const ySign = tip < 4 ? 1.15 : -1.15;
        const theta = (tip % 4) * Math.PI * 0.5;
        return { x: Math.cos(theta) * 0.35, y: ySign, z: Math.sin(theta) * 0.35, blend: 1.0 };
      }
    });

    createRelic({
      name: "Nebula Crystal Prism",
      colorHex: 0xc084fc,
      accentHex: 0xfae8ff,
      baseX: -9.0,
      baseY: -1.8,
      baseZ: -0.3,
      bitCount: 30,
      orbitSpeed: 0.76,
      phase: 5.8,
      shapeFn: (i) => {
        if (i < 10) {
          const ang = (i / 10) * Math.PI * 2;
          return { x: Math.cos(ang) * 0.72, y: (i % 2 === 0 ? 0.35 : -0.35), z: Math.sin(ang) * 0.72, blend: 0.4 };
        }
        if (i < 24) {
          const ang = ((i - 10) / 14) * Math.PI * 2;
          return { x: Math.cos(ang) * 0.45, y: (i % 2 === 0 ? 0.75 : -0.75), z: Math.sin(ang) * 0.45, blend: 0.75 };
        }
        const top = i - 24;
        return { x: 0, y: top < 3 ? 1.25 : -1.25, z: (top % 3 - 1) * 0.25, blend: 1.0 };
      }
    });

    function shatterRelic(relic) {
      if (relic.shattered) return;
      relic.shattered = true;
      relic.shatterTimer = 0;

      const count = relic.bitCount;
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const tx = relic.targetPos[i3 + 0];
        const ty = relic.targetPos[i3 + 1];
        const tz = relic.targetPos[i3 + 2];

        let dist = Math.hypot(tx, ty, tz);
        let dx = dist > 0.001 ? tx / dist : (Math.random() - 0.5);
        let dy = dist > 0.001 ? ty / dist : (Math.random() - 0.5);
        let dz = dist > 0.001 ? tz / dist : (Math.random() - 0.5);

        const speed = 4.8 + Math.random() * 4.2;
        relic.velocities[i3 + 0] = dx * speed + (Math.random() - 0.5) * 2.2;
        relic.velocities[i3 + 1] = dy * speed + (Math.random() - 0.5) * 2.2;
        relic.velocities[i3 + 2] = dz * speed + (Math.random() - 0.5) * 2.2;

        relic.spinVels[i3 + 0] = (Math.random() - 0.5) * 16.0;
        relic.spinVels[i3 + 1] = (Math.random() - 0.5) * 16.0;
        relic.spinVels[i3 + 2] = (Math.random() - 0.5) * 16.0;
      }

      pulseWave = 0;

      if (statusLabel) {
        statusLabel.textContent = `💥 ${relic.name} Shattered Into Bits!`;
      }
    }

    let scrollFormation = 0;       
    let targetFormation = 0;
    let formationScale = 0;
    let mouseX = 0, mouseY = 0;
    let rotX = 0, rotY = 0;
    let targetRotX = 0, targetRotY = 0;
    let pulseWave = -10;
    let isInView = false;
    let animId = 0;
    let clock = new THREE.Clock();

    const updateScrollProgress = () => {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;

      if (rect.bottom < 0 || rect.top > vh) {
        targetFormation = 0;
        isInView = false;
      } else {
        isInView = true;
        
        const centerOffset = Math.abs((rect.top + rect.bottom) / 2 - vh / 2);
        const maxOffset = vh * 0.75;
        const norm = Math.max(0, 1 - centerOffset / maxOffset);
        
        targetFormation = Math.min(1, Math.max(0, norm * 1.35));
      }
    };

    let scrollScheduled = false;
    const onScroll = () => {
      if (scrollScheduled || !isFlowerInView) return;
      scrollScheduled = true;
      requestAnimationFrame(() => {
        scrollScheduled = false;
        updateScrollProgress();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    updateScrollProgress();

    let relicStageRect = null;
    stage.addEventListener("pointerenter", () => {
      relicStageRect = stage.getBoundingClientRect();
    }, { passive: true });

    stage.addEventListener("pointermove", (e) => {
      if (!relicStageRect) relicStageRect = stage.getBoundingClientRect();
      mouseX = ((e.clientX - relicStageRect.left) / relicStageRect.width) * 2 - 1;
      mouseY = ((e.clientY - relicStageRect.top) / relicStageRect.height) * 2 - 1;

      targetRotY = mouseX * 0.75;
      targetRotX = -mouseY * 0.45;

      relicMouseNDC.x = mouseX;
      relicMouseNDC.y = -mouseY;
      relicRaycaster.setFromCamera(relicMouseNDC, camera);
      const intersects = relicRaycaster.intersectObjects(relicHitMeshes, false);

      for (let r = 0; r < relics.length; r++) {
        relics[r].isHovered = false;
      }

      if (intersects.length > 0 && formationScale > 0.25) {
        const found = intersects[0].object.userData.relic;
        if (found && !found.shattered) {
          found.isHovered = true;
          stage.style.cursor = "pointer";
        } else {
          stage.style.cursor = "";
        }
      } else {
        stage.style.cursor = "";
      }
    }, { passive: true });

    stage.addEventListener("pointerleave", () => {
      relicStageRect = null;
      mouseX = 0;
      mouseY = 0;
      targetRotX = 0;
      targetRotY = 0;
      relicMouseNDC.set(-999, -999);
      for (let r = 0; r < relics.length; r++) {
        relics[r].isHovered = false;
      }
      stage.style.cursor = "";
    });

    stage.addEventListener("click", (e) => {
      const rect = stage.getBoundingClientRect();
      const clickNDC = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      );
      relicRaycaster.setFromCamera(clickNDC, camera);
      const intersects = relicRaycaster.intersectObjects(relicHitMeshes, false);

      if (intersects.length > 0 && formationScale > 0.2) {
        const clickedRelic = intersects[0].object.userData.relic;
        if (clickedRelic && !clickedRelic.shattered) {
          shatterRelic(clickedRelic);
          return;
        }
      }

      pulseWave = 0;
    });

    const dummy = new THREE.Object3D();

    function renderLoop() {
      if (!isFlowerInView) {
        animId = 0;
        return;
      }
      animId = requestAnimationFrame(renderLoop);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      scrollFormation += (targetFormation - scrollFormation) * 0.08;
      formationScale = Math.min(1, Math.max(0, (scrollFormation - 0.15) / 0.5));

      if (statusLabel) {
        const anyShattered = relics.some(r => r.shattered);
        if (!anyShattered) {
          if (scrollFormation < 0.25) {
            statusLabel.textContent = "Scattered Bits (Scroll to Assemble)";
          } else if (scrollFormation < 0.85) {
            statusLabel.textContent = `Assembling Bits: ${Math.round(scrollFormation * 100)}%`;
          } else {
            statusLabel.textContent = "3D Voxel Bloom · Interactive Objects";
          }
        }
      }

      rotX += (targetRotX - rotX) * 0.08;
      rotY += (targetRotY - rotY) * 0.08;
      flowerGroup.rotation.y = rotY + Math.sin(elapsed * 0.35) * 0.08;
      flowerGroup.rotation.x = -0.06 + rotX + Math.cos(elapsed * 0.28) * 0.04;

      if (pulseWave >= 0) {
        pulseWave += delta * 7.5;
        if (pulseWave > 9) pulseWave = -10;
      }

      const f = scrollFormation;
      const fEased = f * f * (3 - 2 * f); 

      for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;
        const ax = assembledPos[i3 + 0];
        const ay = assembledPos[i3 + 1];
        const az = assembledPos[i3 + 2];

        const sx = scatterPos[i3 + 0];
        const sy = scatterPos[i3 + 1];
        const sz = scatterPos[i3 + 2];

        const layer = bitLayers[i];
        const flutter = Math.sin(elapsed * 1.8 + i * 0.05) * 0.08 * (layer + 0.5);

        const mouseDist = Math.hypot(ax - mouseX * 4, ay - (-mouseY * 4));
        const sway = mouseDist < 3.5 ? Math.cos((mouseDist / 3.5) * Math.PI * 0.5) * 0.35 : 0;

        let pulseBump = 0;
        if (pulseWave >= 0) {
          const bitDist = Math.hypot(ax, ay);
          const diff = Math.abs(bitDist - pulseWave);
          if (diff < 1.2) {
            pulseBump = Math.sin((1 - diff / 1.2) * Math.PI) * 0.5;
          }
        }

        const targetX = sx + (ax - sx) * fEased + sway * 0.3;
        const targetY = sy + (ay - sy) * fEased + sway * 0.3;
        const targetZ = sz + (az + flutter + pulseBump - sz) * fEased;

        currentPos[i3 + 0] += (targetX - currentPos[i3 + 0]) * 0.15;
        currentPos[i3 + 1] += (targetY - currentPos[i3 + 1]) * 0.15;
        currentPos[i3 + 2] += (targetZ - currentPos[i3 + 2]) * 0.15;

        const arx = assembledRot[i3 + 0];
        const ary = assembledRot[i3 + 1];
        const arz = assembledRot[i3 + 2];

        const srx = scatterRot[i3 + 0] + elapsed * 0.2;
        const sry = scatterRot[i3 + 1] + elapsed * 0.2;
        const srz = scatterRot[i3 + 2];

        dummy.position.set(currentPos[i3 + 0], currentPos[i3 + 1], currentPos[i3 + 2]);
        dummy.rotation.set(
          srx + (arx - srx) * fEased,
          sry + (ary - sry) * fEased,
          srz + (arz - srz) * fEased
        );

        const scale = 1.0 + pulseBump * 0.8;
        dummy.scale.set(scale, scale, scale);

        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;

      spaceObjectsGroup.rotation.y = rotY * 0.45 + Math.sin(elapsed * 0.22) * 0.04;
      spaceObjectsGroup.rotation.x = rotX * 0.35 + Math.cos(elapsed * 0.18) * 0.03;

      for (let r = 0; r < relics.length; r++) {
        const rel = relics[r];

        rel.targetScale = (rel.isHovered ? 1.25 : 1.0) * formationScale;
        rel.scale += (rel.targetScale - rel.scale) * 0.15;
        rel.group.scale.set(rel.scale, rel.scale, rel.scale);

        const bob = Math.sin(elapsed * rel.orbitSpeed + rel.phase) * 0.26;
        const drift = Math.cos(elapsed * (rel.orbitSpeed * 0.8) + rel.phase) * 0.2;
        rel.group.position.x = rel.baseX + drift;
        rel.group.position.y = rel.baseY + bob;
        rel.group.position.z = rel.baseZ + Math.sin(elapsed * 0.5 + rel.phase) * 0.16;

        rel.group.rotation.y += delta * 0.7;
        rel.group.rotation.x += delta * 0.4;

        if (rel.shattered) {
          rel.shatterTimer += delta;

          if (rel.shatterTimer < 3.2) {
            
            const drag = Math.pow(0.92, delta * 60);
            for (let i = 0; i < rel.bitCount; i++) {
              const i3 = i * 3;
              rel.currentPos[i3 + 0] += rel.velocities[i3 + 0] * delta;
              rel.currentPos[i3 + 1] += rel.velocities[i3 + 1] * delta;
              rel.currentPos[i3 + 2] += rel.velocities[i3 + 2] * delta;

              rel.velocities[i3 + 0] *= drag;
              rel.velocities[i3 + 1] *= drag;
              rel.velocities[i3 + 2] *= drag;

              rel.currentRot[i3 + 0] += rel.spinVels[i3 + 0] * delta;
              rel.currentRot[i3 + 1] += rel.spinVels[i3 + 1] * delta;
              rel.currentRot[i3 + 2] += rel.spinVels[i3 + 2] * delta;
            }
          } else {
            
            const pullProg = Math.min(1, (rel.shatterTimer - 3.2) / 1.2);
            const spring = Math.min(1, (0.09 + pullProg * 0.14) * (delta * 60));

            let maxErr = 0;
            for (let i = 0; i < rel.bitCount; i++) {
              const i3 = i * 3;
              const tx = rel.targetPos[i3 + 0];
              const ty = rel.targetPos[i3 + 1];
              const tz = rel.targetPos[i3 + 2];

              rel.currentPos[i3 + 0] += (tx - rel.currentPos[i3 + 0]) * spring;
              rel.currentPos[i3 + 1] += (ty - rel.currentPos[i3 + 1]) * spring;
              rel.currentPos[i3 + 2] += (tz - rel.currentPos[i3 + 2]) * spring;

              rel.currentRot[i3 + 0] += (rel.targetRot[i3 + 0] - rel.currentRot[i3 + 0]) * spring;
              rel.currentRot[i3 + 1] += (rel.targetRot[i3 + 1] - rel.currentRot[i3 + 1]) * spring;
              rel.currentRot[i3 + 2] += (rel.targetRot[i3 + 2] - rel.currentRot[i3 + 2]) * spring;

              const err = Math.hypot(
                tx - rel.currentPos[i3 + 0],
                ty - rel.currentPos[i3 + 1],
                tz - rel.currentPos[i3 + 2]
              );
              if (err > maxErr) maxErr = err;
            }

            if (rel.shatterTimer > 4.6 || maxErr < 0.04) {
              
              for (let i = 0; i < rel.bitCount; i++) {
                const i3 = i * 3;
                rel.currentPos[i3 + 0] = rel.targetPos[i3 + 0];
                rel.currentPos[i3 + 1] = rel.targetPos[i3 + 1];
                rel.currentPos[i3 + 2] = rel.targetPos[i3 + 2];
                rel.currentRot[i3 + 0] = rel.targetRot[i3 + 0];
                rel.currentRot[i3 + 1] = rel.targetRot[i3 + 1];
                rel.currentRot[i3 + 2] = rel.targetRot[i3 + 2];
              }
              rel.shattered = false;
              rel.shatterTimer = 0;
            }
          }
        }

        for (let i = 0; i < rel.bitCount; i++) {
          const i3 = i * 3;
          relicDummy.position.set(
            rel.currentPos[i3 + 0],
            rel.currentPos[i3 + 1],
            rel.currentPos[i3 + 2]
          );
          relicDummy.rotation.set(
            rel.currentRot[i3 + 0],
            rel.currentRot[i3 + 1],
            rel.currentRot[i3 + 2]
          );
          relicDummy.scale.set(1, 1, 1);
          relicDummy.updateMatrix();
          rel.mesh.setMatrixAt(i, relicDummy.matrix);
        }
        rel.mesh.instanceMatrix.needsUpdate = true;
      }

      renderer.render(scene, camera);
    }

    window.addEventListener("resize", resize, { passive: true });
    resize();
    renderLoop();

    window._resumeFlowerLoop = () => {
      if (!animId && isFlowerInView) {
        clock.getDelta();
        renderLoop();
      }
    };
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        isFlowerInView = entry.isIntersecting;
        if (entry.isIntersecting) {
          section.classList.add("vt-visible");
          window._resumeFlowerLoop?.();
        }
      });
    }, { threshold: 0, rootMargin: '120px 0px' }).observe(section);
  } else {
    isFlowerInView = true;
    section.classList.add("vt-visible");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFlower);
  } else {
    initFlower();
  }
})();

(() => {
  const container = document.getElementById("breakoutContainer");
  const canvas = document.getElementById("breakoutCanvas");
  const scoreEl = document.getElementById("breakoutScore");
  const overlay = document.getElementById("breakoutOverlay");
  const overlayTitle = document.getElementById("breakoutOverlayTitle");
  const overlaySub = document.getElementById("breakoutOverlaySub");
  const actionBtn = document.getElementById("breakoutActionBtn");
  const hintEl = document.getElementById("breakoutHint");
  const lifeDots = [
    document.getElementById("lifeDot1"),
    document.getElementById("lifeDot2"),
    document.getElementById("lifeDot3")
  ];

  if (!container || !canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const FONT_7x = {
    H: [
      [1, 0, 1],
      [1, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [1, 0, 1],
      [1, 0, 1],
      [1, 0, 1]
    ],
    E: [
      [1, 1, 1],
      [1, 0, 0],
      [1, 0, 0],
      [1, 1, 1],
      [1, 0, 0],
      [1, 0, 0],
      [1, 1, 1]
    ],
    L: [
      [1, 0, 0],
      [1, 0, 0],
      [1, 0, 0],
      [1, 0, 0],
      [1, 0, 0],
      [1, 0, 0],
      [1, 1, 1]
    ],
    O: [
      [1, 1, 1, 1],
      [1, 0, 0, 1],
      [1, 0, 0, 1],
      [1, 0, 0, 1],
      [1, 0, 0, 1],
      [1, 0, 0, 1],
      [1, 1, 1, 1]
    ],
    W: [
      [1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1],
      [1, 1, 0, 1, 1],
      [1, 0, 0, 0, 1]
    ],
    R: [
      [1, 1, 1],
      [1, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [1, 1, 0],
      [1, 0, 1],
      [1, 0, 1]
    ],
    D: [
      [1, 1, 1, 0],
      [1, 0, 0, 1],
      [1, 0, 0, 1],
      [1, 0, 0, 1],
      [1, 0, 0, 1],
      [1, 0, 0, 1],
      [1, 1, 1, 0]
    ]
  };

  let width = 0;
  let height = 0;
  let blocks = [];
  let particles = [];
  let lives = 3;
  let hitCount = 0;
  let totalBlocks = 0;
  let isBallActive = false;
  let animId = 0;

  const paddle = {
    x: 0,
    targetX: 0,
    y: 0,
    w: 120,
    h: 12,
    radius: 6
  };

  const ball = {
    x: 0,
    y: 0,
    r: 7.5,
    vx: 0,
    vy: 0
  };

  function roundRectHelper(context, x, y, w, h, r) {
    if (context.roundRect) {
      context.roundRect(x, y, w, h, r);
    } else {
      context.rect(x, y, w, h);
    }
  }

  function generateBlocks() {
    blocks = [];
    const unit = Math.min(17, Math.max(8, Math.floor(width / 34)));
    const gap = Math.max(2, Math.floor(unit * 0.22));
    const step = unit + gap;

    const helloLetters = ["H", "E", "L", "L", "O"];
    let helloTotalCols = 0;
    helloLetters.forEach((letter, i) => {
      helloTotalCols += FONT_7x[letter][0].length;
      if (i < helloLetters.length - 1) helloTotalCols += 2; 
    });
    const helloWidth = helloTotalCols * step - gap;
    const startX1 = Math.round((width - helloWidth) / 2);
    const startY1 = Math.max(34, Math.round(height * 0.12));

    let colOffset1 = 0;
    helloLetters.forEach((letter, lIdx) => {
      const grid = FONT_7x[letter];
      const cols = grid[0].length;
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] === 1) {
            blocks.push({
              x: startX1 + (colOffset1 + c) * step,
              y: startY1 + r * step,
              w: unit,
              h: unit,
              hit: false
            });
          }
        }
      }
      colOffset1 += cols + 2;
    });

    const worldLetters = ["W", "O", "R", "L", "D"];
    let worldTotalCols = 0;
    worldLetters.forEach((letter, i) => {
      worldTotalCols += FONT_7x[letter][0].length;
      if (i < worldLetters.length - 1) worldTotalCols += 2;
    });
    const worldWidth = worldTotalCols * step - gap;
    const startX2 = Math.round((width - worldWidth) / 2);
    const startY2 = startY1 + 7 * step + Math.max(16, unit * 1.5);

    let colOffset2 = 0;
    worldLetters.forEach((letter, lIdx) => {
      const grid = FONT_7x[letter];
      const cols = grid[0].length;
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] === 1) {
            blocks.push({
              x: startX2 + (colOffset2 + c) * step,
              y: startY2 + r * step,
              w: unit,
              h: unit,
              hit: false
            });
          }
        }
      }
      colOffset2 += cols + 2;
    });

    totalBlocks = blocks.length;
    updateScoreUI();
  }

  function resize() {
    const rect = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    paddle.w = Math.max(90, Math.min(145, width * 0.16));
    paddle.y = height - 38;

    generateBlocks();

    if (!isBallActive) {
      resetBallToPaddle();
    }
  }

  function updateScoreUI() {
    if (scoreEl) {
      scoreEl.textContent = `BLOCKS: ${hitCount} / ${totalBlocks}`;
    }
    lifeDots.forEach((dot, idx) => {
      if (dot) {
        if (idx < lives) dot.classList.add("active");
        else dot.classList.remove("active");
      }
    });
  }

  function resetBallToPaddle() {
    isBallActive = false;
    ball.x = paddle.x + paddle.w / 2;
    ball.y = paddle.y - ball.r - 2;
    ball.vx = 0;
    ball.vy = 0;
  }

  function launchBall() {
    if (lives <= 0) {
      
      lives = 3;
      hitCount = 0;
      blocks.forEach((b) => (b.hit = false));
      updateScoreUI();
    }

    if (overlay) overlay.style.display = "none";
    if (hintEl) hintEl.style.display = "none";

    const angle = (Math.random() - 0.5) * 0.8;
    const speed = 5.8;
    ball.vx = speed * Math.sin(angle);
    ball.vy = -speed * Math.cos(angle);
    isBallActive = true;
  }

  function loseLife() {
    isBallActive = false;
    lives--;
    updateScoreUI();

    if (lives > 0) {
      if (overlayTitle) overlayTitle.textContent = `Attempt ${3 - lives} Lost`;
      if (overlaySub) overlaySub.textContent = `${lives} ${lives === 1 ? "attempt" : "attempts"} remaining. Break it if you can.`;
      if (actionBtn) actionBtn.textContent = `Launch Attempt ${3 - lives + 1}`;
      if (overlay) overlay.style.display = "flex";
    } else {
      if (overlayTitle) overlayTitle.textContent = "All 3 Attempts Used";
      if (overlaySub) overlaySub.textContent = "It still ships. Rebuild and break again.";
      if (actionBtn) actionBtn.textContent = "Try Again ↻";
      if (overlay) overlay.style.display = "flex";
    }

    resetBallToPaddle();
  }

  function winGame() {
    isBallActive = false;
    if (overlayTitle) overlayTitle.textContent = "ALL BROKEN!";
    if (overlaySub) overlaySub.textContent = "You broke every block. It still ships.";
    if (actionBtn) actionBtn.textContent = "Rebuild Blocks ↻";
    if (overlay) overlay.style.display = "flex";
  }

  let breakoutRect = null;
  container.addEventListener("pointerenter", () => {
    breakoutRect = container.getBoundingClientRect();
  }, { passive: true });

  container.addEventListener("pointermove", (e) => {
    if (!breakoutRect) breakoutRect = container.getBoundingClientRect();
    const clientX = e.clientX - breakoutRect.left;
    paddle.targetX = clientX - paddle.w / 2;
  }, { passive: true });

  container.addEventListener("pointerleave", () => {
    breakoutRect = null;
  }, { passive: true });

  container.addEventListener("pointerdown", () => {
    if (!isBallActive && (!overlay || overlay.style.display === "none")) {
      launchBall();
    }
  });

  actionBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    launchBall();
  });

  function draw() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (!b.hit) {
        
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        roundRectHelper(ctx, b.x, b.y, b.w, b.h, 2.5);
        ctx.fill();
      } else {
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        roundRectHelper(ctx, b.x, b.y, b.w, b.h, 2.5);
        ctx.fill();
        ctx.stroke();
      }
    }

    for (let pIdx = particles.length - 1; pIdx >= 0; pIdx--) {
      const p = particles[pIdx];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.04;
      if (p.life <= 0) {
        particles.splice(pIdx, 1);
      } else {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.life.toFixed(2)})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    }

    paddle.x += (paddle.targetX - paddle.x) * 0.28;
    paddle.x = Math.max(0, Math.min(width - paddle.w, paddle.x));

    ctx.fillStyle = "#e8e6df";
    ctx.beginPath();
    roundRectHelper(ctx, paddle.x, paddle.y, paddle.w, paddle.h, paddle.radius);
    ctx.fill();

    if (!isBallActive) {
      ball.x = paddle.x + paddle.w / 2;
      ball.y = paddle.y - ball.r - 2;
    } else {
      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.x - ball.r <= 0) {
        ball.x = ball.r;
        ball.vx = -ball.vx;
      } else if (ball.x + ball.r >= width) {
        ball.x = width - ball.r;
        ball.vx = -ball.vx;
      }

      if (ball.y - ball.r <= 0) {
        ball.y = ball.r;
        ball.vy = -ball.vy;
      }

      if (
        ball.vy > 0 &&
        ball.y + ball.r >= paddle.y &&
        ball.y - ball.r <= paddle.y + paddle.h &&
        ball.x + ball.r >= paddle.x &&
        ball.x - ball.r <= paddle.x + paddle.w
      ) {
        const offset = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
        const maxAngle = Math.PI * 0.38;
        const angle = offset * maxAngle;
        const currentSpeed = Math.min(8.8, Math.hypot(ball.vx, ball.vy) + 0.04);

        ball.vx = currentSpeed * Math.sin(angle);
        ball.vy = -Math.abs(currentSpeed * Math.cos(angle));
        ball.y = paddle.y - ball.r - 1;
      }

      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (!b.hit) {
          if (
            ball.x + ball.r >= b.x &&
            ball.x - ball.r <= b.x + b.w &&
            ball.y + ball.r >= b.y &&
            ball.y - ball.r <= b.y + b.h
          ) {
            b.hit = true;
            hitCount++;
            updateScoreUI();

            const prevX = ball.x - ball.vx;
            if (prevX + ball.r <= b.x || prevX - ball.r >= b.x + b.w) {
              ball.vx = -ball.vx;
            } else {
              ball.vy = -ball.vy;
            }

            for (let k = 0; k < 6; k++) {
              particles.push({
                x: b.x + b.w / 2,
                y: b.y + b.h / 2,
                vx: (Math.random() - 0.5) * 4.5,
                vy: (Math.random() - 0.5) * 4.5,
                size: 2.5,
                life: 1
              });
            }

            if (hitCount === totalBlocks) {
              winGame();
            }
            break; 
          }
        }
      }

      if (ball.y - ball.r > height + 8) {
        loseLife();
      }
    }

    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(255, 255, 255, 0.75)";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (isBreakoutInView) {
      animId = requestAnimationFrame(draw);
    } else {
      animId = 0;
    }
  }

  let isBreakoutInView = false;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      isBreakoutInView = entries[0].isIntersecting;
      if (isBreakoutInView && !animId) {
        animId = requestAnimationFrame(draw);
      }
    }, { threshold: 0 }).observe(container);
  } else {
    isBreakoutInView = true;
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();
  draw();
})();

(() => {
  const tabs = document.querySelectorAll(".toolkit-tab-btn");
  const cards = document.querySelectorAll(".toolkit-card");
  if (!tabs.length || !cards.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const category = tab.getAttribute("data-filter");

      cards.forEach((card) => {
        const cardCat = card.getAttribute("data-category");
        if (category === "all" || cardCat === category) {
          card.style.display = "";
          card.style.opacity = "0";
          card.style.transform = "scale(0.97)";
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              card.style.opacity = "1";
              card.style.transform = "scale(1)";
            });
          });
        } else {
          
          card.style.display = "none";
          card.style.opacity = "0";
          card.style.transform = "scale(0.97)";
        }
      });
    });
  });
})();

(() => {
  
  document.documentElement.classList.add("js-scroll-ready");

  function initStaggers() {
    const staggerContainers = document.querySelectorAll('[data-scroll="stagger"]');
    staggerContainers.forEach((container) => {
      Array.from(container.children).forEach((child, idx) => {
        child.style.setProperty("--stagger-i", idx);
      });
    });
  }
  initStaggers();

  const scrollElements = document.querySelectorAll("[data-scroll], .experience-item, .toolkit-card, .cert-card");
  const allSections = document.querySelectorAll("section");

  function revealVisibleElements() {
    const vh = window.innerHeight;
    scrollElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top <= vh + 120 && rect.bottom >= -120) {
        el.classList.add("is-inview");
      }
    });

    allSections.forEach((sec) => {
      const sRect = sec.getBoundingClientRect();
      if (sRect.top <= vh + 120 && sRect.bottom >= -120) {
        sec.classList.add("is-inview");
        sec.querySelectorAll("[data-scroll], .experience-item, .toolkit-card, .cert-card").forEach((child) => {
          child.classList.add("is-inview");
        });
      }
    });
  }

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-inview");
          const children = entry.target.querySelectorAll("[data-scroll], .experience-item, .toolkit-card, .cert-card");
          children.forEach((c) => c.classList.add("is-inview"));
        }
      });
    }, {
      threshold: 0,
      rootMargin: "120px 0px 120px 0px"
    });

    scrollElements.forEach((el) => revealObserver.observe(el));
    allSections.forEach((sec) => revealObserver.observe(sec));
  } else {
    scrollElements.forEach((el) => el.classList.add("is-inview"));
  }

  revealVisibleElements();
  setTimeout(revealVisibleElements, 60);
  setTimeout(revealVisibleElements, 200);

  window.addEventListener("hashchange", () => {
    setTimeout(revealVisibleElements, 40);
  });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", () => {
      setTimeout(revealVisibleElements, 40);
      setTimeout(revealVisibleElements, 220);
    });
  });

  let parallaxItems = [];

  function cacheParallaxGeometry() {
    const scrollY = window.scrollY;
    parallaxItems = Array.from(document.querySelectorAll("[data-parallax-speed]")).map((node) => {
      const speed = parseFloat(node.getAttribute("data-parallax-speed") || "0.2");
      const rect = node.getBoundingClientRect();
      return {
        el: node,
        speed: isNaN(speed) ? 0.2 : speed,
        cachedCenter: rect.top + scrollY + rect.height / 2
      };
    });
  }

  let isParallaxScheduled = false;
  let currentScrollY = window.scrollY;

  function renderParallaxFrame() {
    const vh = window.innerHeight;
    const viewCenter = currentScrollY + vh * 0.5;

    for (let i = 0; i < parallaxItems.length; i++) {
      const item = parallaxItems[i];
      const offset = (viewCenter - item.cachedCenter) * item.speed;
      item.el.style.setProperty("--parallax-y", `${offset.toFixed(1)}px`);
    }
    isParallaxScheduled = false;
  }

  window.addEventListener("scroll", () => {
    currentScrollY = window.scrollY;
    if (!isParallaxScheduled && parallaxItems.length > 0) {
      isParallaxScheduled = true;
      requestAnimationFrame(renderParallaxFrame);
    }
  }, { passive: true });

  window.addEventListener("resize", () => {
    initStaggers();
    cacheParallaxGeometry();
    renderParallaxFrame();
  }, { passive: true });

  cacheParallaxGeometry();
  renderParallaxFrame();
  revealVisibleElements();
  setTimeout(revealVisibleElements, 80);
  setTimeout(revealVisibleElements, 350);

  const tiltableCards = document.querySelectorAll(
    ".project, .project-card, .toolkit-card, .cert-card, .about-metric-card"
  );

  tiltableCards.forEach((card) => {
    card.classList.add("tilt-card-active");
    let targetX = 0, targetY = 0;
    let isHovered = false;
    let tiltAnimId = 0;
    let cachedRect = null;

    function renderTilt() {
      tiltAnimId = 0;
      if (!isHovered) {
        card.style.transform = "";
        return;
      }
      card.style.transform = `perspective(1000px) rotateX(${targetY.toFixed(2)}deg) rotateY(${targetX.toFixed(2)}deg) translate3d(0, -3px, 8px)`;
      if (isHovered) {
        tiltAnimId = requestAnimationFrame(renderTilt);
      }
    }

    card.addEventListener("pointerenter", () => {
      cachedRect = card.getBoundingClientRect();
      isHovered = true;
    }, { passive: true });

    card.addEventListener("pointermove", (e) => {
      isHovered = true;
      if (!cachedRect) cachedRect = card.getBoundingClientRect();
      const px = (e.clientX - cachedRect.left) / cachedRect.width - 0.5;
      const py = (e.clientY - cachedRect.top) / cachedRect.height - 0.5;
      targetX = px * 8; 
      targetY = -py * 8; 
      if (!tiltAnimId) {
        tiltAnimId = requestAnimationFrame(renderTilt);
      }
    }, { passive: true });

    card.addEventListener("pointerleave", () => {
      isHovered = false;
      cachedRect = null;
      card.style.transform = "";
    }, { passive: true });
  });
})();
