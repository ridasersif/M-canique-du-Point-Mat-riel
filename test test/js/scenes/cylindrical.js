/* =============================================
   Scène 3D : Coordonnées Cylindriques
   ============================================= */

function createCylindricalScene(containerId) {
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

  // Cylinder wireframe
  let cylMesh = null;
  const cylMat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, wireframe: true, transparent: true, opacity: 0.12 });

  function updateCylinder(radius, height) {
    if (cylMesh) scene.remove(cylMesh);
    if (radius < 0.01 || height < 0.01) return;
    const geo = new THREE.CylinderGeometry(radius, radius, height, 32, 1, true);
    cylMesh = new THREE.Mesh(geo, cylMat);
    cylMesh.position.y = height / 2;
    scene.add(cylMesh);
  }

  // Parameters
  let rho = 1.5, phi = Math.PI / 4, zVal = 1.2;

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

  // m projection
  const mProj = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0x6a6a8e })
  );
  scene.add(mProj);
  const mProjLabel = makeTextSprite('m', { color: 0x6a6a8e, fontSize: 38 });
  scene.add(mProjLabel);

  // Unit vector arrows
  let eRhoArrow = null, ePhiArrow = null, eZArrow = null;

  // Angle arc
  let phiArc = null;

  // Projection lines (simple)
  const projMat = new THREE.LineBasicMaterial({ color: 0x6a6a8e, transparent: true, opacity: 0.35 });
  function makeProjLine() {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const l = new THREE.Line(geo, projMat.clone());
    scene.add(l);
    return l;
  }
  const projVert = makeProjLine();
  const projRho = makeProjLine();

  // OM arrow
  let omArrow = null;

  // Vector labels
  const eRhoLabel = makeTextSprite('eρ', { color: 0xf59e0b, fontSize: 40 });
  scene.add(eRhoLabel);
  const ePhiLabel = makeTextSprite('eφ', { color: 0xf43f5e, fontSize: 40 });
  scene.add(ePhiLabel);
  const eZLabel = makeTextSprite('ez', { color: 0x10b981, fontSize: 40 });
  scene.add(eZLabel);

  const coordDisplay = container.parentElement.querySelector('.coord-display');

  function updateLine(line, from, to) {
    const p = line.geometry.attributes.position.array;
    p[0] = from[0]; p[1] = from[1]; p[2] = from[2];
    p[3] = to[0];   p[4] = to[1];   p[5] = to[2];
    line.geometry.attributes.position.needsUpdate = true;
  }

  function updatePoint() {
    const x = rho * Math.cos(phi);
    const y = rho * Math.sin(phi);
    const z = zVal;

    // THREE: x→math_x, y→math_z, z→math_y
    pointM.position.set(x, z, y);
    mLabel.position.set(x + 0.2, z + 0.2, y);

    mProj.position.set(x, 0, y);
    mProjLabel.position.set(x + 0.12, -0.15, y);

    // Projection lines
    updateLine(projVert, [x, z, y], [x, 0, y]);
    updateLine(projRho, [0, 0, 0], [x, 0, y]);

    // OM vector
    if (omArrow) scene.remove(omArrow);
    const dir = new THREE.Vector3(x, z, y);
    const len = dir.length();
    if (len > 0.01) {
      omArrow = new THREE.ArrowHelper(dir.clone().normalize(), new THREE.Vector3(0, 0, 0), len, 0x00d4ff, 0.12, 0.06);
      scene.add(omArrow);
    }

    // eρ
    if (eRhoArrow) scene.remove(eRhoArrow);
    const eRhoDir = new THREE.Vector3(Math.cos(phi), 0, Math.sin(phi));
    eRhoArrow = new THREE.ArrowHelper(eRhoDir, pointM.position.clone(), 0.8, 0xf59e0b, 0.12, 0.06);
    scene.add(eRhoArrow);

    // eφ
    if (ePhiArrow) scene.remove(ePhiArrow);
    const ePhiDir = new THREE.Vector3(-Math.sin(phi), 0, Math.cos(phi));
    ePhiArrow = new THREE.ArrowHelper(ePhiDir, pointM.position.clone(), 0.8, 0xf43f5e, 0.12, 0.06);
    scene.add(ePhiArrow);

    // ez
    if (eZArrow) scene.remove(eZArrow);
    eZArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), pointM.position.clone(), 0.8, 0x10b981, 0.12, 0.06);
    scene.add(eZArrow);

    // Labels
    eRhoLabel.position.copy(pointM.position).add(eRhoDir.clone().multiplyScalar(0.95)).add(new THREE.Vector3(0, 0.15, 0));
    ePhiLabel.position.copy(pointM.position).add(ePhiDir.clone().multiplyScalar(0.95)).add(new THREE.Vector3(0, 0.15, 0));
    eZLabel.position.copy(pointM.position).add(new THREE.Vector3(0.15, 0.9, 0));

    // φ arc
    if (phiArc) scene.remove(phiArc);
    const arcPoints = [];
    const arcR = 0.5;
    const steps = 32;
    for (let i = 0; i <= steps; i++) {
      const a = (phi * i) / steps;
      arcPoints.push(new THREE.Vector3(arcR * Math.cos(a), 0, arcR * Math.sin(a)));
    }
    phiArc = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(arcPoints),
      new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.6 })
    );
    scene.add(phiArc);

    // Cylinder
    updateCylinder(rho, Math.max(z, 0.1));

    if (coordDisplay) {
      const phiDeg = (phi * 180 / Math.PI).toFixed(1);
      coordDisplay.innerHTML =
        `ρ = ${rho.toFixed(2)}<br>φ = ${phiDeg}° (${(phi / Math.PI).toFixed(2)}π)<br>z = ${zVal.toFixed(2)}<br><br>x = ${(rho * Math.cos(phi)).toFixed(2)}<br>y = ${(rho * Math.sin(phi)).toFixed(2)}`;
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
      if (params.rho !== undefined) rho = params.rho;
      if (params.phi !== undefined) phi = params.phi;
      if (params.z !== undefined) zVal = params.z;
      updatePoint();
    },
    dispose() {
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      controls.dispose();
    }
  };
}
