const STAGE_LEFT = 60, STAGE_RIGHT = 900;
const GRAVITY = 0.9, JUMP_V = -14.5;
const ROUND_SECONDS = 99;
const WINS_NEEDED = 2;

// Maps the existing 2D fight-plane coordinates onto the 3D world (the
// gameplay logic below stays 2D -- x position + jump height -- only the
// rendering is 3D).
const STAGE_CENTER_X = (STAGE_LEFT + STAGE_RIGHT) / 2;
const WORLD_X_SCALE = 5 / ((STAGE_RIGHT - STAGE_LEFT) / 2);
const WORLD_Y_SCALE = 0.022;
function worldX(px) { return (px - STAGE_CENTER_X) * WORLD_X_SCALE; }
function worldY(py) { return -py * WORLD_Y_SCALE; }

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
const NO_KEYS = {}; // a key-map with nothing bound, so a CPU player ignores stray real key presses

// Difficulty just scales reaction speed and how often the CPU makes the
// "right" call (attacking in range, blocking an incoming hit) vs a mistake.
const CPU_PROFILES = {
  easy: { reactionFrames: 42, attackChance: 0.22, blockChance: 0.12, specialChance: 0.06, approachSpeedMul: 0.85 },
  medium: { reactionFrames: 22, attackChance: 0.42, blockChance: 0.38, specialChance: 0.16, approachSpeedMul: 1.0 },
  hard: { reactionFrames: 9, attackChance: 0.62, blockChance: 0.68, specialChance: 0.3, approachSpeedMul: 1.12 },
};
const CPU_NORMAL_SLOTS = ['lightPunch', 'heavyPunch', 'lightKick', 'heavyKick'];

let canvas;
let fightScene = null;
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
let p1CPUDifficulty = null, p2CPUDifficulty = null;

function maxHealthFor(fighter) {
  return Math.round(fighter.stats.health * 3);
}

function createPlayer(fighter, x, facing, cpuDifficulty) {
  return {
    fighter, x, y: 0, vy: 0, facing,
    state: 'idle', // idle, walk, jump, block, attack, hitstun, ko
    grounded: true,
    health: maxHealthFor(fighter),
    maxHealth: maxHealthFor(fighter),
    meter: 0,
    attack: null,
    hitstunTimer: 0,
    isCPU: !!cpuDifficulty,
    cpuDifficulty: cpuDifficulty || null,
    cpuTimer: 0,
    cpuInput: EMPTY_PAD_INPUT,
  };
}

// Produces a padInput-shaped object (same shape readPadInput returns) from
// simple distance/state rules, scaled by the difficulty profile. Feeding it
// through the same movement code path real input uses means no separate
// AI-specific movement logic has to be maintained. Attacks are fired
// directly (one-shot, right when decided) rather than represented as a
// held flag, since a held flag re-checked every frame against a "previous"
// snapshot of itself has a real edge case: two consecutive reaction ticks
// that happen to choose the same attack slot would look like one long
// held press and silently never re-trigger.
function computeCPUInput(player, other, fdt) {
  const profile = CPU_PROFILES[player.cpuDifficulty] || CPU_PROFILES.medium;
  player.cpuTimer -= fdt;
  if (player.cpuTimer > 0) return player.cpuInput;

  player.cpuTimer = profile.reactionFrames * (0.7 + Math.random() * 0.6);
  const dist = other.x - player.x;
  const absDist = Math.abs(dist);
  const dir = dist >= 0 ? 1 : -1;
  const next = { left: false, right: false, up: false, down: false };

  const opponentSwinging = other.state === 'attack' && other.attack && (other.attack.phase === 'startup' || other.attack.phase === 'active');
  const canAttack = player.state !== 'attack' && player.state !== 'hitstun' && player.state !== 'ko';
  // Ranges below must be contiguous (no gap between the "approach" and
  // "in range" cases) -- a gap there means the CPU can stall at a distance
  // where every branch is false and it just stands still forever.
  if (opponentSwinging && absDist < 95 && Math.random() < profile.blockChance) {
    next.down = true;
  } else if (absDist > 65) {
    if (dir > 0) next.right = true; else next.left = true;
  } else if (absDist < 32 && Math.random() < 0.3) {
    if (dir > 0) next.left = true; else next.right = true; // step back off
  } else if (canAttack && Math.random() < profile.attackChance) {
    let slot;
    if (player.meter >= 100 && Math.random() < profile.specialChance * 0.4) slot = 'super';
    else if (Math.random() < profile.specialChance) slot = Math.random() < 0.5 ? 'special1' : 'special2';
    else slot = CPU_NORMAL_SLOTS[Math.floor(Math.random() * CPU_NORMAL_SLOTS.length)];
    startAttackForSlot(player, slot);
  }
  if (player.grounded && absDist < 90 && Math.random() < 0.04) next.up = true;

  player.cpuInput = next;
  return next;
}

function initFight(fighter1, fighter2, domEls, arenaId, p1Difficulty, p2Difficulty, matchEndCallback) {
  els = domEls;
  onMatchEnd = matchEndCallback;
  canvas = els.canvas;
  p1CPUDifficulty = p1Difficulty || null;
  p2CPUDifficulty = p2Difficulty || null;
  if (!fightScene) fightScene = createFightScene(canvas);
  fightScene.setArena(arenaId || 'dojo');
  fightScene.rigP1.build(fighter1);
  fightScene.rigP2.build(fighter2);
  matchWins = { p1: 0, p2: 0 };
  els.p1Name.textContent = fighter1.name;
  els.p2Name.textContent = fighter2.name;
  els.p1Wins.textContent = '0';
  els.p2Wins.textContent = '0';
  els.rematchBtn.classList.add('hidden');
  els.message.textContent = '';
  if (els.p1Mode) els.p1Mode.textContent = p1CPUDifficulty ? 'CPU (' + p1CPUDifficulty + ')' : 'Keyboard';
  p2UsingPad = !!readActiveGamepad();
  if (els.p2Mode) els.p2Mode.textContent = p2CPUDifficulty ? 'CPU (' + p2CPUDifficulty + ')' : (p2UsingPad ? 'Controller' : 'Keyboard');

  setupRound(fighter1, fighter2);

  keydownHandler = e => {
    const k = e.key.toLowerCase();
    keysDown.add(k);
    if (!roundActive) return;
    if (!p1.isCPU) tryAttack(p1, k, KEYS.p1);
    if (!p2.isCPU) tryAttack(p2, k, KEYS.p2);
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
  p1 = createPlayer(f1, 260, 1, p1CPUDifficulty);
  p2 = createPlayer(f2, 700, -1, p2CPUDifficulty);
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

// All per-frame constants below (speed, gravity, timers) were tuned
// assuming a steady 60fps. `fdt` (frame-delta = elapsed-seconds * 60) lets
// the same tuning hold up when the actual frame rate differs -- important
// since the 3D scene is heavier to render than flat 2D was.
let lastFrameTime = 0;

function startLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  lastFrameTime = performance.now();
  function frame(now) {
    const dtSeconds = Math.min((now - lastFrameTime) / 1000, 1 / 20);
    lastFrameTime = now;
    const fdt = dtSeconds * 60;
    animT += 2 * fdt;
    update(fdt);
    render();
    rafId = requestAnimationFrame(frame);
  }
  rafId = requestAnimationFrame(frame);
}

function isDown(player, map, padInput) { return keysDown.has(map.down) || (padInput && padInput.down); }

function updatePlayerMovement(player, other, map, padInput, fdt) {
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
      const speed = 2.6 * (player.fighter.stats.speed / 75) * fdt;
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
  player.vy += GRAVITY * fdt;
  player.y += player.vy * fdt;
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

function updateAttack(player, other, fdt) {
  if (player.state !== 'attack' || !player.attack) return;
  const atk = player.attack;
  atk.timer -= fdt;
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

function updateHitstun(player, fdt) {
  if (player.state === 'hitstun' || player.state === 'block') {
    if (player.hitstunTimer > 0) {
      player.hitstunTimer -= fdt;
      if (player.hitstunTimer <= 0 && player.state === 'hitstun') player.state = 'idle';
    }
  }
}

function update(fdt) {
  if (!roundActive) return;

  let pad2Input = EMPTY_PAD_INPUT;
  if (!p2.isCPU) {
    const pad = readActiveGamepad();
    pad2Input = readPadInput(pad);
    if (!!pad !== p2UsingPad) {
      p2UsingPad = !!pad;
      if (els.p2Mode) els.p2Mode.textContent = p2UsingPad ? 'Controller' : 'Keyboard';
    }
  }

  const p1Input = p1.isCPU ? computeCPUInput(p1, p2, fdt) : null;
  const p2Input = p2.isCPU ? computeCPUInput(p2, p1, fdt) : pad2Input;
  const p1Map = p1.isCPU ? NO_KEYS : KEYS.p1;
  const p2Map = p2.isCPU ? NO_KEYS : KEYS.p2;

  updatePlayerMovement(p1, p2, p1Map, p1Input, fdt);
  updatePlayerMovement(p2, p1, p2Map, p2Input, fdt);
  // CPU attacks are fired directly inside computeCPUInput; only real pad
  // input needs the held-flag edge-detection here.
  if (!p2.isCPU) tryAttackFromPad(p2, pad2Input, prevPad2Input);
  prevPad2Input = pad2Input;
  separatePlayers();
  updateAttack(p1, p2, fdt);
  updateAttack(p2, p1, fdt);
  updateHitstun(p1, fdt);
  updateHitstun(p2, fdt);

  // block state needs continuous down-hold to persist; drop to idle if released and no hitstun timer
  if (p1.state === 'block' && !isDown(p1, p1Map, p1Input) && p1.hitstunTimer <= 0) p1.state = 'idle';
  if (p2.state === 'block' && !isDown(p2, p2Map, p2Input) && p2.hitstunTimer <= 0) p2.state = 'idle';

  timerFrames -= fdt;
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
  const w1x = worldX(p1.x), w2x = worldX(p2.x);
  fightScene.rigP1.setFacing(p1.facing);
  fightScene.rigP1.setWorldPosition(w1x, worldY(p1.y), 0);
  fightScene.rigP1.setPose(poseFor(p1), animT);
  fightScene.rigP2.setFacing(p2.facing);
  fightScene.rigP2.setWorldPosition(w2x, worldY(p2.y), 0);
  fightScene.rigP2.setPose(poseFor(p2), animT);
  fightScene.updateCamera(w1x, w2x);
  fightScene.render(animT / 60);
}
