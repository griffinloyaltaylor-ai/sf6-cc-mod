// Shared Three.js scene/camera/renderer setup for the creator preview,
// the fight screen, and roster-card thumbnails.

function createRenderer3D(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  return renderer;
}

function addStandardLighting(scene) {
  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(3, 6, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x88aaff, 0.35);
  rim.position.set(-4, 2.5, -3);
  scene.add(rim);
  const amb = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(amb);
  return { key, rim, amb };
}

// ---------------- Creator preview ----------------

function createPreviewScene(canvas) {
  const renderer = createRenderer3D(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x11141c);
  addStandardLighting(scene);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(1.7, 32),
    new THREE.MeshStandardMaterial({ color: 0x1a1e2a, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const camera = new THREE.PerspectiveCamera(30, canvas.width / canvas.height, 0.1, 30);
  camera.position.set(0, 1.35, 5.6);
  camera.lookAt(0, 1.05, 0);

  const rig = createFighterRig();
  scene.add(rig.root);

  function resize(w, h) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  resize(canvas.width, canvas.height);

  function render() {
    renderer.render(scene, camera);
  }

  return { renderer, scene, camera, rig, resize, render };
}

// ---------------- Fight scene ----------------

function createFightScene(canvas) {
  const renderer = createRenderer3D(canvas);
  const scene = new THREE.Scene();
  addStandardLighting(scene);

  const camera = new THREE.PerspectiveCamera(42, canvas.width / canvas.height, 0.1, 100);

  const rigP1 = createFighterRig();
  const rigP2 = createFighterRig();
  scene.add(rigP1.root, rigP2.root);

  let arenaHandle = null;
  let arenaGroup = null;

  function setArena(arenaId) {
    if (arenaGroup) { scene.remove(arenaGroup); }
    const def = ARENAS[arenaId] || ARENAS.dojo;
    arenaHandle = def.build(scene);
    arenaGroup = arenaHandle.group;
    scene.add(arenaGroup);
    scene.fog = new THREE.Fog(arenaHandle.fogColor, 9, 28);
    scene.background = new THREE.Color(arenaHandle.fogColor);
  }

  function updateCamera(worldX1, worldX2) {
    const midX = (worldX1 + worldX2) / 2;
    const dist = Math.abs(worldX2 - worldX1);
    const camZ = 6.0 + dist * 0.32;
    camera.position.set(midX * 0.35, 2.0, camZ);
    camera.lookAt(midX * 0.35, 1.0, 0);
  }

  function resize(w, h) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  resize(canvas.width, canvas.height);

  function render(tSeconds) {
    if (arenaHandle && arenaHandle.crowd) arenaHandle.crowd.update(tSeconds);
    renderer.render(scene, camera);
  }

  return { renderer, scene, camera, rigP1, rigP2, setArena, updateCamera, resize, render };
}

// ---------------- Roster thumbnails (one shared offscreen renderer) ----------------

let thumbShared = null;

function getThumbnailRig(width, height) {
  if (thumbShared) return thumbShared;
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const renderer = createRenderer3D(canvas);
  renderer.setSize(width, height, false);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x11141c);
  addStandardLighting(scene);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 28),
    new THREE.MeshStandardMaterial({ color: 0x161a24, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 30);
  camera.position.set(0, 1.35, 5.6);
  camera.lookAt(0, 1.05, 0);
  const rig = createFighterRig();
  scene.add(rig.root);
  thumbShared = { canvas, renderer, scene, camera, rig };
  return thumbShared;
}

function renderFighterThumbnail(fighter, targetCtx2d, width, height) {
  const t = getThumbnailRig(width, height);
  t.rig.build(fighter);
  t.rig.root.rotation.y = 0.55;
  t.rig.setPose('idle', 0);
  t.renderer.render(t.scene, t.camera);
  targetCtx2d.drawImage(t.canvas, 0, 0, width, height);
}
