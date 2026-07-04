/* =============================================
   App.js — Navigation, Scroll, Scenes Init
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {
  // ── Lucide Icons Init ──
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // ── KaTeX Auto-Render ──
  if (typeof renderMathInElement !== 'undefined') {
    renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ],
      throwOnError: false
    });
  }

  // ── Progress Bar ──
  const progressBar = document.getElementById('progress-bar');
  function updateProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (progressBar) progressBar.style.width = progress + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  // ── Sidebar Navigation ──
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menu-toggle');
  const overlay = document.getElementById('sidebar-overlay');
  const navLinks = document.querySelectorAll('.nav-link');

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }

  // Smooth scroll navigation
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Close mobile sidebar
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      }
    });
  });

  // Active link tracking
  const sections = document.querySelectorAll('.content-section, .hero');
  const observerOptions = { rootMargin: '-20% 0px -60% 0px' };

  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === '#' + id);
        });
      }
    });
  }, observerOptions);

  sections.forEach(s => navObserver.observe(s));

  // ── Scroll Reveal Animations ──
  const reveals = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  reveals.forEach(el => revealObserver.observe(el));

  // ── 3D Scene Initialization ──
  const scenes = {};

  // Lazy-init scenes when visible
  const sceneContainers = document.querySelectorAll('.scene-container');
  const sceneObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const id = entry.target.id;
      if (entry.isIntersecting) {
        // Initialize if not yet done
        if (!scenes[id] && typeof window[`create${capitalize(id)}Scene`] !== 'undefined') {
          // This won't work because function names don't match container IDs
          // We use a map instead
        }
        if (scenes[id]) scenes[id].setVisible(true);
      } else {
        if (scenes[id]) scenes[id].setVisible(false);
      }
    });
  }, { rootMargin: '100px 0px 100px 0px' });

  // Initialize scenes
  function initScenes() {
    // Cartesian scene
    if (document.getElementById('scene-cartesian')) {
      scenes['scene-cartesian'] = createCartesianScene('scene-cartesian');
      if (scenes['scene-cartesian']) scenes['scene-cartesian'].setVisible(false);
    }

    // Cylindrical scene
    if (document.getElementById('scene-cylindrical')) {
      scenes['scene-cylindrical'] = createCylindricalScene('scene-cylindrical');
      if (scenes['scene-cylindrical']) scenes['scene-cylindrical'].setVisible(false);
    }

    // Spherical scene
    if (document.getElementById('scene-spherical')) {
      scenes['scene-spherical'] = createSphericalScene('scene-spherical');
      if (scenes['scene-spherical']) scenes['scene-spherical'].setVisible(false);
    }

    // Frenet scene
    if (document.getElementById('scene-frenet')) {
      scenes['scene-frenet'] = createFrenetScene('scene-frenet');
      if (scenes['scene-frenet']) scenes['scene-frenet'].setVisible(false);
    }

    // Observe containers for visibility
    sceneContainers.forEach(c => sceneObserver.observe(c));
  }

  // Wait a bit for fonts/layout to settle
  setTimeout(initScenes, 300);

  // ── Slider Bindings ──
  function bindSlider(sliderId, valueId, sceneId, paramName, transform) {
    const slider = document.getElementById(sliderId);
    const valueEl = document.getElementById(valueId);
    if (!slider) return;

    slider.addEventListener('input', () => {
      const raw = parseFloat(slider.value);
      const val = transform ? transform(raw) : raw;
      if (valueEl) {
        if (paramName === 'phi' || paramName === 'theta') {
          valueEl.textContent = (raw * 180 / Math.PI).toFixed(0) + '°';
        } else if (paramName === 't') {
          const scene = scenes[sceneId];
          const pct = scene ? (raw / scene.totalAngle * 100).toFixed(0) : '0';
          valueEl.textContent = pct + '%';
        } else {
          valueEl.textContent = raw.toFixed(2);
        }
      }
      if (scenes[sceneId]) {
        const params = {};
        params[paramName] = val;
        scenes[sceneId].updateParams(params);
      }
    });
  }

  // Cartesian sliders
  bindSlider('cart-x-slider', 'cart-x-value', 'scene-cartesian', 'x');
  bindSlider('cart-y-slider', 'cart-y-value', 'scene-cartesian', 'y');
  bindSlider('cart-z-slider', 'cart-z-value', 'scene-cartesian', 'z');

  // Cylindrical sliders
  bindSlider('cyl-rho-slider', 'cyl-rho-value', 'scene-cylindrical', 'rho');
  bindSlider('cyl-phi-slider', 'cyl-phi-value', 'scene-cylindrical', 'phi');
  bindSlider('cyl-z-slider', 'cyl-z-value', 'scene-cylindrical', 'z');

  // Spherical sliders
  bindSlider('sph-r-slider', 'sph-r-value', 'scene-spherical', 'r');
  bindSlider('sph-theta-slider', 'sph-theta-value', 'scene-spherical', 'theta');
  bindSlider('sph-phi-slider', 'sph-phi-value', 'scene-spherical', 'phi');

  // Frenet slider
  bindSlider('frenet-t-slider', 'frenet-t-value', 'scene-frenet', 't');

  // Frenet play/pause
  const playBtn = document.getElementById('frenet-play-btn');
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (scenes['scene-frenet']) {
        const playing = scenes['scene-frenet'].togglePlay();
        playBtn.innerHTML = playing
          ? '<i data-lucide="pause"></i> Pause'
          : '<i data-lucide="play"></i> Animer';
        if (typeof lucide !== 'undefined') lucide.createIcons({ nameAttr: 'data-lucide' });
      }
    });
  }

  // ── Visibility tracking for scenes ──
  const sceneVisObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const id = entry.target.id;
      if (scenes[id]) {
        scenes[id].setVisible(entry.isIntersecting);
      }
    });
  }, { rootMargin: '200px 0px 200px 0px' });

  sceneContainers.forEach(c => sceneVisObserver.observe(c));

  // ── Theme Toggle (Dark / Light) ──
  const themeToggle = document.getElementById('theme-toggle');
  const themeLabel = document.getElementById('theme-label');

  // Check for saved preference or default to dark
  const savedTheme = localStorage.getItem('meca-theme') || 'dark';
  applyTheme(savedTheme);

  function applyTheme(theme) {
    const sunIcons = document.querySelectorAll('.icon-sun');
    const moonIcons = document.querySelectorAll('.icon-moon');

    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.setAttribute('data-theme', 'light');
      // Show moon, hide sun
      sunIcons.forEach(el => el.style.display = 'none');
      moonIcons.forEach(el => el.style.display = 'inline');
      if (themeLabel) themeLabel.textContent = 'Dark';
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.body.removeAttribute('data-theme');
      // Show sun, hide moon
      sunIcons.forEach(el => el.style.display = 'inline');
      moonIcons.forEach(el => el.style.display = 'none');
      if (themeLabel) themeLabel.textContent = 'Light';
    }
    localStorage.setItem('meca-theme', theme);
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      applyTheme(currentTheme === 'light' ? 'dark' : 'light');
    });
  }

  // ── PDF Download (jsPDF + html2canvas) ──
  const pdfBtn = document.getElementById('pdf-download');

  if (pdfBtn) {
    pdfBtn.addEventListener('click', () => {
      if (typeof window.generateCoursePDF === 'function') {
        window.generateCoursePDF();
      } else {
        alert('Le générateur PDF n\'est pas encore chargé. Veuillez patienter…');
      }
    });
  }

  // ── Helper ──
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
});
