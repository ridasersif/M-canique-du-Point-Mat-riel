/* =============================================
   Scène 3D : Coordonnées Sphériques
   ============================================= */

function createSphericalScene(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(4, 3, 4);

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
  controls.maxDistance = 10;

  scene.add(new THREE.GridHelper(6, 12, 0x1a1a3a, 0x0d0d20));

  // Axes
  const axLen = 2.5;
  function addAxis(dir, color, label) {
    const d = new THREE.Vector3(...dir).normalize();
    scene.add(new THREE.ArrowHelper(d, new THREE.Vector3(0, 0, 0), axLen, color, 0.18, 0.09));
    const s = makeTextSprite(label, { color, fontSize: 52 });
    s.position.set(dir[0] * (axLen + 0.3), dir[1] * (axLen + 0.3), dir[2] * (axLen + 0.3));
    scene.add(s);
  }
  addAxis([1, 0, 0], 0xf43f5e, 'x');
  addAxis([0, 1, 0], 0x3b82f6, 'z');
  addAxis([0, 0, 1], 0x10b981, 'y');

  // Origin
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })));
  const oLabel = makeTextSprite('O', { color: 0xffffff, fontSize: 44 });
  oLabel.position.set(-0.2, -0.2, 0);
  scene.add(oLabel);

  // Sphere wireframe
  let sphereMesh = null;
  const sphereMat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, wireframe: true, transparent: true, opacity: 0.08 });

  function updateSphere(r) {
    if (sphereMesh) scene.remove(sphereMesh);
    if (r < 0.01) return;
    sphereMesh = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), sphereMat);
    scene.add(sphereMesh);
  }

  // Parameters
  let rVal = 2.0, theta = Math.PI / 4, phi = Math.PI / 3;

  // Point M
  const pointM = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x00d4ff })
  );
  pointM.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.12 })
  ));
  scene.add(pointM);

  const mLabel = makeTextSprite('M', { color: 0x00d4ff, fontSize: 48 });
  scene.add(mLabel);

  // Unit vector arrows
  let erArrow = null, eThetaArrow = null, ePhiArrow = null;
  let omArrow = null;

  // Projection lines
  const projMat = new THREE.LineBasicMaterial({ color: 0x6a6a8e, transparent: true, opacity: 0.35 });
  function makeProjLine() {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const l = new THREE.Line(geo, projMat.clone());
    scene.add(l);
    return l;
  }
  const projToXY = makeProjLine();
  const projToO = makeProjLine();
  const projHoriz = makeProjLine();

  // Angle arcs
  let thetaArc = null, phiArc = null;

  // Vector labels
  const erLabel = makeTextSprite('er', { color: 0xf59e0b, fontSize: 40 });
  scene.add(erLabel);
  const eThetaLabel = makeTextSprite('eθ', { color: 0xf43f5e, fontSize: 40 });
  scene.add(eThetaLabel);
  const ePhiLabel2 = makeTextSprite('eφ', { color: 0x10b981, fontSize: 40 });
  scene.add(ePhiLabel2);

  const coordDisplay = container.parentElement.querySelector('.coord-display');

  function updateLine(line, from, to) {
    const p = line.geometry.attributes.position.array;
    p[0] = from[0]; p[1] = from[1]; p[2] = from[2];
    p[3] = to[0];   p[4] = to[1];   p[5] = to[2];
    line.geometry.attributes.position.needsUpdate = true;
  }

  function updatePoint() {
    // Math: x=rsinθcosφ, y=rsinθsinφ, z=rcosθ
    const mx = rVal * Math.sin(theta) * Math.cos(phi);
    const my = rVal * Math.sin(theta) * Math.sin(phi);
    const mz = rVal * Math.cos(theta);

    // THREE: x→mx, y→mz, z→my
    const tx = mx, ty = mz, tz = my;

    pointM.position.set(tx, ty, tz);
    mLabel.position.set(tx + 0.2, ty + 0.2, tz);

    // OM arrow
    if (omArrow) scene.remove(omArrow);
    const omDir = new THREE.Vector3(tx, ty, tz);
    const omLen = omDir.length();
    if (omLen > 0.01) {
      omArrow = new THREE.ArrowHelper(omDir.clone().normalize(), new THREE.Vector3(0, 0, 0), omLen, 0x00d4ff, 0.12, 0.06);
      scene.add(omArrow);
    }

    // er (radial)
    if (erArrow) scene.remove(erArrow);
    const erDir = new THREE.Vector3(tx, ty, tz).normalize();
    if (erDir.length() > 0.01) {
      erArrow = new THREE.ArrowHelper(erDir, pointM.position.clone(), 0.8, 0xf59e0b, 0.12, 0.06);
      scene.add(erArrow);
    }

    // eθ = cosθcosφ x̂ + cosθsinφ ŷ - sinθ ẑ
    const etx = Math.cos(theta) * Math.cos(phi);
    const ety = Math.cos(theta) * Math.sin(phi);
    const etz = -Math.sin(theta);
    if (eThetaArrow) scene.remove(eThetaArrow);
    const eThetaDir = new THREE.Vector3(etx, etz, ety).normalize();
    eThetaArrow = new THREE.ArrowHelper(eThetaDir, pointM.position.clone(), 0.8, 0xf43f5e, 0.12, 0.06);
    scene.add(eThetaArrow);

    // eφ = -sinφ x̂ + cosφ ŷ
    if (ePhiArrow) scene.remove(ePhiArrow);
    const ePhiDir = new THREE.Vector3(-Math.sin(phi), 0, Math.cos(phi)).normalize();
    ePhiArrow = new THREE.ArrowHelper(ePhiDir, pointM.position.clone(), 0.8, 0x10b981, 0.12, 0.06);
    scene.add(ePhiArrow);

    // Labels
    erLabel.position.copy(pointM.position).add(erDir.clone().multiplyScalar(0.95)).add(new THREE.Vector3(0, 0.12, 0));
    eThetaLabel.position.copy(pointM.position).add(eThetaDir.clone().multiplyScalar(0.95)).add(new THREE.Vector3(0, 0.12, 0));
    ePhiLabel2.position.copy(pointM.position).add(ePhiDir.clone().multiplyScalar(0.95)).add(new THREE.Vector3(0, 0.12, 0));

    // Projections
    const rhoXY = rVal * Math.sin(theta);
    const projPx = rhoXY * Math.cos(phi);
    const projPy = rhoXY * Math.sin(phi);
    updateLine(projToXY, [tx, ty, tz], [projPx, 0, projPy]);
    updateLine(projToO, [0, 0, 0], [projPx, 0, projPy]);
    updateLine(projHoriz, [0, ty, 0], [tx, ty, tz]);

    // θ arc (z-axis to OM)
    if (thetaArc) scene.remove(thetaArc);
    const tPts = [];
    const tR = 0.6;
    for (let i = 0; i <= 24; i++) {
      const a = (theta * i) / 24;
      tPts.push(new THREE.Vector3(
        tR * Math.sin(a) * Math.cos(phi),
        tR * Math.cos(a),
        tR * Math.sin(a) * Math.sin(phi)
      ));
    }
    thetaArc = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(tPts),
      new THREE.LineBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.6 })
    );
    scene.add(thetaArc);

    // φ arc (on xy plane)
    if (phiArc) scene.remove(phiArc);
    const pPts = [];
    const pR = 0.5;
    for (let i = 0; i <= 24; i++) {
      const a = (phi * i) / 24;
      pPts.push(new THREE.Vector3(pR * Math.cos(a), 0, pR * Math.sin(a)));
    }
    phiArc = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pPts),
      new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.6 })
    );
    scene.add(phiArc);

    updateSphere(rVal);

    if (coordDisplay) {
      const tDeg = (theta * 180 / Math.PI).toFixed(1);
      const pDeg = (phi * 180 / Math.PI).toFixed(1);
      coordDisplay.innerHTML =
        `r = ${rVal.toFixed(2)}<br>θ = ${tDeg}°<br>φ = ${pDeg}°<br><br>x = ${mx.toFixed(2)}<br>y = ${my.toFixed(2)}<br>z = ${mz.toFixed(2)}`;
    }
  }

  updatePoint();
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  let isVisible = false;

  function animate() {
    requestAnimationFrame(animate);
    if (!isVisible) return;
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  return {
    setVisible(v) { isVisible = v; },
    updateParams(params) {
      if (params.r !== undefined) rVal = params.r;
      if (params.theta !== undefined) theta = params.theta;
      if (params.phi !== undefined) phi = params.phi;
      updatePoint();
    },
    dispose() {
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      controls.dispose();
    }
  };
}
