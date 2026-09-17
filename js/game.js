const STAGE_LEFT = 60, STAGE_RIGHT = 900, FLOOR_Y = 330;
const GRAVITY = 0.9, JUMP_V = -14.5;
const ROUND_SECONDS = 99;
const WINS_NEEDED = 2;

const KEYS = {
  p1: { left: 'a', right: 'd', up: 'w', down: 's', lightPunch: 'j', heavyPunch: 'k', lightKick: 'u', heavyKick: 'i', special1: 'h', special2: 'y', super: 't' },
  p2: { left: 'arrowleft', right: 'arrowright', up: 'arrowup', down: 'arrowdown', lightPunch: '1', heavyPunch: '2', lightKick: '3', heavyKick: '4', special1: '5', special2: '6', super: '7' },
};
const ATTACK_SLOTS = ['lightPunch', 'heavyPunch', 'lightKick', 'heavyKick', 'special1', 'special2', 'super'];

// Standard gamepad layout. Face buttons mirror a common fighting-game
// pad scheme: X/Y = light/heavy punch, A/B = light/heavy kick, LB/RB =
// specials, RT = super. Left stick or D-pad moves/jumps/blocks.
const PAD_BUTTON_MAP = {
  lightPunch: 2, heavyPunch: 3, lightKick: 0, heavyKick: 1, special1: 4, special2: 5, super: 7,
};
const PAD_DEADZONE = 0.4;
const EMPTY_PAD_INPUT = { left: false, right: false, up: false, down: false, lightPunch: false, heavyPunch: false, lightKick: false, heavyKick: false, special1: false, special2: false, super: false };

let ctx, canvas;
let els = {};
let p1, p2;
let keysDown = new Set();
let rafId = null;
let timerFrames = ROUND_SECONDS * 60;
let roundActive = false;
let matchWins = { p1: 0, p2: 0 };
let animT = 0;
let onMatchEnd = null;
let keydownHandler, keyupHandler;
let prevPad2Input = EMPTY_PAD_INPUT;
let p2UsingPad = false;

function maxHealthFor(fighter) {
  return Math.round(fighter.stats.health * 3);
}

function createPlayer(fighter, x, facing) {
  return {
    fighter, x, y: 0, vy: 0, facing,
    state: 'idle', // idle, walk, jump, block, attack, hitstun, ko
    grounded: true,
    health: maxHealthFor(fighter),
    maxHealth: maxHealthFor(fighter),
    meter: 0,
    attack: null,
    hitstunTimer: 0,
  };
}

function initFight(fighter1, fighter2, domEls, matchEndCallback) {
  els = domEls;
  onMatchEnd = matchEndCallback;
  canvas = els.canvas;
  ctx = canvas.getContext('2d');
  matchWins = { p1: 0, p2: 0 };
  els.p1Name.textContent = fighter1.name;
  els.p2Name.textContent = fighter2.name;
  els.p1Wins.textContent = '0';
  els.p2Wins.textContent = '0';
  els.rematchBtn.classList.add('hidden');
  els.message.textContent = '';
  if (els.p1Mode) els.p1Mode.textContent = 'Keyboard';
  p2UsingPad = !!readActiveGamepad();
  if (els.p2Mode) els.p2Mode.textContent = p2UsingPad ? 'Controller' : 'Keyboard';

  setupRound(fighter1, fighter2);

  keydownHandler = e => {
    const k = e.key.toLowerCase();
    keysDown.add(k);
    if (!roundActive) return;
    tryAttack(p1, k, KEYS.p1);
    tryAttack(p2, k, KEYS.p2);
  };
  keyupHandler = e => keysDown.delete(e.key.toLowerCase());
  window.addEventListener('keydown', keydownHandler);
  window.addEventListener('keyup', keyupHandler);

  prevPad2Input = EMPTY_PAD_INPUT;
  startLoop();
}

function stopFight() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  if (keydownHandler) window.removeEventListener('keydown', keydownHandler);
  if (keyupHandler) window.removeEventListener('keyup', keyupHandler);
  keysDown.clear();
}

function readActiveGamepad() {
  if (typeof navigator.getGamepads !== 'function') return null;
  const pads = navigator.getGamepads();
  for (const pad of pads) { if (pad && pad.connected) return pad; }
  return null;
}

function readPadInput(pad) {
  if (!pad) return EMPTY_PAD_INPUT;
  const axX = pad.axes[0] || 0;
  const axY = pad.axes[1] || 0;
  const btn = i => { const b = pad.buttons[i]; return !!b && (b.pressed || b.value > 0.5); };
  return {
    left: axX < -PAD_DEADZONE || btn(14),
    right: axX > PAD_DEADZONE || btn(15),
    up: axY < -PAD_DEADZONE || btn(12),
    down: axY > PAD_DEADZONE || btn(13),
    lightPunch: btn(PAD_BUTTON_MAP.lightPunch),
    heavyPunch: btn(PAD_BUTTON_MAP.heavyPunch),
    lightKick: btn(PAD_BUTTON_MAP.lightKick),
    heavyKick: btn(PAD_BUTTON_MAP.heavyKick),
    special1: btn(PAD_BUTTON_MAP.special1),
    special2: btn(PAD_BUTTON_MAP.special2),
    super: btn(PAD_BUTTON_MAP.super),
  };
}

function rematch() {
  setupRound(p1.fighter, p2.fighter);
  matchWins = { p1: 0, p2: 0 };
  els.p1Wins.textContent = '0';
  els.p2Wins.textContent = '0';
  els.rematchBtn.classList.add('hidden');
  els.message.textContent = '';
  startLoop();
}

function setupRound(f1, f2) {
  p1 = createPlayer(f1, 260, 1);
  p2 = createPlayer(f2, 700, -1);
  timerFrames = ROUND_SECONDS * 60;
  roundActive = true;
  els.message.textContent = '';
}

function startAttackForSlot(player, slot) {
  if (player.state === 'attack' || player.state === 'hitstun' || player.state === 'ko') return;
  const moveId = player.fighter.moves[slot];
  const move = MOVES[moveId];
  if (!move) return;
  if (slot === 'super' && player.meter < 100) return;
  player.attack = { move, slot, phase: 'startup', timer: move.startup, hitApplied: false };
  player.state = 'attack';
}

function tryAttack(player, key, map) {
  for (const slot of ATTACK_SLOTS) {
    if (map[slot] === key) { startAttackForSlot(player, slot); return; }
  }
}

function tryAttackFromPad(player, padInput, prevPadInput) {
  for (const slot of ATTACK_SLOTS) {
    if (padInput[slot] && !prevPadInput[slot]) startAttackForSlot(player, slot);
  }
}

function startLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  function frame() {
    animT += 2;
    update();
    render();
    rafId = requestAnimationFrame(frame);
  }
  frame();
}

function isDown(player, map, padInput) { return keysDown.has(map.down) || (padInput && padInput.down); }

function updatePlayerMovement(player, other, map, padInput) {
  const canAct = player.state !== 'attack' && player.state !== 'hitstun' && player.state !== 'ko';
  // auto-face opponent unless mid-action
  if (canAct) player.facing = other.x >= player.x ? 1 : -1;

  if (!canAct) {
    // still apply gravity/physics below
  } else if (isDown(player, map, padInput) && player.grounded) {
    player.state = 'block';
  } else {
    const left = keysDown.has(map.left) || (padInput && padInput.left);
    const right = keysDown.has(map.right) || (padInput && padInput.right);
    if (!player.grounded) {
      player.state = 'jump';
    } else if (left || right) {
      const speed = 2.6 * (player.fighter.stats.speed / 75);
      player.x += (left ? -speed : speed);
      player.state = 'walk';
    } else {
      player.state = 'idle';
    }
    if ((keysDown.has(map.up) || (padInput && padInput.up)) && player.grounded) {
      player.vy = JUMP_V;
      player.grounded = false;
      player.state = 'jump';
    }
  }

  // gravity
  player.vy += GRAVITY;
  player.y += player.vy;
  if (player.y >= 0) { player.y = 0; player.vy = 0; player.grounded = true; }

  player.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, player.x));
}

function separatePlayers() {
  const minDist = 46;
  const d = p2.x - p1.x;
  if (Math.abs(d) < minDist) {
    const push = (minDist - Math.abs(d)) / 2;
    const sign = d >= 0 ? 1 : -1;
    p1.x -= push * sign;
    p2.x += push * sign;
    p1.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, p1.x));
    p2.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, p2.x));
  }
}

function updateAttack(player, other) {
  if (player.state !== 'attack' || !player.attack) return;
  const atk = player.attack;
  atk.timer--;
  if (atk.timer <= 0) {
    if (atk.phase === 'startup') { atk.phase = 'active'; atk.timer = atk.move.active; }
    else if (atk.phase === 'active') { atk.phase = 'recovery'; atk.timer = atk.move.recovery; }
    else {
      if (atk.slot === 'super') player.meter = 0;
      player.attack = null;
      player.state = 'idle';
      return;
    }
  }
  if (atk.phase === 'active' && !atk.hitApplied) {
    resolveHit(player, other, atk);
  }
}

function resolveHit(attacker, defender, atk) {
  const dist = Math.abs(defender.x - attacker.x);
  const facingCorrect = (attacker.facing === 1 && defender.x >= attacker.x) || (attacker.facing === -1 && defender.x <= attacker.x);
  if (dist > atk.move.range || !facingCorrect) return;
  if (defender.state === 'ko') return;

  atk.hitApplied = true;
  const move = atk.move;
  const blocking = defender.state === 'block' && !move.unblockable;
  const powerScale = attacker.fighter.stats.power / 75;

  let damage, knock, defMeter;
  if (blocking) {
    damage = Math.max(1, Math.round(move.damage * 0.15 * powerScale));
    knock = move.knockback * 0.3;
    defender.hitstunTimer = 8;
    defMeter = Math.floor(move.meterGain * 0.3);
  } else {
    damage = Math.round(move.damage * powerScale);
    knock = move.knockback;
    defender.state = 'hitstun';
    defender.hitstunTimer = 16 + Math.round(move.knockback * 0.5);
    defMeter = Math.floor(move.meterGain * 0.5);
  }

  defender.health = Math.max(0, defender.health - damage);
  attacker.meter = Math.min(100, attacker.meter + (move.meterGain || 0));
  defender.meter = Math.min(100, defender.meter + defMeter);

  const pushSign = defender.x >= attacker.x ? 1 : -1;
  defender.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, defender.x + pushSign * knock));

  if (defender.health <= 0) {
    defender.state = 'ko';
    endRound(attacker === p1 ? 'p1' : 'p2');
  }
}

function updateHitstun(player) {
  if (player.state === 'hitstun' || player.state === 'block') {
    if (player.hitstunTimer > 0) {
      player.hitstunTimer--;
      if (player.hitstunTimer <= 0 && player.state === 'hitstun') player.state = 'idle';
    }
  }
}

function update() {
  if (!roundActive) return;

  const pad = readActiveGamepad();
  const pad2Input = readPadInput(pad);
  if (!!pad !== p2UsingPad) {
    p2UsingPad = !!pad;
    if (els.p2Mode) els.p2Mode.textContent = p2UsingPad ? 'Controller' : 'Keyboard';
  }

  updatePlayerMovement(p1, p2, KEYS.p1, null);
  updatePlayerMovement(p2, p1, KEYS.p2, pad2Input);
  tryAttackFromPad(p2, pad2Input, prevPad2Input);
  prevPad2Input = pad2Input;
  separatePlayers();
  updateAttack(p1, p2);
  updateAttack(p2, p1);
  updateHitstun(p1);
  updateHitstun(p2);

  // block state needs continuous down-hold to persist; drop to idle if released and no hitstun timer
  if (p1.state === 'block' && !isDown(p1, KEYS.p1, null) && p1.hitstunTimer <= 0) p1.state = 'idle';
  if (p2.state === 'block' && !isDown(p2, KEYS.p2, pad2Input) && p2.hitstunTimer <= 0) p2.state = 'idle';

  timerFrames--;
  const secs = Math.max(0, Math.ceil(timerFrames / 60));
  els.timer.textContent = String(secs);
  if (timerFrames <= 0) {
    roundActive = false;
    if (p1.health === p2.health) endRound(null);
    else endRound(p1.health > p2.health ? 'p1' : 'p2');
  }

  els.p1Health.style.width = (p1.health / p1.maxHealth * 100) + '%';
  els.p2Health.style.width = (p2.health / p2.maxHealth * 100) + '%';
  els.p1Meter.style.width = p1.meter + '%';
  els.p2Meter.style.width = p2.meter + '%';
}

function endRound(winnerKey) {
  roundActive = false;
  if (winnerKey) {
    matchWins[winnerKey]++;
    els[winnerKey === 'p1' ? 'p1Wins' : 'p2Wins'].textContent = String(matchWins[winnerKey]);
    const winnerName = winnerKey === 'p1' ? p1.fighter.name : p2.fighter.name;
    els.message.textContent = `${winnerName.toUpperCase()} WINS THE ROUND!`;
  } else {
    els.message.textContent = `DRAW!`;
  }

  if (matchWins.p1 >= WINS_NEEDED || matchWins.p2 >= WINS_NEEDED) {
    const champ = matchWins.p1 >= WINS_NEEDED ? p1.fighter.name : p2.fighter.name;
    setTimeout(() => {
      els.message.textContent = `${champ.toUpperCase()} WINS THE MATCH!`;
      els.rematchBtn.classList.remove('hidden');
    }, 1200);
  } else {
    setTimeout(() => {
      setupRound(p1.fighter, p2.fighter);
    }, 1600);
  }
}

function poseFor(player) {
  if (player.state === 'ko') return 'ko';
  if (player.state === 'hitstun') return 'hitstun';
  if (player.state === 'block') return 'block';
  if (player.state === 'attack' && player.attack) {
    if (player.attack.slot === 'lightPunch' || player.attack.slot === 'heavyPunch') return 'punch';
    if (player.attack.slot === 'lightKick' || player.attack.slot === 'heavyKick') return 'kick';
    return 'special';
  }
  if (player.state === 'jump') return 'jump';
  if (player.state === 'walk') return 'walk';
  return 'idle';
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // floor line
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.moveTo(0, FLOOR_Y + 2);
  ctx.lineTo(canvas.width, FLOOR_Y + 2);
  ctx.stroke();

  [p1, p2].forEach(pl => {
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.ellipse(pl.x, FLOOR_Y + 6, 26, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawFighter(ctx, pl.fighter, pl.x, FLOOR_Y + pl.y, { scale: 1.15, facing: pl.facing, poseName: poseFor(pl), t: animT });
  });
}
