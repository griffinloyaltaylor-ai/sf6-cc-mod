// Arena environments: ground, backdrop, simple props, and an animated
// low-poly crowd (instanced meshes bobbing to fake cheering). All
// procedural geometry -- original, not derived from any existing game.

function buildCrowdBlock(count, colorPalette) {
  const bodyGeo = new THREE.CylinderGeometry(0.16, 0.14, 0.4, 6);
  const headGeo = new THREE.SphereGeometry(0.13, 6, 5);
  const bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xe0ac69, roughness: 0.9 });

  const bodies = new THREE.InstancedMesh(bodyGeo, bodyMat, count);
  const heads = new THREE.InstancedMesh(headGeo, headMat, count);
  bodies.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);

  const dummy = new THREE.Object3D();
  const seats = [];
  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    seats.push({ phase: Math.random() * Math.PI * 2, speed: 0.7 + Math.random() * 0.6 });
  }

  return {
    bodies, heads, seats, dummy, count,
    placeAt(i, x, y, z) {
      seats[i].x = x; seats[i].y = y; seats[i].z = z;
      color.setHSL(Math.random(), 0.45 + Math.random() * 0.3, 0.4 + Math.random() * 0.25);
      this.dummy.position.set(x, y + 0.24, z);
      this.dummy.rotation.y = Math.atan2(-x, -z + 4);
      this.dummy.updateMatrix();
      this.bodies.setMatrixAt(i, this.dummy.matrix);
      this.bodies.setColorAt(i, color);
      this.dummy.position.set(x, y + 0.52, z);
      this.dummy.updateMatrix();
      this.heads.setMatrixAt(i, this.dummy.matrix);
    },
    finalize() {
      this.bodies.instanceMatrix.needsUpdate = true;
      this.heads.instanceMatrix.needsUpdate = true;
      if (this.bodies.instanceColor) this.bodies.instanceColor.needsUpdate = true;
    },
    update(t) {
      for (let i = 0; i < count; i++) {
        const s = seats[i];
        const bob = Math.sin(t * s.speed + s.phase) * 0.06 + 0.03;
        this.dummy.position.set(s.x, s.y + 0.24 + bob, s.z);
        this.dummy.rotation.y = Math.atan2(-s.x, -s.z + 4);
        this.dummy.updateMatrix();
        this.bodies.setMatrixAt(i, this.dummy.matrix);
        this.dummy.position.set(s.x, s.y + 0.52 + bob * 1.4, s.z);
        this.dummy.updateMatrix();
        this.heads.setMatrixAt(i, this.dummy.matrix);
      }
      this.bodies.instanceMatrix.needsUpdate = true;
      this.heads.instanceMatrix.needsUpdate = true;
    },
  };
}

function buildStraightCrowd(rows, cols, xSpan, zStart, zStep, yStart, yStep) {
  const count = rows * cols;
  const crowd = buildCrowdBlock(count);
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = -xSpan / 2 + (c / (cols - 1)) * xSpan + (Math.random() - 0.5) * 0.15;
      const z = zStart + r * zStep;
      const y = yStart + r * yStep;
      crowd.placeAt(i, x, y, z);
      i++;
    }
  }
  crowd.finalize();
  return crowd;
}

function buildCurvedCrowd(rows, cols, radiusStart, radiusStep, yStart, yStep, angleSpan) {
  const count = rows * cols;
  const crowd = buildCrowdBlock(count);
  let i = 0;
  for (let r = 0; r < rows; r++) {
    const radius = radiusStart + r * radiusStep;
    const y = yStart + r * yStep;
    for (let c = 0; c < cols; c++) {
      const a = -angleSpan / 2 + (c / (cols - 1)) * angleSpan;
      const x = Math.sin(a) * radius;
      const z = -Math.cos(a) * radius;
      crowd.placeAt(i, x, y, z);
      i++;
    }
  }
  crowd.finalize();
  return crowd;
}

function makeGround(color, size) {
  const geo = new THREE.CircleGeometry(size, 48);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

function makeBackdrop(topColor, bottomColor, distance) {
  const geo = new THREE.PlaneGeometry(60, 26, 1, 1);
  const canvas = document.createElement('canvas');
  canvas.width = 4; canvas.height = 64;
  const c2d = canvas.getContext('2d');
  const grad = c2d.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0, topColor);
  grad.addColorStop(1, bottomColor);
  c2d.fillStyle = grad;
  c2d.fillRect(0, 0, 4, 64);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, fog: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, 10, -distance);
  return mesh;
}

function buildDojoArena(scene) {
  const group = new THREE.Group();
  group.add(makeGround(0x8a6a4a, 20));
  group.add(makeBackdrop('#f2c98a', '#c98a4a', 14));

  const postMat = new THREE.MeshStandardMaterial({ color: 0x5a3a2a, roughness: 0.8 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x8a2c2c, roughness: 0.6 });
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 4, 8), postMat);
    post.position.set(side * 6.5, 2, -4);
    group.add(post);
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffcc66, emissive: 0xff9933, emissiveIntensity: 0.6 }));
    lantern.position.set(side * 6.5, 3.6, -4);
    group.add(lantern);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(15, 0.4, 3), roofMat);
  roof.position.set(0, 4.2, -4);
  group.add(roof);

  const crowd = buildStraightCrowd(3, 14, 13, -5.5, -1.1, 0.9, 0.55);
  group.add(crowd.bodies, crowd.heads);

  const light = new THREE.HemisphereLight(0xfff2d8, 0x554433, 0.7);
  group.add(light);

  return { group, crowd, fogColor: 0xd8a86a, ambient: 0.55 };
}

function buildStreetArena(scene) {
  const group = new THREE.Group();
  group.add(makeGround(0x3a3a42, 20));
  group.add(makeBackdrop('#2a2050', '#120a24', 14));

  const buildingMat = [0x4a3a6a, 0x3a2a52, 0x5a4a7a].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 }));
  for (let i = 0; i < 8; i++) {
    const h = 3 + Math.random() * 5;
    const bld = new THREE.Mesh(new THREE.BoxGeometry(1.6, h, 1.6), buildingMat[i % buildingMat.length]);
    bld.position.set(-9 + i * 2.6, h / 2, -7 - Math.random() * 2);
    group.add(bld);
    if (Math.random() > 0.4) {
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.3), new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 0.8 }));
      sign.position.set(bld.position.x, h * 0.7, bld.position.z + 0.85);
      group.add(sign);
    }
  }

  const crowd = buildStraightCrowd(2, 16, 15, -4.2, -0.9, 0.5, 0.4);
  group.add(crowd.bodies, crowd.heads);

  const light = new THREE.HemisphereLight(0x8899ff, 0x201030, 0.6);
  group.add(light);

  return { group, crowd, fogColor: 0x1a1230, ambient: 0.4 };
}

function buildStadiumArena(scene) {
  const group = new THREE.Group();
  group.add(makeGround(0x556b6b, 20));
  group.add(makeBackdrop('#bfe6ff', '#6fb8d8', 16));

  const tierMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.85 });
  for (let r = 0; r < 4; r++) {
    const radius = 9 + r * 1.4;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.5, 6, 24, Math.PI * 1.3), tierMat);
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = Math.PI * 0.85;
    ring.position.y = 0.3 + r * 0.9;
    group.add(ring);
  }

  const crowd = buildCurvedCrowd(4, 24, 9.5, 1.4, 0.9, 0.9, Math.PI * 1.15);
  group.add(crowd.bodies, crowd.heads);

  const light = new THREE.HemisphereLight(0xffffff, 0x446655, 0.85);
  group.add(light);

  return { group, crowd, fogColor: 0x9fd0e8, ambient: 0.7 };
}

const ARENAS = {
  dojo: { id: 'dojo', name: 'Sunset Dojo', build: buildDojoArena },
  street: { id: 'street', name: 'Neon Alley', build: buildStreetArena },
  stadium: { id: 'stadium', name: 'Grand Coliseum', build: buildStadiumArena },
};
const ARENA_LIST = Object.values(ARENAS);
