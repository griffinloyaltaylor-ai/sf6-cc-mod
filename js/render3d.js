// Real WebGL 3D rendering (via a locally-vendored Three.js, js/vendor/three.min.js).
// Low-poly/stylized humanoid fighters + arenas -- built from primitive
// geometry, not sculpted models. No third-party character art is used
// anywhere; everything here is procedurally generated.

const GEAR_OPTIONS = {
  head: ['none', 'helmet', 'mask', 'bandana', 'cap', 'hood', 'beanie', 'headband', 'fedora', 'visor'],
  body: ['gi', 'jacket', 'tanktop', 'armor', 'coat', 'hoodie', 'vest', 'tshirt', 'sweater'],
  legwear: ['bare', 'shorts', 'pants', 'joggers', 'skirt'],
  hands: ['bare', 'wraps', 'gloves', 'gauntlets', 'fingerless', 'boxing', 'claws'],
  feet: ['bare', 'boots', 'sneakers', 'sandals', 'cleats', 'hightops'],
  accessory: ['none', 'scarf', 'belt', 'cape', 'glasses', 'headphones'],
};

const HAIR_STYLES = ['bald', 'short', 'long', 'ponytail', 'mohawk', 'afro', 'spiky'];

// Base body-shape differences applied before the height/build/detail
// sliders (which still fully override on top of this).
const GENDER_BASE = {
  male: { shoulderW: 1.0, hipW: 0.82, limbR: 1.0, headR: 1.0 },
  female: { shoulderW: 0.86, hipW: 0.94, limbR: 0.86, headR: 0.94 },
};

const FACE_PRESETS = {
  determined: { eyeSize: 0.095, eyeY: 0.08, browAngle: 0.28, browY: 0.24, mouthWidth: 0.32, mouthCurve: 0 },
  calm: { eyeSize: 0.085, eyeY: 0.08, browAngle: 0.05, browY: 0.22, mouthWidth: 0.28, mouthCurve: 0 },
  fierce: { eyeSize: 0.1, eyeY: 0.06, browAngle: 0.45, browY: 0.2, mouthWidth: 0.4, mouthCurve: 0.18 },
  cheerful: { eyeSize: 0.09, eyeY: 0.09, browAngle: -0.12, browY: 0.25, mouthWidth: 0.36, mouthCurve: -0.3 },
  stern: { eyeSize: 0.08, eyeY: 0.06, browAngle: 0.38, browY: 0.19, mouthWidth: 0.24, mouthCurve: 0.06 },
};
const FACE_LIST = Object.keys(FACE_PRESETS);

function buildFace(faceId, headR) {
  const preset = FACE_PRESETS[faceId] || FACE_PRESETS.determined;
  const g = new THREE.Group();
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.4 });
  const browMat = new THREE.MeshStandardMaterial({ color: 0x2b2013, roughness: 0.6 });
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x8a4a4a, roughness: 0.6 });

  const eyeGeo = new THREE.SphereGeometry(headR * preset.eyeSize, 8, 6);
  const browGeo = new THREE.BoxGeometry(headR * 0.3, headR * 0.06, headR * 0.05);
  [-1, 1].forEach(side => {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(side * headR * 0.38, headR * preset.eyeY, headR * 0.88);
    eye.scale.set(1, 1, 0.5);
    g.add(eye);

    const brow = new THREE.Mesh(browGeo, browMat);
    brow.position.set(side * headR * 0.38, headR * preset.browY, headR * 0.9);
    brow.rotation.z = side * preset.browAngle;
    g.add(brow);
  });

  const mouth = new THREE.Mesh(new THREE.BoxGeometry(headR * preset.mouthWidth, headR * 0.05, headR * 0.05), mouthMat);
  mouth.position.set(0, -headR * 0.42, headR * 0.92);
  mouth.rotation.z = preset.mouthCurve;
  g.add(mouth);

  return g;
}

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

function makeLimbGroup(length, upperRadius, lowerRadius, material, bendSign) {
  const group = new THREE.Group();
  const upperLen = length * 0.52, lowerLen = length * 0.52;
  const upperGeo = new THREE.CylinderGeometry(upperRadius, upperRadius * 0.92, upperLen, 8);
  const upperMesh = new THREE.Mesh(upperGeo, material);
  upperMesh.position.y = -upperLen / 2;
  upperMesh.castShadow = true;
  group.add(upperMesh);

  const bendGroup = new THREE.Group();
  bendGroup.position.y = -upperLen;
  bendGroup.rotation.x = bendSign * 0.35;
  group.add(bendGroup);

  const lowerGeo = new THREE.CylinderGeometry(lowerRadius, lowerRadius * 0.8, lowerLen, 8);
  const lowerMesh = new THREE.Mesh(lowerGeo, material);
  lowerMesh.position.y = -lowerLen / 2;
  lowerMesh.castShadow = true;
  bendGroup.add(lowerMesh);

  const tip = new THREE.Group();
  tip.position.y = -lowerLen;
  bendGroup.add(tip);

  return { group, bendGroup, tip, upperMesh, lowerMesh, upperLen, lowerLen };
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
    case 'beanie': {
      const m = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.06, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.58), mat);
      m.position.y = headR * 0.12;
      g.add(m);
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.9, headR * 0.1, 6, 12), mat);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = headR * 0.22;
      g.add(cuff);
      break;
    }
    case 'headband': {
      const m = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.98, headR * 0.1, 6, 12), mat);
      m.rotation.x = Math.PI / 2;
      m.position.y = headR * 0.1;
      g.add(m);
      break;
    }
    case 'fedora': {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.25, headR * 1.25, headR * 0.08, 14), mat);
      brim.position.y = headR * 0.28;
      g.add(brim);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.78, headR * 0.85, headR * 0.6, 12), mat);
      top.position.y = headR * 0.6;
      g.add(top);
      break;
    }
    case 'visor': {
      const m = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.02, 12, 8, Math.PI * 0.15, Math.PI * 1.7, 0, Math.PI * 0.42), mat);
      m.position.set(0, headR * 0.08, 0);
      g.add(m);
      break;
    }
  }
  return g;
}

function buildHair(style, color, headR) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
  const g = new THREE.Group();
  switch (style) {
    case 'bald':
      break;
    case 'long': {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.05, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), mat);
      g.add(cap);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.5, headR * 1.6, 8), mat);
      tail.position.set(0, -headR * 0.6, -headR * 0.55);
      tail.rotation.x = 0.35;
      g.add(tail);
      break;
    }
    case 'ponytail': {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.04, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), mat);
      g.add(cap);
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.18, headR * 0.08, headR * 1.3, 8), mat);
      tail.position.set(0, -headR * 0.3, -headR * 0.75);
      tail.rotation.x = -0.5;
      g.add(tail);
      break;
    }
    case 'mohawk': {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.28, headR * 0.7, headR * 1.5), mat);
      strip.position.y = headR * 0.55;
      g.add(strip);
      break;
    }
    case 'afro': {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.35, 12, 10), mat);
      puff.position.y = headR * 0.15;
      g.add(puff);
      break;
    }
    case 'spiky': {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.16, headR * 0.6, 6), mat);
        spike.position.set(Math.cos(a) * headR * 0.5, headR * 0.55, Math.sin(a) * headR * 0.5);
        spike.rotation.x = Math.cos(a) * 0.5;
        spike.rotation.z = -Math.sin(a) * 0.5;
        g.add(spike);
      }
      break;
    }
    default: { // short
      const cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.04, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), mat);
      g.add(cap);
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
    case 'hoodie': {
      const pocket = new THREE.Mesh(new THREE.BoxGeometry(torsoW * 0.55, torsoH * 0.28, torsoD * 0.2), mat);
      pocket.position.set(0, -torsoH * 0.28, torsoD * 0.52);
      g.add(pocket);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(torsoW * 0.02, torsoW * 0.02, torsoH * 0.3, 6), mat);
      cord.position.set(0, torsoH * 0.3, torsoD * 0.53);
      g.add(cord);
      break;
    }
    case 'vest': {
      const trim = new THREE.Mesh(new THREE.BoxGeometry(torsoW * 1.08, torsoH * 0.1, torsoD * 1.1), mat);
      trim.position.y = torsoH * 0.42;
      g.add(trim);
      break;
    }
    case 'tshirt': {
      const hem = new THREE.Mesh(new THREE.BoxGeometry(torsoW * 1.1, torsoH * 0.1, torsoD * 1.1), mat);
      hem.position.y = -torsoH * 0.4;
      g.add(hem);
      break;
    }
    case 'sweater': {
      const collar = new THREE.Mesh(new THREE.TorusGeometry(torsoW * 0.28, torsoW * 0.08, 6, 10), mat);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = torsoH * 0.46;
      g.add(collar);
      const ribHem = new THREE.Mesh(new THREE.BoxGeometry(torsoW * 1.1, torsoH * 0.08, torsoD * 1.1), mat);
      ribHem.position.y = -torsoH * 0.42;
      g.add(ribHem);
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

// Skirts hang from the hips (not per-leg); shorts/pants/joggers sleeve
// each leg individually via buildLegSleeve below, since they need to be
// children of that leg's own rotating group.
function buildSkirt(color, torsoW, upperLen) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  const skirt = new THREE.Mesh(new THREE.ConeGeometry(torsoW * 0.9, upperLen * 0.9, 10, 1, true), mat);
  skirt.position.y = -upperLen * 0.45;
  return skirt;
}

// Attaches sleeve pieces directly to a leg's own upper group and bent
// lower (bendGroup), so pants follow the leg's fixed knee bend instead of
// floating off in a straight line.
function attachLegSleeve(type, color, leg) {
  if (type === 'bare' || type === 'skirt') return;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  const upperRadius = leg.upperMesh.geometry.parameters.radiusTop;
  const lowerRadius = leg.lowerMesh.geometry.parameters.radiusTop;

  const upperSleeve = new THREE.Mesh(new THREE.CylinderGeometry(upperRadius * 1.15, upperRadius * 1.08, leg.upperLen * 0.8, 8), mat);
  upperSleeve.position.y = -leg.upperLen * 0.42;
  leg.group.add(upperSleeve);

  if (type === 'pants' || type === 'joggers') {
    const coverage = type === 'joggers' ? 0.72 : 0.96;
    const lowerSleeve = new THREE.Mesh(new THREE.CylinderGeometry(lowerRadius * 1.15, lowerRadius * 1.0, leg.lowerLen * coverage, 8), mat);
    lowerSleeve.position.y = -leg.lowerLen * coverage / 2;
    leg.bendGroup.add(lowerSleeve);
    if (type === 'joggers') {
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(lowerRadius * 0.85, lowerRadius * 0.85, leg.lowerLen * 0.1, 8), mat);
      cuff.position.y = -leg.lowerLen * coverage;
      leg.bendGroup.add(cuff);
    }
  }
}

function buildAccessory(type, color, torsoW, torsoH, headR) {
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
    case 'headphones': {
      const headY = torsoH / 2 + (headR || 0.26);
      const band = new THREE.Mesh(new THREE.TorusGeometry((headR || 0.26) * 0.95, (headR || 0.26) * 0.08, 6, 12, Math.PI), mat);
      band.rotation.z = Math.PI;
      band.position.set(0, headY + (headR || 0.26) * 0.8, 0);
      g.add(band);
      const cupGeo = new THREE.SphereGeometry((headR || 0.26) * 0.32, 8, 8);
      [-1, 1].forEach(side => {
        const cup = new THREE.Mesh(cupGeo, mat);
        cup.position.set(side * (headR || 0.26) * 0.95, headY, 0);
        cup.scale.set(0.7, 1, 1);
        g.add(cup);
      });
      break;
    }
  }
  return g;
}

function buildHandCover(type, color, radius) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55 });
  switch (type) {
    case 'bare': return null;
    case 'boxing': {
      const g = new THREE.Group();
      const m = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.35, 10, 8), mat);
      m.scale.set(1, 0.85, 1.15);
      g.add(m);
      return g;
    }
    case 'claws': {
      const g = new THREE.Group();
      const palm = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.85, 8, 8), mat);
      g.add(palm);
      for (let i = -1; i <= 1; i++) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.16, radius * 0.9, 6), new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.3 }));
        claw.position.set(i * radius * 0.35, -radius * 0.3, radius * 0.6);
        claw.rotation.x = -Math.PI / 2.3;
        g.add(claw);
      }
      return g;
    }
    case 'fingerless': {
      const g = new THREE.Group();
      const m = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.0, 8, 8), mat);
      m.scale.set(1, 0.8, 1);
      g.add(m);
      return g;
    }
    case 'gauntlets': {
      const g = new THREE.Group();
      const fist = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.15, 8, 8), mat);
      g.add(fist);
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.1, radius * 0.9, radius * 1.2, 8), mat);
      cuff.position.y = radius * 1.1;
      g.add(cuff);
      return g;
    }
    default: { // gloves, wraps
      return new THREE.Mesh(new THREE.SphereGeometry(radius * 0.95, 8, 8), mat);
    }
  }
}

function buildFootCover(type, color, radius) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
  const g = new THREE.Group();
  if (type === 'bare') return g;
  const base = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.6, radius * 0.9, radius * 2.4), mat);
  base.position.z = radius * 0.7;
  g.add(base);
  if (type === 'hightops') {
    const ankle = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.75, radius * 0.85, radius * 1.6, 8), mat);
    ankle.position.set(0, radius * 0.9, radius * 0.1);
    g.add(ankle);
  } else if (type === 'cleats') {
    for (let i = -1; i <= 1; i++) {
      const stud = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.1, radius * 0.22, 6), mat);
      stud.position.set(i * radius * 0.5, -radius * 0.5, radius * 1.4);
      g.add(stud);
    }
  } else if (type === 'sandals') {
    base.scale.set(1, 0.4, 1);
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

    const { skinTone, hair, gear, build: bld, proportions: prop, gender, face } = fighter.appearance;
    const heightMul = (bld && bld.height) || 1;
    const widthMul = (bld && bld.width) || 1;
    const p = prop || {};
    const chestMul = p.chest || 1, stomachMul = p.stomach || 1;
    const bicepMul = p.bicep || 1, forearmMul = p.forearm || 1;
    const thighMul = p.thigh || 1, calfMul = p.calf || 1;
    const base = GENDER_BASE[gender] || GENDER_BASE.male;

    materials.skin.color.set(skinTone);
    materials.skinShade.color.set(shadeHex(skinTone, -24));
    materials.hair.color.set(hair.color);
    materials.body.color.set(gear.body.color);
    materials.hands.color.set(gear.hands.color);
    materials.feet.color.set(gear.feet.color);

    const legLen = 1.0 * heightMul, torsoH = 0.85 * heightMul, armLen = 0.78 * heightMul;
    const headR = 0.26 * (0.9 + widthMul * 0.1) * base.headR;
    const torsoW = 0.62 * widthMul * base.shoulderW, torsoD = 0.34 * widthMul;
    const hipSpread = torsoW * base.hipW * 0.5;
    const limbR = 0.1 * widthMul * base.limbR;

    hips.position.y = legLen;
    torsoPivot.position.y = torsoH / 2;

    // torso split into stomach (lower) + chest (upper) so they can be
    // sized independently
    const stomachH = torsoH * 0.42, chestH = torsoH * 0.58;
    const stomachW = torsoW * stomachMul * 0.92, stomachD = torsoD * stomachMul;
    const chestW = torsoW * chestMul, chestD = torsoD * chestMul * 0.92;

    const stomachMesh = new THREE.Mesh(new THREE.BoxGeometry(stomachW, stomachH, stomachD), materials.body);
    stomachMesh.position.y = -torsoH / 2 + stomachH / 2;
    stomachMesh.castShadow = true;
    torsoPivot.add(stomachMesh);

    torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(chestW, chestH, chestD), materials.body);
    torsoMesh.position.y = -torsoH / 2 + stomachH + chestH / 2;
    torsoMesh.castShadow = true;
    torsoPivot.add(torsoMesh);

    const detail = buildBodyDetail(gear.body.type, gear.body.color, torsoW, torsoH, torsoD);
    torsoPivot.add(detail);

    const accessory = buildAccessory(gear.accessory.type, gear.accessory.color, torsoW, torsoH, headR);
    torsoPivot.add(accessory);

    headPivot = new THREE.Group();
    headPivot.position.y = torsoH / 2 + headR + 0.02;
    torsoPivot.add(headPivot);

    headMesh = new THREE.Mesh(new THREE.SphereGeometry(headR, 14, 12), materials.skin);
    headMesh.castShadow = true;
    headPivot.add(headMesh);

    hairMesh = buildHair((hair && hair.style) || 'short', hair.color, headR);
    headPivot.add(hairMesh);

    const headGear = buildHeadGear(gear.head.type, gear.head.color, headR);
    headPivot.add(headGear);

    const faceGroup = buildFace(face, headR);
    headPivot.add(faceGroup);

    // arms
    const armL = makeLimbGroup(armLen, limbR * 0.75 * bicepMul, limbR * 0.75 * 0.85 * forearmMul, materials.skin, 1);
    armL.group.position.set(-(torsoW / 2 + 0.02), torsoH / 2 - 0.05, 0);
    torsoPivot.add(armL.group);
    const handL = buildHandCover(gear.hands.type, gear.hands.color, limbR * (gear.hands.type === 'gauntlets' ? 1.15 : 0.95));
    if (handL) armL.tip.add(handL);
    armGroupL = armL.group;

    const armR = makeLimbGroup(armLen, limbR * 0.75 * bicepMul, limbR * 0.75 * 0.85 * forearmMul, materials.skinShade, -1);
    armR.group.position.set(torsoW / 2 + 0.02, torsoH / 2 - 0.05, 0);
    torsoPivot.add(armR.group);
    const handR = buildHandCover(gear.hands.type, gear.hands.color, limbR * (gear.hands.type === 'gauntlets' ? 1.15 : 0.95));
    if (handR) armR.tip.add(handR);
    armGroupR = armR.group;

    // legs
    const legwear = gear.legwear || { type: 'pants', color: '#2b2a3a' };

    const legL = makeLimbGroup(legLen, limbR * thighMul, limbR * 0.82 * calfMul, materials.skin, 1);
    legL.group.position.set(-hipSpread, 0, 0);
    hips.add(legL.group);
    legL.tip.add(buildFootCover(gear.feet.type, gear.feet.color, limbR));
    attachLegSleeve(legwear.type, legwear.color, legL);
    legGroupL = legL.group;

    const legR = makeLimbGroup(legLen, limbR * thighMul, limbR * 0.82 * calfMul, materials.skinShade, -1);
    legR.group.position.set(hipSpread, 0, 0);
    hips.add(legR.group);
    legR.tip.add(buildFootCover(gear.feet.type, gear.feet.color, limbR));
    attachLegSleeve(legwear.type, legwear.color, legR);
    legGroupR = legR.group;

    if (legwear.type === 'skirt') {
      const skirt = buildSkirt(legwear.color, torsoW, legLen * 0.55);
      hips.add(skirt);
    }

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
