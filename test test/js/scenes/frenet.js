/* =============================================
   Scène 3D : Trièdre de Frenet
   Point mobile sur une hélice avec (τ, n, b)
   ============================================= */

function createFrenetScene(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(5, 3.5, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 2;
  controls.maxDistance = 12;

  scene.add(new THREE.GridHelper(8, 16, 0x1a1a3a, 0x0d0d20));
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  // ── Helix Curve ──
  const helixRadius = 1.8;
  const helixPitch = 0.5; // height per revolution
  const helixTurns = 3;
  const totalAngle = helixTurns * 2 * Math.PI;
  const numSamples = 500;

  // Generate helix points
  function helixPoint(t) {
    // t goes from 0 to totalAngle
    const x = helixRadius * Math.cos(t);
    const z = helixRadius * Math.sin(t);
    const y = helixPitch * t / (2 * Math.PI);
    return new THREE.Vector3(x, y, z);
  }

  // Tangent vector (normalized derivative)
  function helixTangent(t) {
    const dx = -helixRadius * Math.sin(t);
    const dz = helixRadius * Math.cos(t);
    const dy = helixPitch / (2 * Math.PI);
    return new THREE.Vector3(dx, dy, dz).normalize();
  }

  // Normal vector (toward center)
  function helixNormal(t) {
    const x = -Math.cos(t);
    const z = -Math.sin(t);
    return new THREE.Vector3(x, 0, z).normalize();
  }

  // Binormal = τ × n
  function helixBinormal(t) {
    const tau = helixTangent(t);
    const n = helixNormal(t);
    return new THREE.Vector3().crossVectors(tau, n).normalize();
  }

  // Draw the helix
  const curvePoints = [];
  for (let i = 0; i <= numSamples; i++) {
    const t = (i / numSamples) * totalAngle;
    curvePoints.push(helixPoint(t));
  }

  // Gradient colored curve using vertex colors
  const curveGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
  const colors = new Float32Array(curvePoints.length * 3);
  for (let i = 0; i < curvePoints.length; i++) {
    const ratio = i / curvePoints.length;
    // Cyan to violet gradient
    const r = ratio * 0.545;          // 0 → 139/255
    const g = (1 - ratio) * 0.831;    // 212/255 → 0
    const b = 1.0 - ratio * 0.04;     // 1 → 0.96
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  curveGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const curveMat = new THREE.LineBasicMaterial({ vertexColors: true, linewidth: 2 });
  const curveLine = new THREE.Line(curveGeo, curveMat);
  scene.add(curveLine);

  // "Trail" - thicker tube along the curve
  const curve = new THREE.CatmullRomCurve3(curvePoints);
  const tubeGeo = new THREE.TubeGeometry(curve, numSamples, 0.025, 8, false);
  const tubeMat = new THREE.MeshBasicMaterial({
    color: 0x8b5cf6, transparent: true, opacity: 0.2
  });
  scene.add(new THREE.Mesh(tubeGeo, tubeMat));

  // ── Moving Point ──
  let tParam = 0.3 * totalAngle;
  let isPlaying = false;

  const pointM = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x00d4ff })
  );
  pointM.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.15 })
  ));
  scene.add(pointM);

  const mLabel = makeTextSprite('M', { color: 0x00d4ff, fontSize: 48 });
  scene.add(mLabel);

  // ── Frenet frame arrows ──
  let tauArrow = null, nArrow = null, bArrow = null;

  // Labels
  const tauLabel = makeTextSprite('τ', { color: 0xf59e0b, fontSize: 44 });
  scene.add(tauLabel);
  const nLabel = makeTextSprite('n', { color: 0xf43f5e, fontSize: 44 });
  scene.add(nLabel);
  const bLabel = makeTextSprite('b', { color: 0x10b981, fontSize: 44 });
  scene.add(bLabel);

  // ── Osculating circle ──
  let oscCircle = null;

  const coordDisplay = container.parentElement.querySelector('.coord-display');

  function updateFrenet() {
    const pos = helixPoint(tParam);
    const tau = helixTangent(tParam);
    const n = helixNormal(tParam);
    const b = helixBinormal(tParam);

    pointM.position.copy(pos);
    mLabel.position.copy(pos).add(new THREE.Vector3(0.2, 0.25, 0));

    // τ arrow (tangent) — amber
    if (tauArrow) scene.remove(tauArrow);
    tauArrow = new THREE.ArrowHelper(tau, pos, 1.2, 0xf59e0b, 0.15, 0.08);
    scene.add(tauArrow);

    // n arrow (normal) — rose
    if (nArrow) scene.remove(nArrow);
    nArrow = new THREE.ArrowHelper(n, pos, 0.9, 0xf43f5e, 0.15, 0.08);
    scene.add(nArrow);

    // b arrow (binormal) — emerald
    if (bArrow) scene.remove(bArrow);
    bArrow = new THREE.ArrowHelper(b, pos, 0.9, 0x10b981, 0.15, 0.08);
    scene.add(bArrow);

    // Labels
    tauLabel.position.copy(pos).add(tau.clone().multiplyScalar(1.35));
    nLabel.position.copy(pos).add(n.clone().multiplyScalar(1.05));
    bLabel.position.copy(pos).add(b.clone().multiplyScalar(1.05));

    // Osculating circle
    if (oscCircle) scene.remove(oscCircle);
    const Rc = helixRadius + (helixPitch / (2 * Math.PI)) ** 2 / helixRadius;
    const center = pos.clone().add(n.clone().multiplyScalar(helixRadius)); // approximate
    const circPts = [];
    for (let i = 0; i <= 48; i++) {
      const angle = (i / 48) * 2 * Math.PI;
      const pt = new THREE.Vector3();
      pt.copy(pos)
        .add(n.clone().multiplyScalar(helixRadius * (1 - Math.cos(angle))))
        .add(tau.clone().multiplyScalar(helixRadius * Math.sin(angle)));
      circPts.push(pt);
    }
    const circGeo = new THREE.BufferGeometry().setFromPoints(circPts);
    oscCircle = new THREE.Line(circGeo, new THREE.LineBasicMaterial({
      color: 0x6a6a8e, transparent: true, opacity: 0.25
    }));
    scene.add(oscCircle);

    // Coord display
    if (coordDisplay) {
      const progress = (tParam / totalAngle * 100).toFixed(1);
      const speed = Math.sqrt(helixRadius ** 2 + (helixPitch / (2 * Math.PI)) ** 2).toFixed(3);
      coordDisplay.innerHTML =
        `s/L = ${progress}%<br>|V| = ${speed}<br>Rc ≈ ${Rc.toFixed(3)}`;
    }
  }

  updateFrenet();

  let isVisible = false;

  function animate() {
    requestAnimationFrame(animate);
    if (!isVisible) return;
    controls.update();

    if (isPlaying) {
      tParam += 0.015;
      if (tParam > totalAngle) tParam = 0;
      updateFrenet();

      // Update slider if exists
      const slider = document.getElementById('frenet-t-slider');
      if (slider) slider.value = tParam;
      const valEl = document.getElementById('frenet-t-value');
      if (valEl) valEl.textContent = (tParam / totalAngle * 100).toFixed(0) + '%';
    }

    renderer.render(scene, camera);
  }
  animate();

  function onResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
  window.addEventListener('resize', onResize);

  return {
    setVisible(v) { isVisible = v; },
    updateParams(params) {
      if (params.t !== undefined) {
        tParam = params.t;
        updateFrenet();
      }
    },
    togglePlay() {
      isPlaying = !isPlaying;
      return isPlaying;
    },
    get totalAngle() { return totalAngle; },
    dispose() {
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      controls.dispose();
    }
  };
}
