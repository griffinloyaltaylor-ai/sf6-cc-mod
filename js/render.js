// Draws an original, simple layered humanoid fighter onto a canvas.
// No third-party art/sprites -- everything is procedural shapes so it's
// safe original content (not derived from any existing game's assets).

export const GEAR_OPTIONS = {
  head: ['none', 'helmet', 'mask', 'bandana', 'cap', 'hood'],
  body: ['gi', 'jacket', 'tanktop', 'armor', 'coat'],
  hands: ['bare', 'wraps', 'gloves', 'gauntlets'],
  feet: ['bare', 'boots', 'sneakers', 'sandals'],
  accessory: ['none', 'scarf', 'belt', 'cape', 'glasses'],
};

function pose(poseName, t) {
  // Returns joint angle offsets (radians) for a simple 2-segment-limb rig.
  const wobble = Math.sin(t / 180 * Math.PI);
  switch (poseName) {
    case 'walk':
      return { armL: 0.5 * wobble, armR: -0.5 * wobble, legL: 0.5 * wobble, legR: -0.5 * wobble, crouch: 0, lean: 0 };
    case 'jump':
      return { armL: -0.6, armR: -0.6, legL: 0.4, legR: -0.2, crouch: -8, lean: 0 };
    case 'crouch':
      return { armL: 0.2, armR: 0.2, legL: 0, legR: 0, crouch: 18, lean: 0 };
    case 'block':
      return { armL: -1.1, armR: -1.1, legL: 0.1, legR: -0.1, crouch: 4, lean: 0.05 };
    case 'punch':
      return { armL: -1.4, armR: 0.1, legL: 0.05, legR: -0.05, crouch: 0, lean: 0.15 };
    case 'kick':
      return { armL: 0.3, armR: -0.3, legL: -1.2, legR: 0.2, crouch: 0, lean: -0.1 };
    case 'special':
      return { armL: -1.0, armR: -1.0, legL: 0.15, legR: -0.15, crouch: 2, lean: 0.1 };
    case 'hitstun':
      return { armL: 0.9, armR: 0.9, legL: -0.2, legR: 0.3, crouch: 0, lean: -0.2 };
    case 'ko':
      return { armL: 1.4, armR: 1.4, legL: 1.0, legR: -1.0, crouch: 30, lean: 0.6 };
    default: // idle
      return { armL: 0.08 * wobble, armR: -0.08 * wobble, legL: 0, legR: 0, crouch: 0, lean: 0 };
  }
}

export function drawFighter(ctx, fighter, x, groundY, opts = {}) {
  const { scale = 1, facing = 1, poseName = 'idle', t = 0, tint = null } = opts;
  const { skinTone, hair, gear } = fighter.appearance;
  const p = pose(poseName, t);

  ctx.save();
  ctx.translate(x, groundY);
  ctx.scale(facing * scale, scale);

  const legLen = 60, torsoLen = 55, armLen = 45, headR = 16;
  const crouch = p.crouch;
  const hipY = -legLen + crouch;
  const shoulderY = hipY - torsoLen + crouch * 0.3;
  const headY = shoulderY - headR - 2;
  const lean = p.lean * 20;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // back leg
  drawLimb(ctx, 0, hipY, p.legR, legLen, 16, shade(skinTone, -20));
  // back arm
  drawLimb(ctx, lean * 0.3, shoulderY, p.armR, armLen, 11, shade(skinTone, -20));

  // torso
  ctx.fillStyle = tint || gear.body.color;
  roundRect(ctx, -14 + lean * 0.3, shoulderY, 28, torsoLen, 8);
  ctx.fill();
  drawBodyDetail(ctx, gear.body.type, -14 + lean * 0.3, shoulderY, 28, torsoLen, tint || gear.body.color);

  // front leg
  drawLimb(ctx, 0, hipY, p.legL, legLen, 16, skinTone);
  drawFeet(ctx, gear.feet, 0, hipY, p.legL, legLen);

  // front arm
  drawLimb(ctx, lean * 0.3, shoulderY, p.armL, armLen, 11, skinTone);
  drawHands(ctx, gear.hands, lean * 0.3, shoulderY, p.armL, armLen);

  // accessory (behind head layer for cape, belt already covered by torso)
  drawAccessory(ctx, gear.accessory, lean, hipY, shoulderY);

  // head
  ctx.fillStyle = skinTone;
  ctx.beginPath();
  ctx.arc(lean * 0.5, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // hair
  ctx.fillStyle = hair.color;
  ctx.beginPath();
  ctx.arc(lean * 0.5, headY - 3, headR - 1, Math.PI, Math.PI * 2);
  ctx.fill();

  drawHeadGear(ctx, gear.head, lean * 0.5, headY, headR);

  ctx.restore();
}

function drawLimb(ctx, originX, originY, angle, len, width, color) {
  const midLen = len * 0.5;
  const jointX = originX + Math.sin(angle) * midLen;
  const jointY = originY + Math.cos(angle) * midLen;
  const endAngle = angle * 1.3;
  const endX = jointX + Math.sin(endAngle) * midLen;
  const endY = jointY + Math.cos(endAngle) * midLen;

  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(jointX, jointY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  return { endX, endY };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function shade(hex, amt) {
  const n = parseInt(hex.replace('#', ''), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 0xff) + amt, b = (n & 0xff) + amt;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return `rgb(${r},${g},${b})`;
}

function drawBodyDetail(ctx, type, x, y, w, h, color) {
  ctx.strokeStyle = shade(colorOf(color), -40);
  ctx.lineWidth = 2;
  switch (type) {
    case 'jacket':
      ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.stroke();
      ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
      break;
    case 'armor':
      ctx.strokeRect(x + 3, y + 4, w - 6, h * 0.4);
      ctx.strokeRect(x + 3, y + h * 0.5, w - 6, h * 0.4);
      break;
    case 'coat':
      ctx.beginPath(); ctx.moveTo(x, y + h * 0.3); ctx.lineTo(x - 4, y + h); ctx.moveTo(x + w, y + h * 0.3); ctx.lineTo(x + w + 4, y + h); ctx.stroke();
      break;
    case 'tanktop':
      ctx.beginPath(); ctx.moveTo(x + 4, y); ctx.lineTo(x + 4, y + 6); ctx.moveTo(x + w - 4, y); ctx.lineTo(x + w - 4, y + 6); ctx.stroke();
      break;
    default: // gi
      ctx.beginPath(); ctx.moveTo(x + w * 0.3, y); ctx.lineTo(x + w * 0.7, y + h * 0.6); ctx.stroke();
  }
}
function colorOf(c) { return c.startsWith('#') ? c : '#888888'; }

function drawHands(ctx, hands, originX, shoulderY, angle, armLen) {
  if (hands.type === 'bare') return;
  const midLen = armLen * 0.5;
  const jointX = originX + Math.sin(angle) * midLen;
  const jointY = shoulderY + Math.cos(angle) * midLen;
  const endAngle = angle * 1.3;
  const endX = jointX + Math.sin(endAngle) * midLen;
  const endY = jointY + Math.cos(endAngle) * midLen;
  ctx.fillStyle = hands.color;
  const r = hands.type === 'gauntlets' ? 8 : 6;
  ctx.beginPath(); ctx.arc(endX, endY, r, 0, Math.PI * 2); ctx.fill();
}

function drawFeet(ctx, feet, originX, hipY, angle, legLen) {
  if (feet.type === 'bare') return;
  const midLen = legLen * 0.5;
  const jointX = originX + Math.sin(angle) * midLen;
  const jointY = hipY + Math.cos(angle) * midLen;
  const endAngle = angle * 1.3;
  const endX = jointX + Math.sin(endAngle) * midLen;
  const endY = jointY + Math.cos(endAngle) * midLen;
  ctx.fillStyle = feet.color;
  roundRect(ctx, endX - 8, endY - 4, 16, 9, 3);
  ctx.fill();
}

function drawAccessory(ctx, accessory, lean, hipY, shoulderY) {
  if (accessory.type === 'none') return;
  ctx.fillStyle = accessory.color;
  switch (accessory.type) {
    case 'belt':
      ctx.fillRect(-15 + lean * 0.3, hipY - 6, 30, 7);
      break;
    case 'scarf':
      ctx.beginPath(); ctx.ellipse(lean * 0.4, shoulderY + 2, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
      break;
    case 'cape':
      ctx.beginPath();
      ctx.moveTo(-13 + lean * 0.3, shoulderY + 2);
      ctx.lineTo(-20 + lean * 0.1, hipY + 30);
      ctx.lineTo(-2 + lean * 0.3, hipY + 5);
      ctx.closePath(); ctx.fill();
      break;
    case 'glasses':
      ctx.strokeStyle = accessory.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(lean * 0.5 - 10, shoulderY - 62, 8, 5);
      ctx.strokeRect(lean * 0.5 + 2, shoulderY - 62, 8, 5);
      break;
  }
}

function drawHeadGear(ctx, head, x, headY, headR) {
  if (head.type === 'none') return;
  ctx.fillStyle = head.color;
  switch (head.type) {
    case 'helmet':
      ctx.beginPath(); ctx.arc(x, headY, headR + 2, Math.PI, Math.PI * 2); ctx.fill();
      break;
    case 'mask':
      ctx.beginPath(); ctx.ellipse(x, headY + 4, headR - 2, headR - 8, 0, 0, Math.PI * 2); ctx.fill();
      break;
    case 'bandana':
      ctx.fillRect(x - headR, headY - 4, headR * 2, 6);
      break;
    case 'cap':
      ctx.beginPath(); ctx.arc(x, headY - 2, headR - 1, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillRect(x - 2, headY - headR + 2, headR + 6, 4);
      break;
    case 'hood':
      ctx.beginPath(); ctx.arc(x, headY - 1, headR + 4, Math.PI * 0.9, Math.PI * 2.1); ctx.fill();
      break;
  }
}
