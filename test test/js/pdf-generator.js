/* =============================================
   PDF Generator — Cours de Mécanique A4
   Utilise jsPDF + html2canvas
   ============================================= */

(function () {
  'use strict';

  /* ── Dynamic Script Loader ── */
  function loadScript(urls) {
    return new Promise((resolve, reject) => {
      const tryNext = (i) => {
        if (i >= urls.length) {
          reject(new Error('Impossible de charger la bibliothèque depuis tous les CDN.'));
          return;
        }
        const script = document.createElement('script');
        script.src = urls[i];
        script.onload = resolve;
        script.onerror = () => {
          script.remove();
          tryNext(i + 1);
        };
        document.head.appendChild(script);
      };
      tryNext(0);
    });
  }

  async function ensureLibraries() {
    /* Load jsPDF if missing */
    if (!window.jspdf) {
      await loadScript([
        'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js',
        'https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js'
      ]);
    }
    /* Load html2canvas if missing */
    if (typeof html2canvas === 'undefined') {
      await loadScript([
        'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
        'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js'
      ]);
    }
  }

  /* ── Configuration A4 ── */
  const CFG = {
    pageW: 210,            // mm
    pageH: 297,
    margin: { top: 18, bottom: 18, left: 15, right: 15 },
    headerH: 8,
    footerH: 8,
    gap: 4,                // mm entre sections
    scale: 2,              // html2canvas resolution
    quality: 0.92          // JPEG quality
  };
  CFG.contentW = CFG.pageW - CFG.margin.left - CFG.margin.right;
  CFG.contentH = CFG.pageH - CFG.margin.top - CFG.margin.bottom - CFG.footerH;

  /* ── Couleurs ── */
  const C = {
    primary:    [26, 26, 46],
    secondary:  [74, 74, 106],
    accent:     [124, 58, 237],
    accentCyan: [0, 153, 204],
    muted:      [160, 160, 180],
    line:       [220, 220, 230],
    white:      [255, 255, 255],
    bg:         [248, 249, 252]
  };

  /* ═══════════════════════════════════════
     LOADING OVERLAY
     ═══════════════════════════════════════ */
  function createOverlay() {
    const el = document.createElement('div');
    el.id = 'pdf-overlay';
    el.innerHTML = `
      <div class="pdf-overlay-card">
        <div class="pdf-spinner-ring"><div></div><div></div><div></div><div></div></div>
        <div class="pdf-overlay-title">Génération du PDF</div>
        <div class="pdf-overlay-status" id="pdf-status">Préparation…</div>
        <div class="pdf-overlay-bar-wrap">
          <div class="pdf-overlay-bar" id="pdf-bar"></div>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    return el;
  }

  function setStatus(text, pct) {
    const s = document.getElementById('pdf-status');
    const b = document.getElementById('pdf-bar');
    if (s) s.textContent = text;
    if (b) b.style.width = pct + '%';
  }

  function removeOverlay() {
    const el = document.getElementById('pdf-overlay');
    if (el) { el.classList.add('fade-out'); setTimeout(() => el.remove(), 400); }
  }

  /* ═══════════════════════════════════════
     CAPTURE HELPER
     ═══════════════════════════════════════ */
  async function captureElement(element, bgColor) {
    /* Force reveal visible */
    element.querySelectorAll('.reveal').forEach(r => {
      r.style.opacity = '1';
      r.style.transform = 'none';
      r.style.transition = 'none';
    });

    const canvas = await html2canvas(element, {
      scale: CFG.scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: bgColor || '#ffffff',
      logging: false,
      windowWidth: 1100,
      onclone: (clonedDoc, clonedEl) => {
        /* Copy WebGL canvas pixel data into cloned canvases */
        const origCanvases = element.querySelectorAll('canvas');
        const clonedCanvases = clonedEl.querySelectorAll('canvas');
        origCanvases.forEach((oc, i) => {
          if (clonedCanvases[i]) {
            try {
              clonedCanvases[i].width = oc.width;
              clonedCanvases[i].height = oc.height;
              const ctx = clonedCanvases[i].getContext('2d');
              ctx.drawImage(oc, 0, 0);
            } catch (e) { /* cross-origin or empty */ }
          }
        });

        /* Make all content visible in clone */
        clonedEl.querySelectorAll('.reveal').forEach(r => {
          r.style.opacity = '1';
          r.style.transform = 'none';
          r.style.transition = 'none';
        });

        /* Hide interactive-only elements */
        clonedEl.querySelectorAll('.controls-panel, .scene-hint, .play-btn').forEach(h => {
          h.style.display = 'none';
        });

        /* White background on scene containers */
        clonedEl.querySelectorAll('.scene-container').forEach(sc => {
          sc.style.background = '#f0f0f5';
          sc.style.borderRadius = '8px';
        });
      }
    });

    return canvas;
  }

  /* ═══════════════════════════════════════
     COVER PAGE
     ═══════════════════════════════════════ */
  function drawCoverPage(doc) {
    /* Background gradient band */
    doc.setFillColor(...C.bg);
    doc.rect(0, 0, CFG.pageW, CFG.pageH, 'F');

    /* Accent bar at top */
    const gfx = doc.setDrawColor(...C.accent);
    doc.setFillColor(...C.accent);
    doc.rect(0, 0, CFG.pageW, 3, 'F');

    /* Accent stripe left */
    doc.setFillColor(...C.accentCyan);
    doc.rect(CFG.margin.left, 60, 3, 80, 'F');

    /* Title */
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(36);
    doc.setTextColor(...C.primary);
    doc.text('Mécanique', CFG.margin.left + 10, 80);
    doc.text('du Point Matériel', CFG.margin.left + 10, 96);

    /* Subtitle */
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(...C.secondary);
    doc.text('Cours complet avec visualisations 3D interactives,', CFG.margin.left + 10, 112);
    doc.text('formules et démonstrations.', CFG.margin.left + 10, 120);

    /* Meta */
    doc.setFontSize(11);
    doc.setTextColor(...C.muted);
    doc.text('SMP · SMC  //  Semestres S1 – S3', CFG.margin.left + 10, 138);

    /* Stats boxes */
    const statsY = 158;
    const statData = [
      { val: '7', label: 'Chapitres' },
      { val: '4', label: 'Scènes 3D' },
      { val: '50+', label: 'Formules' }
    ];
    statData.forEach((s, i) => {
      const sx = CFG.margin.left + 10 + i * 50;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(sx, statsY, 42, 28, 3, 3, 'F');
      doc.setDrawColor(...C.line);
      doc.roundedRect(sx, statsY, 42, 28, 3, 3, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(...C.accent);
      doc.text(s.val, sx + 21, statsY + 14, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...C.muted);
      doc.text(s.label, sx + 21, statsY + 22, { align: 'center' });
    });

    /* Separator line */
    doc.setDrawColor(...C.line);
    doc.line(CFG.margin.left, 200, CFG.pageW - CFG.margin.right, 200);

    /* Credits */
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text('Contenu original : Hicham Rmouhi', CFG.margin.left + 10, 212);
    doc.text('Version interactive moderne', CFG.margin.left + 10, 220);

    /* Date */
    const d = new Date();
    const dateStr = d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text('Généré le ' + dateStr, CFG.margin.left + 10, 236);

    /* Footer accent bar */
    doc.setFillColor(...C.accent);
    doc.rect(0, CFG.pageH - 3, CFG.pageW, 3, 'F');
  }

  /* ═══════════════════════════════════════
     TABLE OF CONTENTS
     ═══════════════════════════════════════ */
  function drawTOC(doc, sectionMeta) {
    doc.setFillColor(...C.bg);
    doc.rect(0, 0, CFG.pageW, CFG.pageH, 'F');

    /* Header */
    doc.setFillColor(...C.accent);
    doc.rect(0, 0, CFG.pageW, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(...C.primary);
    doc.text('Table des matières', CFG.margin.left, 35);

    doc.setDrawColor(...C.accent);
    doc.setLineWidth(0.5);
    doc.line(CFG.margin.left, 40, CFG.margin.left + 60, 40);

    let y = 58;
    sectionMeta.forEach((s, i) => {
      /* Number circle */
      doc.setFillColor(...C.accent);
      doc.circle(CFG.margin.left + 5, y - 1.5, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...C.white);
      doc.text(String(i + 1).padStart(2, '0'), CFG.margin.left + 5, y, { align: 'center' });

      /* Title */
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(...C.primary);
      doc.text(s.title, CFG.margin.left + 16, y);

      /* Tag */
      if (s.tag) {
        doc.setFontSize(8);
        doc.setTextColor(...C.accentCyan);
        doc.text(s.tag, CFG.margin.left + 16, y + 6);
      }

      /* Dots + page number */
      doc.setFontSize(10);
      doc.setTextColor(...C.muted);
      const pageStr = String(s.page);
      doc.text(pageStr, CFG.pageW - CFG.margin.right - 5, y, { align: 'right' });

      /* Dotted line */
      const titleW = doc.getTextWidth(s.title) + CFG.margin.left + 16;
      const dotsEnd = CFG.pageW - CFG.margin.right - 10;
      doc.setDrawColor(...C.line);
      doc.setLineDashPattern([1, 2], 0);
      doc.line(titleW + 4, y - 1, dotsEnd, y - 1);
      doc.setLineDashPattern([], 0);

      y += 18;
    });

    /* Footer accent bar */
    doc.setFillColor(...C.accent);
    doc.rect(0, CFG.pageH - 2, CFG.pageW, 2, 'F');
  }

  /* ═══════════════════════════════════════
     PAGE HEADER / FOOTER
     ═══════════════════════════════════════ */
  function drawPageHeader(doc, sectionTitle) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text('Mécanique du Point Matériel', CFG.margin.left, CFG.margin.top - 6);
    if (sectionTitle) {
      doc.text(sectionTitle, CFG.pageW - CFG.margin.right, CFG.margin.top - 6, { align: 'right' });
    }
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.3);
    doc.line(CFG.margin.left, CFG.margin.top - 3, CFG.pageW - CFG.margin.right, CFG.margin.top - 3);
  }

  function drawPageFooter(doc, pageNum, totalPages) {
    const fy = CFG.pageH - CFG.margin.bottom + 2;
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.3);
    doc.line(CFG.margin.left, fy, CFG.pageW - CFG.margin.right, fy);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text('SMP · SMC // S1 – S3', CFG.margin.left, fy + 5);
    doc.text(`${pageNum} / ${totalPages}`, CFG.pageW - CFG.margin.right, fy + 5, { align: 'right' });
  }

  /* ═══════════════════════════════════════
     MAIN PDF GENERATION
     ═══════════════════════════════════════ */
  async function generateCoursePDF() {
    const overlay = createOverlay();
    setStatus('Chargement des bibliothèques…', 2);

    /* Small delay so overlay renders */
    await new Promise(r => setTimeout(r, 100));

    try {
      /* Ensure jsPDF and html2canvas are loaded */
      await ensureLibraries();

      if (!window.jspdf || !window.jspdf.jsPDF) {
        throw new Error('jsPDF n\'a pas pu être chargé. Vérifiez votre connexion internet.');
      }
      if (typeof html2canvas === 'undefined') {
        throw new Error('html2canvas n\'a pas pu être chargé. Vérifiez votre connexion internet.');
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });

      /* ── Save & prepare theme ── */
      const origTheme = document.documentElement.getAttribute('data-theme');
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.setAttribute('data-theme', 'light');
      document.querySelectorAll('.reveal').forEach(el => {
        el.classList.add('visible');
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      await new Promise(r => setTimeout(r, 300));

      /* ── 1. Cover page ── */
      setStatus('Génération de la page de couverture…', 5);
      drawCoverPage(doc);

      /* ── Collect sections ── */
      const sectionElements = document.querySelectorAll('.content-section');
      const sectionMeta = [];
      sectionElements.forEach((sec, i) => {
        const header = sec.querySelector('.section-header h2');
        const tag = sec.querySelector('.section-tag');
        sectionMeta.push({
          title: header ? header.textContent.trim() : `Section ${i + 1}`,
          tag: tag ? tag.textContent.trim() : '',
          page: 0 // will be filled in
        });
      });

      /* ── 2. TOC placeholder (page 2) ── */
      doc.addPage();
      // We'll come back to draw the TOC once we know page numbers

      /* ── 3. Content pages ── */
      let currentPageNum = 3; // Cover=1, TOC=2, content starts at 3
      const totalSections = sectionElements.length;

      for (let i = 0; i < totalSections; i++) {
        const section = sectionElements[i];
        const meta = sectionMeta[i];
        const pct = Math.round(10 + (i / totalSections) * 80);
        setStatus(`Capture: ${meta.title} (${i + 1}/${totalSections})`, pct);

        meta.page = currentPageNum;

        /* Start each section on a new page */
        doc.addPage();
        doc.setFillColor(...C.bg);
        doc.rect(0, 0, CFG.pageW, CFG.pageH, 'F');

        /* Capture the section */
        let canvas;
        try {
          canvas = await captureElement(section, '#f5f6fa');
        } catch (e) {
          console.warn('Failed to capture section:', meta.title, e);
          currentPageNum++;
          continue;
        }

        const imgData = canvas.toDataURL('image/jpeg', CFG.quality);
        const imgW = CFG.contentW;
        const imgH = (canvas.height * CFG.contentW) / canvas.width;

        const startY = CFG.margin.top;

        if (imgH <= CFG.contentH) {
          /* Fits on one page */
          doc.addImage(imgData, 'JPEG', CFG.margin.left, startY, imgW, imgH);
          drawPageHeader(doc, meta.title);
          currentPageNum++;
        } else {
          /* Multi-page: crop the image into page-sized pieces */
          const pagesNeeded = Math.ceil(imgH / CFG.contentH);
          const sliceH = (CFG.contentH / imgH) * canvas.height;

          for (let p = 0; p < pagesNeeded; p++) {
            if (p > 0) {
              doc.addPage();
              doc.setFillColor(...C.bg);
              doc.rect(0, 0, CFG.pageW, CFG.pageH, 'F');
              currentPageNum++;
            }

            const sy = Math.round(p * sliceH);
            const sh = Math.min(Math.round(sliceH), canvas.height - sy);
            if (sh <= 0) break;

            /* Create cropped canvas */
            const crop = document.createElement('canvas');
            crop.width = canvas.width;
            crop.height = sh;
            const ctx = crop.getContext('2d');
            ctx.drawImage(canvas, 0, sy, canvas.width, sh, 0, 0, canvas.width, sh);

            const cropData = crop.toDataURL('image/jpeg', CFG.quality);
            const cropH = (sh * CFG.contentW) / canvas.width;
            doc.addImage(cropData, 'JPEG', CFG.margin.left, startY, imgW, cropH);
            drawPageHeader(doc, meta.title);
          }

          if (imgH <= CFG.contentH) currentPageNum++;
        }
      }

      /* ── 4. Add page numbers to all content pages ── */
      const totalPages = doc.getNumberOfPages();
      setStatus('Ajout des en-têtes et numéros de page…', 92);

      for (let p = 3; p <= totalPages; p++) {
        doc.setPage(p);
        drawPageFooter(doc, p - 2, totalPages - 2);
      }

      /* ── 5. Now draw the TOC with correct page numbers ── */
      setStatus('Génération de la table des matières…', 96);
      /* Adjust page numbers relative to content start */
      sectionMeta.forEach(m => { m.page = m.page - 2; });
      doc.setPage(2);
      drawTOC(doc, sectionMeta);

      /* ── 6. Download ── */
      setStatus('Téléchargement…', 100);
      await new Promise(r => setTimeout(r, 300));
      doc.save('Mecanique_du_Point_Materiel.pdf');

      /* ── Restore theme ── */
      if (origTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        document.body.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.removeAttribute('data-theme');
        document.body.removeAttribute('data-theme');
      }

    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Erreur lors de la génération du PDF.\n' + err.message);
    } finally {
      removeOverlay();
    }
  }

  /* ── Expose globally ── */
  window.generateCoursePDF = generateCoursePDF;
})();
