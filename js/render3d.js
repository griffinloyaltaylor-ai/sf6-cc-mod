// Real WebGL 3D rendering (via a locally-vendored Three.js, js/vendor/three.min.js).
// Low-poly/stylized humanoid fighters + arenas -- built from primitive
// geometry, not sculpted models. No third-party character art is used
// anywhere; everything here is procedurally generated.

const GEAR_OPTIONS = {
  head: ['none', 'helmet', 'mask', 'bandana', 'cap', 'hood'],
  body: ['gi', 'jacket', 'tanktop', 'armor', 'coat'],
  hands: ['bare', 'wraps', 'gloves', 'gauntlets'],
  feet: ['bare', 'boots', 'sneakers', 'sandals'],
  accessory: ['none', 'scarf', 'belt', 'cape', 'glasses'],
};

function pose3d(poseName, t) {
  const wobble = Math.sin(t / 180 * Math.PI);
  switch (poseName) {
    case 'walk':
      return { armL: 0.5 * wobble, armR: -0.5 * wobble, legL: 0.5 * wobble, legR: -0.5 * wobble, crouch: 0, lean: 0 };
    case 'jump':
      return { armL: -0.6, armR: -0.6, legL: 0.4, legR: -0.2, crouch: -0.55, lean: 0 };
    case 'crouch':
      return { armL: 0.2, armR: 0.2, legL: 0, legR: 0, crouch: 0.32, lean: 0 };
    case 'block':
      return { armL: -1.3, armR: -1.3, legL: 0.1, legR: -0.1, crouch: 0.08, lean: 0.06 };
    case 'punch':
      return { armL: -1.9, armR: 0.15, legL: 0.05, legR: -0.05, crouch: 0, lean: 0.22 };
    case 'kick':
      return { armL: 0.3, armR: -0.3, legL: -1.7, legR: 0.25, crouch: 0, lean: -0.15 };
    case 'special':
      return { armL: -1.5, armR: -1.5, legL: 0.15, legR: -0.15, crouch: 0.04, lean: 0.15 };
    case 'hitstun':
      return { armL: 1.1, armR: 1.1, legL: -0.25, legR: 0.35, crouch: 0, lean: -0.28 };
    case 'ko':
      return { armL: 1.6, armR: 1.6, legL: 1.1, legR: -1.1, crouch: 0.55, lean: 0.9 };
    default: // idle
      return { armL: 0.1 * wobble, armR: -0.1 * wobble, legL: 0, legR: 0, crouch: 0, lean: 0 };
  }
}

function shadeHex(hex, amt) {
  const n = parseInt(hex.replace('#', ''), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 0xff) + amt, b = (n & 0xff) + amt;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return (r << 16) | (g << 8) | b;
}

function makeLimbGroup(length, radius, material, bendSign) {
  const group = new THREE.Group();
  const upperLen = length * 0.52, lowerLen = length * 0.52;
  const upperGeo = new THREE.CylinderGeometry(radius, radius * 0.92, upperLen, 8);
  const upperMesh = new THREE.Mesh(upperGeo, material);
  upperMesh.position.y = -upperLen / 2;
  upperMesh.castShadow = true;
  group.add(upperMesh);

  const bendGroup = new THREE.Group();
  bendGroup.position.y = -upperLen;
  bendGroup.rotation.x = bendSign * 0.35;
  group.add(bendGroup);

  const lowerGeo = new THREE.CylinderGeometry(radius * 0.88, radius * 0.7, lowerLen, 8);
  const lowerMesh = new THREE.Mesh(lowerGeo, material);
  lowerMesh.position.y = -lowerLen / 2;
  lowerMesh.castShadow = true;
  bendGroup.add(lowerMesh);

  const tip = new THREE.Group();
  tip.position.y = -lowerLen;
  bendGroup.add(tip);

  return { group, tip, upperMesh, lowerMesh };
}

function buildHeadGear(type, color, headR) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
  const g = new THREE.Group();
  switch (type) {
    case 'helmet': {
      const m = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.08, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), mat);
      g.add(m);
      break;
    }
    case 'mask': {
      const m = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.4, headR * 1.1, headR * 0.5), mat);
      m.position.z = headR * 0.55;
      g.add(m);
      break;
    }
    case 'bandana': {
      const m = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.95, headR * 0.18, 6, 12), mat);
      m.rotation.x = Math.PI / 2;
      m.position.y = headR * 0.15;
      g.add(m);
      break;
    }
    case 'cap': {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.05, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), mat);
      dome.position.y = headR * 0.1;
      g.add(dome);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.55, headR * 0.55, headR * 0.12, 10), mat);
      brim.position.set(0, headR * 0.05, headR * 0.9);
      brim.rotation.x = Math.PI / 2;
      g.add(brim);
      break;
    }
    case 'hood': {
      const m = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.25, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.7), mat);
      m.position.y = headR * 0.05;
      g.add(m);
      break;
    }
  }
  return g;
}

function buildBodyDetail(type, color, torsoW, torsoH, torsoD) {
  const mat = new THREE.MeshStandardMaterial({ color: shadeHex(color, -25), roughness: 0.7 });
  const g = new THREE.Group();
  switch (type) {
    case 'armor': {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(torsoW * 1.08, torsoH * 0.4, torsoD * 1.1), mat);
      plate.position.y = torsoH * 0.22;
      g.add(plate);
      const belt = new THREE.Mesh(new THREE.BoxGeometry(torsoW * 1.05, torsoH * 0.14, torsoD * 1.1), mat);
      belt.position.y = -torsoH * 0.35;
      g.add(belt);
      break;
    }
    case 'coat': {
      const skirt = new THREE.Mesh(new THREE.ConeGeometry(torsoW * 0.85, torsoH * 0.7, 8, 1, true), mat);
      skirt.position.y = -torsoH * 0.75;
      g.add(skirt);
      break;
    }
    case 'jacket': {
      const zip = new THREE.Mesh(new THREE.BoxGeometry(torsoW * 0.08, torsoH * 0.95, torsoD * 0.2), mat);
      zip.position.set(0, 0, torsoD * 0.52);
      g.add(zip);
      break;
    }
    case 'tanktop': {
      const strapL = new THREE.Mesh(new THREE.BoxGeometry(torsoW * 0.14, torsoH * 0.5, torsoD * 0.14), mat);
      strapL.position.set(-torsoW * 0.32, torsoH * 0.4, 0);
      g.add(strapL);
      const strapR = strapL.clone();
      strapR.position.x = torsoW * 0.32;
      g.add(strapR);
      break;
    }
    default: { // gi
      const sash = new THREE.Mesh(new THREE.BoxGeometry(torsoW * 1.05, torsoH * 0.16, torsoD * 1.05), mat);
      sash.rotation.z = 0.5;
      g.add(sash);
    }
  }
  return g;
}

function buildAccessory(type, color, torsoW, torsoH) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
  const g = new THREE.Group();
  switch (type) {
    case 'belt': {
      const m = new THREE.Mesh(new THREE.BoxGeometry(torsoW * 1.1, torsoH * 0.13, torsoW * 0.7), mat);
      m.position.y = -torsoH * 0.46;
      g.add(m);
      break;
    }
    case 'scarf': {
      const m = new THREE.Mesh(new THREE.TorusGeometry(torsoW * 0.42, torsoW * 0.14, 6, 10), mat);
      m.position.y = torsoH * 0.48;
      g.add(m);
      break;
    }
    case 'cape': {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(torsoW * 1.3, torsoH * 1.3), new THREE.MeshStandardMaterial({ color, roughness: 0.7, side: THREE.DoubleSide }));
      m.position.set(0, -torsoH * 0.1, -torsoW * 0.6);
      m.rotation.x = 0.25;
      g.add(m);
      break;
    }
    case 'glasses': {
      const lensGeo = new THREE.BoxGeometry(0.14, 0.08, 0.03);
      const l = new THREE.Mesh(lensGeo, mat); l.position.set(-0.1, 0, 0.16); g.add(l);
      const r = l.clone(); r.position.x = 0.1; g.add(r);
      break;
    }
  }
  return g;
}

function createFighterRig() {
  const root = new THREE.Group();

  const materials = {
    skin: new THREE.MeshStandardMaterial({ color: 0xe0ac69, roughness: 0.75 }),
    skinShade: new THREE.MeshStandardMaterial({ color: 0xc0906f, roughness: 0.75 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x2b2013, roughness: 0.5 }),
    body: new THREE.MeshStandardMaterial({ color: 0x3355cc, roughness: 0.65 }),
    hands: new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.5 }),
    feet: new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6 }),
  };

  const hips = new THREE.Group();
  root.add(hips);
  const torsoPivot = new THREE.Group();
  hips.add(torsoPivot);

  let torsoMesh, headPivot, headMesh, hairMesh, gearGroup = new THREE.Group();
  torsoPivot.add(gearGroup);

  let legGroupL, legGroupR, armGroupL, armGroupR, footL, footR, handL, handR;

  const sharedMaterials = new Set(Object.values(materials));
  function clearGroup(g) { while (g.children.length) { const c = g.children.pop(); disposeObject(c); } }
  function disposeObject(obj) {
    obj.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material && !sharedMaterials.has(o.material)) {
        if (o.material.map) o.material.map.dispose();
        o.material.dispose();
      }
    });
  }

  function build(fighter) {
    clearGroup(hips);
    hips.add(torsoPivot);
    clearGroup(torsoPivot);

    const { skinTone, hair, gear, build: bld } = fighter.appearance;
    const heightMul = (bld && bld.height) || 1;
    const widthMul = (bld && bld.width) || 1;

    materials.skin.color.set(skinTone);
    materials.skinShade.color.set(shadeHex(skinTone, -24));
    materials.hair.color.set(hair.color);
    materials.body.color.set(gear.body.color);
    materials.hands.color.set(gear.hands.color);
    materials.feet.color.set(gear.feet.color);

    const legLen = 1.0 * heightMul, torsoH = 0.85 * heightMul, armLen = 0.78 * heightMul;
    const headR = 0.26 * (0.9 + widthMul * 0.1);
    const torsoW = 0.62 * widthMul, torsoD = 0.34 * widthMul;
    const limbR = 0.1 * widthMul;

    hips.position.y = legLen;
    torsoPivot.position.y = torsoH / 2;

    torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(torsoW, torsoH, torsoD), materials.body);
    torsoMesh.castShadow = true;
    torsoPivot.add(torsoMesh);

    const detail = buildBodyDetail(gear.body.type, gear.body.color, torsoW, torsoH, torsoD);
    torsoPivot.add(detail);

    const accessory = buildAccessory(gear.accessory.type, gear.accessory.color, torsoW, torsoH);
    torsoPivot.add(accessory);

    headPivot = new THREE.Group();
    headPivot.position.y = torsoH / 2 + headR + 0.02;
    torsoPivot.add(headPivot);

    headMesh = new THREE.Mesh(new THREE.SphereGeometry(headR, 14, 12), materials.skin);
    headMesh.castShadow = true;
    headPivot.add(headMesh);

    hairMesh = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.04, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), materials.hair);
    headPivot.add(hairMesh);

    const headGear = buildHeadGear(gear.head.type, gear.head.color, headR);
    headPivot.add(headGear);

    // arms
    const armL = makeLimbGroup(armLen, limbR * 0.75, materials.skin, 1);
    armL.group.position.set(-(torsoW / 2 + 0.02), torsoH / 2 - 0.05, 0);
    torsoPivot.add(armL.group);
    const handLMesh = new THREE.Mesh(new THREE.SphereGeometry(limbR * (gear.hands.type === 'gauntlets' ? 1.15 : 0.95), 8, 8), materials.hands);
    armL.tip.add(handLMesh);
    armGroupL = armL.group;

    const armR = makeLimbGroup(armLen, limbR * 0.75, materials.skinShade, -1);
    armR.group.position.set(torsoW / 2 + 0.02, torsoH / 2 - 0.05, 0);
    torsoPivot.add(armR.group);
    const handRMesh = new THREE.Mesh(new THREE.SphereGeometry(limbR * (gear.hands.type === 'gauntlets' ? 1.15 : 0.95), 8, 8), materials.hands);
    armR.tip.add(handRMesh);
    armGroupR = armR.group;

    // legs
    const legL = makeLimbGroup(legLen, limbR, materials.skin, 1);
    legL.group.position.set(-torsoW * 0.32, 0, 0);
    hips.add(legL.group);
    const footLMesh = new THREE.Mesh(new THREE.BoxGeometry(limbR * 1.6, limbR * 0.9, limbR * 2.4), materials.feet);
    footLMesh.position.z = limbR * 0.7;
    legL.tip.add(footLMesh);
    legGroupL = legL.group;

    const legR = makeLimbGroup(legLen, limbR, materials.skinShade, -1);
    legR.group.position.set(torsoW * 0.32, 0, 0);
    hips.add(legR.group);
    const footRMesh = new THREE.Mesh(new THREE.BoxGeometry(limbR * 1.6, limbR * 0.9, limbR * 2.4), materials.feet);
    footRMesh.position.z = limbR * 0.7;
    legR.tip.add(footRMesh);
    legGroupR = legR.group;

    root.userData.baseHipY = legLen;
  }

  function setPose(poseName, t) {
    const p = pose3d(poseName, t);
    if (armGroupL) armGroupL.rotation.x = p.armL;
    if (armGroupR) armGroupR.rotation.x = p.armR;
    if (legGroupL) legGroupL.rotation.x = p.legL;
    if (legGroupR) legGroupR.rotation.x = p.legR;
    if (torsoPivot) torsoPivot.rotation.x = -p.lean * 0.6;
    hips.position.y = (root.userData.baseHipY || 1) - p.crouch;
  }

  function setFacing(facing) {
    root.rotation.y = facing >= 0 ? Math.PI / 2 : -Math.PI / 2;
  }

  function setWorldPosition(worldX, worldY, worldZ) {
    root.position.set(worldX, worldY, worldZ);
  }

  return { root, build, setPose, setFacing, setWorldPosition };
}
