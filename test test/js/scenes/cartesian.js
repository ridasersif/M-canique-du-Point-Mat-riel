/* =============================================
   Scène 3D : Repère Cartésien
   ============================================= */

function createCartesianScene(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(3.5, 2.8, 3.5);

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

  // Subtle grid
  const gridHelper = new THREE.GridHelper(6, 12, 0x1a1a3a, 0x0d0d20);
  scene.add(gridHelper);

  // Axis colors
  const colors = { x: 0xf43f5e, y: 0x10b981, z: 0x3b82f6 };
  const axisLength = 2.8;

  // Create axes with arrows
  function createAxis(dir, color, label) {
    const direction = new THREE.Vector3(...dir).normalize();
    scene.add(new THREE.ArrowHelper(direction, new THREE.Vector3(0, 0, 0), axisLength, color, 0.2, 0.1));

    // Negative axis
    const negGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-dir[0] * 1.5, -dir[1] * 1.5, -dir[2] * 1.5)
    ]);
    scene.add(new THREE.Line(negGeom, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.2 })));

    // Label
    const sprite = makeTextSprite(label, { color, fontSize: 56 });
    sprite.position.set(dir[0] * (axisLength + 0.3), dir[1] * (axisLength + 0.3), dir[2] * (axisLength + 0.3));
    scene.add(sprite);
  }

  createAxis([1, 0, 0], colors.x, 'x');
  createAxis([0, 1, 0], colors.y, 'y');
  createAxis([0, 0, 1], colors.z, 'z');

  // Origin
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff })));
  const oLabel = makeTextSprite('O', { color: 0xffffff, fontSize: 48 });
  oLabel.position.set(-0.25, -0.25, 0);
  scene.add(oLabel);

  // Unit vector labels
  const iLabel = makeTextSprite('ī', { color: colors.x, fontSize: 44 });
  iLabel.position.set(0.6, 0.2, 0);
  scene.add(iLabel);
  const jLabel = makeTextSprite('j̄', { color: colors.y, fontSize: 44 });
  jLabel.position.set(0, 0.8, 0);
  scene.add(jLabel);
  const kLabel = makeTextSprite('k̄', { color: colors.z, fontSize: 44 });
  kLabel.position.set(0, 0.2, 0.6);
  scene.add(kLabel);

  // --- Point M ---
  let mx = 1.5, my = 1.8, mz = 1.2;

  const pointM = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x00d4ff })
  );
  pointM.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.15 })
  ));
  scene.add(pointM);

  const mLabel = makeTextSprite('M', { color: 0x00d4ff, fontSize: 52 });
  scene.add(mLabel);

  let omArrow = null;

  // Projection lines (simple lines, not dashed — more reliable)
  const projMat = new THREE.LineBasicMaterial({ color: 0x6a6a8e, transparent: true, opacity: 0.35 });

  function makeLine() {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const line = new THREE.Line(geo, projMat.clone());
    scene.add(line);
    return line;
  }

  const projXY = makeLine(); // O to M'
  const projZ = makeLine();  // M to M' (vertical)
  const projX = makeLine();  // M' to x-axis
  const projY = makeLine();  // M' to y-axis

  // M' point
  const mPrime = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0x6a6a8e })
  );
  scene.add(mPrime);
  const mPrimeLabel = makeTextSprite("M'", { color: 0x6a6a8e, fontSize: 40 });
  scene.add(mPrimeLabel);

  const coordDisplay = container.parentElement.querySelector('.coord-display');

  function updateLine(line, from, to) {
    const positions = line.geometry.attributes.position.array;
    positions[0] = from[0]; positions[1] = from[1]; positions[2] = from[2];
    positions[3] = to[0];   positions[4] = to[1];   positions[5] = to[2];
    line.geometry.attributes.position.needsUpdate = true;
  }

  function updatePoint(x, y, z) {
    mx = x; my = y; mz = z;

    // THREE: math_x→x, math_y→z, math_z→y
    pointM.position.set(x, z, y);
    mLabel.position.set(x + 0.2, z + 0.2, y);

    // OM arrow
    if (omArrow) scene.remove(omArrow);
    const dir = new THREE.Vector3(x, z, y);
    const len = dir.length();
    if (len > 0.01) {
      omArrow = new THREE.ArrowHelper(dir.clone().normalize(), new THREE.Vector3(0, 0, 0), len, 0x00d4ff, 0.15, 0.08);
      scene.add(omArrow);
    }

    // M' projection
    mPrime.position.set(x, 0, y);
    mPrimeLabel.position.set(x + 0.15, -0.15, y);

    // Projection lines
    updateLine(projZ, [x, z, y], [x, 0, y]);       // M → M'
    updateLine(projXY, [0, 0, 0], [x, 0, y]);       // O → M'
    updateLine(projX, [x, 0, y], [x, 0, 0]);         // M' → x-axis
    updateLine(projY, [x, 0, y], [0, 0, y]);         // M' → y-axis

    if (coordDisplay) {
      coordDisplay.innerHTML = `x = ${x.toFixed(2)}<br>y = ${y.toFixed(2)}<br>z = ${z.toFixed(2)}`;
    }
  }

  updatePoint(mx, my, mz);

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
      updatePoint(
        params.x !== undefined ? params.x : mx,
        params.y !== undefined ? params.y : my,
        params.z !== undefined ? params.z : mz
      );
    },
    dispose() {
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      controls.dispose();
    }
  };
}

/* Helper: Create text sprite */
function makeTextSprite(text, options = {}) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const fontSize = options.fontSize || 48;
  const colorHex = options.color || 0xffffff;

  canvas.width = 256;
  canvas.height = 128;

  const r = (colorHex >> 16) & 255;
  const g = (colorHex >> 8) & 255;
  const b = colorHex & 255;

  ctx.font = `bold ${fontSize}px Inter, sans-serif`;
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.6, 0.3, 1);
  return sprite;
}
