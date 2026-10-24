# Muhammad Ibrahim Iyaz — Personal Portfolio

<div align="center">

<img src="assets/logo.png" alt="Ibrahim Iyaz Monogram Logo" width="110" height="110" style="border-radius: 24px; box-shadow: 0 16px 36px rgba(0,0,0,0.18);" />

### Developer • Designer • Creative Technologist
**A high-performance, interactive personal portfolio engineered with modern web technologies, 3D WebGL physics, and tactile micro-interactions.**

[![Deploy to Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Three.js](https://img.shields.io/badge/3D_Engine-Three.js_r150-000000?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![Vanilla Stack](https://img.shields.io/badge/Stack-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS-E34F26?style=for-the-badge&logo=javascript&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

[Features](#-key-features) • [Interactive Showcase](#-interactive-showcase) • [Project Structure](#-project-structure) • [Local Setup](#-local-development) • [Deployment](#-deployment) • [Performance](#-performance--optimizations)

</div>

---

## ✦ Overview

This repository houses the source code for **Muhammad Ibrahim Iyaz's** personal portfolio. Crafted from the ground up without heavy frameworks, it proves that vanilla web fundamentals combined with tailored WebGL shaders and physics engines can achieve silky-smooth 60+ FPS animations, instant loading, and exceptional visual fidelity.

---

## ✦ Key Features

- **3D Physics Interactive Lanyard**: Real-time Verlet integration rope simulation holding a double-sided photorealistic ID badge with dynamic drag-and-drop, inertial sway, and glossy light reflections.
- **Scrambled Text Effect**: GSAP-inspired typography scrambler on hero headline cards with character proximity and decoding animations.
- **macOS Magnification Dock**: Fluid physics-driven navigation dock with cosine curve magnification, active section tracking, and acoustic click feedback.
- **MicroSlats Ambient Canvas**: Minimalist hardware-accelerated grid canvas creating ambient depth without consuming main thread budget.
- **Interactive Arcade & Laboratory**:
  - **Retro Breakout Game**: Playable mini-arcade engine built with HTML5 canvas, ball physics, paddle controls, and score tracking.
  - **Voxel 3D Flower**: Interactive generative 3D model that rotates and reacts to mouse orientation.
  - **Interactive Terminal**: Unix-style terminal emulator supporting commands like `help`, `about`, `projects`, `skills`, and `clear`.
  - **Solar System Simulation**: Interactive celestial card showcasing planetary orbital physics.
- **Procedural Sound Engine**: Lightweight Web Audio API synthesizer generating tactile haptic clicks, hover blips, and arcade sound effects without external audio files.
- **Dual Theme System**: Seamless toggle between Light and Dark modes with automatic OS `prefers-color-scheme` synchronization and `localStorage` persistence.
- **Zero Horizontal Overflow Mobile Experience**: 100% responsive design tested across modern smartphones, tablets, laptops, and ultra-wide screens.

---

## ✦ Interactive Showcase

| Module | Engine | Description |
| :--- | :--- | :--- |
| **3D Lanyard** | `Three.js` | Realistic lanyard rope physics with custom double-sided badge texture maps. |
| **Magic Rings** | `Three.js` | Gyroscopic floating metallic rings responding to cursor orientation. |
| **ScrambledText** | `Vanilla JS` | Character-scrambling typography effect with customizable glyph set. |
| **macOS Dock** | `Vanilla JS` | Dock magnification mimicking macOS Sonoma with audio feedback. |
| **Border Glow** | `Vanilla JS` | Radial light beam tracing card borders under mouse movement. |
| **Glass Icons** | `CSS3 + JS` | Multi-layered frosted glass icon stacks with 3D tilt response. |
| **Variable Proximity** | `Canvas/DOM` | Typography font-weight and letter-spacing shifting dynamically with cursor distance. |

---

## ✦ Project Structure

```
portfolio/
├── assets/
│   ├── Elegant Ibrahim Iyaz Monogram Logo.png  # Master brand mark
│   ├── band.png / band.webp                    # Lanyard fabric texture
│   ├── card-front.png / card-front.webp        # ID card front texture
│   ├── card-back.png / card-back.webp          # ID card back texture
│   └── logo.png / logo.webp                    # Web optimized icons & favicons
├── fonts/
│   └── GeistPixel-Circle.woff2                 # Retro pixel monospace typography
├── vendor/
│   ├── ogl.umd.js                              # Minimal WebGL library
│   └── three.min.js                            # 3D Scene & WebGL rendering engine
├── index.html                                  # Semantic HTML5 single-page application
├── style.css                                   # Master design system & responsive styling
├── lanyard.css                                 # 3D viewport canvas styles
├── lanyard.js                                  # 3D physics lanyard simulation
├── scrambled-text.js                           # Typography scrambling engine
├── ScrambledText.css                           # Scrambled text component styles
├── dock.js                                     # macOS magnification dock logic
├── microslats.js                               # Canvas background grid
├── magic-rings.js                              # 3D gyroscopic rings
├── true-focus.js                               # Focus tracking component
├── variable-proximity.js                       # Proximity typography response
├── glass-icons.js                              # Frosted glass 3D tilt cards
├── curved-loop.js                              # Interactive marquee loop
├── border-glow.js                              # Mouse-following radial glow cards
├── preloader.js                                # Asset warm-up & initial stage fade-in
├── script.js                                   # Core controller (theme, games, terminal, sound)
├── _headers                                    # Cloudflare Pages security & caching policy
├── sitemap.xml                                 # Search engine sitemap
├── vercel.json                                 # Vercel deployment configuration
└── .gitignore                                  # Git exclusion list
```

---

## ✦ Local Development

No complex build step, node modules, or bundler required. You can run the project locally with any static web server:

### Option 1: Python 3
```bash
# Clone the repository
git clone https://github.com/your-username/portfolio.git
cd portfolio

# Start local server
python3 -m http.server 8080
```
Open `http://localhost:8080` in your browser.

### Option 2: Node.js (npx serve)
```bash
npx serve .
```

### Option 3: VS Code Live Server
Right-click on `index.html` and select **"Open with Live Server"**.

---

## ✦ Deployment

### 1. Cloudflare Pages (Recommended)
1. Push this repository to GitHub.
2. In the [Cloudflare Dashboard](https://dash.cloudflare.com/), go to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Select your repository.
4. Set **Build command**: *(Leave empty)*
5. Set **Build output directory**: `/`
6. Click **Save and Deploy**.
> The included `_headers` file automatically configures 1-year immutable caching on all static assets (`assets/*`, `fonts/*`, `vendor/*`, `*.js`, `*.css`, `*.webp`) and sets modern security headers (`nosniff`, `SAMEORIGIN`, `strict-origin-when-cross-origin`).

### 2. Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` from the project root, or import the GitHub repository directly via the [Vercel Dashboard](https://vercel.com).
> The included `vercel.json` ensures static zero-config routing.

### 3. GitHub Pages
1. Go to repository **Settings** > **Pages**.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Choose branch `main` and folder `/ (root)`.
4. Click **Save**.

---

## ✦ Performance & Optimizations

- **WebP Image Format**: High-resolution textures are compressed to `.webp`, cutting payload sizes by over 80% while preserving visual clarity.
- **Zero-Dependency Core**: All interactions and components run natively on browser APIs with zero runtime framework overhead.
- **Hardware-Accelerated CSS**: Animations use `transform: translate3d()` and `will-change` hints for smooth 60 FPS compositor passes.
- **Audio Synthesis**: Sound effects are generated procedurally through the Web Audio API, avoiding large audio file downloads.
- **Resource Hints & Immutable Cache**: Preconnected Google Fonts, preloaded critical styles, and 1-year HTTP cache directives for instant repeat visits.
- **Comment-Free Production Build**: Clean, production-ready code with no debugging comments or redundant assets.

---

## ✦ Author

**Muhammad Ibrahim Iyaz**
- Portfolio: [Live Demo](https://ibrahimiyaz.com) *(or your deployed URL)*
- GitHub: [@ibrahimiyaz](https://github.com/ibrahimiyaz)

---

## ✦ License

This project is licensed under the [MIT License](LICENSE) — feel free to use it for inspiration or reference.
