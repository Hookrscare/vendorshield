# Autonomous Engineering & Bespoke UI Directive

## 1. Zero-Tolerance Policy: "AI Generic Template" Ban
You must reject standard AI template heuristics:
- **Banned Patterns:** Default Tailwind starter setups, repetitive purple/blue neon gradient buttons, generic uninspired card grids, unstyled floating glassmorphism cards, and flat stock layouts.
- **Visual Identity:** Every project requires an explicit art direction. Pair custom/variable typography (e.g., grotesque/editorial serif display + clean monospace/sans body) with structured, intentional color palettes. Treat the viewport as a tactile spatial canvas, not a static text document.

---

## 2. Technical & Architectural Baseline
Implement interfaces strictly adhering to high-end digital design standards (Awwwards / FWA / Apple Design tier):

* **3D, Canvas & Graphics (WebGPU / Three.js / R3F):**
  - Use WebGPU compute pipelines or Three.js/R3F with custom GLSL/WGSL shaders for volumetric lighting, particle dynamics, and fluid surface deformation.
  - All 3D assets (`.glb`/`.gltf`) must use Draco or Meshopt compression (payload < 2.5MB total initial load).
  - Always cull render loops and detach canvas event listeners when elements leave the viewport.

* **Motion & Micro-Interactions:**
  - Standardize motion on the View Transitions API and CSS Scroll-Driven Animations where appropriate.
  - Inertia and physics: Implement custom cubic beziers (`cubic-bezier(0.16, 1, 0.3, 1)`) or spring dampers (GSAP / Framer Motion). Zero linear transitions.
  - Interactive tactile states: Cursor-aware magnetic physics, reactive surface lighting, and smooth momentum scrolling (e.g., Lenis).

* **Performance & Core Web Vitals:**
  - Enforce 60 FPS under all active 3D rendering and scroll-driven interactions.
  - Target: LCP ≤ 1.5s, INP ≤ 100ms, CLS = 0.

* **Accessibility & Foundation:**
  - Semantic HTML/DOM structure underneath 3D/Canvas overlays.
  - Full WCAG 2.2 AA accessibility, complete keyboard focus traps/navigation, and `@media (prefers-reduced-motion)` fallbacks.

---

## 3. Mandatory Self-Confrontation Loop
Before returning any completed code, you MUST execute an internal verification audit against these criteria:

1. **Aesthetic Audit:** Does any component look like a generic starter template or default component kit? If yes, refactor with custom typography hierarchy, bespoke borders, or spatial interaction.
2. **Performance Audit:** Are heavy canvas renders or scroll listeners offloaded to compositor threads or throttled? Verify that frame rendering avoids main-thread jank.
3. **Usability Check:** Can a user identify the primary action and navigate intuitively within 3 seconds, without visual clutter obscuring function?
4. **Refinement:** Polish easing curves, depth layers, hover feedback, and responsive breakpoints before finalizing the output.
