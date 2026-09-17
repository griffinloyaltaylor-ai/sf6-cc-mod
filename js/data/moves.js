// Move pool. Every move belongs to exactly one "slot" category.
// Normals: lightPunch, heavyPunch, lightKick, heavyKick (4 options each)
// Specials: tagged 'special' (assignable to special1 or special2)
// Supers: tagged 'super' (assignable to the super slot)
//
// Frame data is in game-ticks (60/sec), range/knockback in game units.

const MOVES = {

  // ---- Light Punch ----
  lp_jab:      { id:'lp_jab',      slot:'lightPunch', name:'Jab',            damage:4,  startup:3, active:3, recovery:6,  range:46, knockback:3,  meterGain:3, desc:'Fast, safe poke.' },
  lp_snap:     { id:'lp_snap',     slot:'lightPunch', name:'Snap Jab',       damage:3,  startup:2, active:2, recovery:5,  range:40, knockback:2,  meterGain:2, desc:'Lightning fast, low damage.' },
  lp_hook:     { id:'lp_hook',     slot:'lightPunch', name:'Short Hook',     damage:5,  startup:4, active:3, recovery:7,  range:50, knockback:4,  meterGain:3, desc:'Slightly slower, more reach.' },
  lp_elbow:    { id:'lp_elbow',    slot:'lightPunch', name:'Elbow Smash',    damage:5,  startup:3, active:4, recovery:8,  range:38, knockback:5,  meterGain:3, desc:'Close range, solid knockback.' },

  // ---- Heavy Punch ----
  hp_cross:    { id:'hp_cross',    slot:'heavyPunch', name:'Cross',          damage:11, startup:8, active:4, recovery:14, range:58, knockback:9,  meterGain:6, desc:'Balanced heavy strike.' },
  hp_haymaker: { id:'hp_haymaker', slot:'heavyPunch', name:'Haymaker',       damage:15, startup:12,active:4, recovery:18, range:52, knockback:13, meterGain:8, desc:'Huge damage, slow and risky.' },
  hp_uppercut: { id:'hp_uppercut', slot:'heavyPunch', name:'Rising Uppercut',damage:12, startup:9, active:5, recovery:15, range:44, knockback:14, meterGain:7, desc:'Launches the opponent up.' },
  hp_palm:     { id:'hp_palm',     slot:'heavyPunch', name:'Palm Thrust',    damage:10, startup:7, active:4, recovery:12, range:60, knockback:10, meterGain:6, desc:'Long reach heavy poke.' },

  // ---- Light Kick ----
  lk_snap:     { id:'lk_snap',     slot:'lightKick',  name:'Snap Kick',      damage:4,  startup:3, active:3, recovery:6,  range:52, knockback:3,  meterGain:3, desc:'Quick, decent range.' },
  lk_low:      { id:'lk_low',      slot:'lightKick',  name:'Low Kick',       damage:4,  startup:4, active:3, recovery:7,  range:48, knockback:2,  meterGain:3, desc:'Low profile poke.' },
  lk_knee:     { id:'lk_knee',     slot:'lightKick',  name:'Knee Strike',    damage:5,  startup:3, active:3, recovery:6,  range:36, knockback:5,  meterGain:3, desc:'Close range, punishes whiffs.' },
  lk_axe:      { id:'lk_axe',      slot:'lightKick',  name:'Light Axe Kick', damage:5,  startup:5, active:3, recovery:8,  range:44, knockback:4,  meterGain:3, desc:'Slight overhead angle.' },

  // ---- Heavy Kick ----
  hk_round:    { id:'hk_round',    slot:'heavyKick',  name:'Roundhouse',     damage:13, startup:10,active:5, recovery:16, range:64, knockback:12, meterGain:7, desc:'Great range, sweeping arc.' },
  hk_sweep:    { id:'hk_sweep',    slot:'heavyKick',  name:'Sweep',          damage:9,  startup:8, active:5, recovery:14, range:56, knockback:6,  meterGain:6, desc:'Low hitting, knocks down.' },
  hk_axe:      { id:'hk_axe',      slot:'heavyKick',  name:'Heavy Axe Kick', damage:14, startup:13,active:4, recovery:17, range:46, knockback:11, meterGain:7, desc:'Overhead, breaks blocks low.' },
  hk_spin:     { id:'hk_spin',     slot:'heavyKick',  name:'Spin Kick',      damage:12, startup:9, active:6, recovery:15, range:58, knockback:13, meterGain:7, desc:'Wide hitbox, hits both sides.' },

  // ---- Specials ----
  sp_fireball:   { id:'sp_fireball',   slot:'special', name:'Energy Wave',    damage:9,  startup:14, active:20, recovery:18, range:999, knockback:6,  meterGain:8,  meterCost:0, projectile:true, desc:'Full-screen projectile.' },
  sp_dragon:     { id:'sp_dragon',     slot:'special', name:'Rising Dragon',  damage:14, startup:6,  active:6,  recovery:22, range:40,  knockback:16, meterGain:9,  meterCost:0, invuln:true, desc:'Anti-air, invincible startup.' },
  sp_dash:       { id:'sp_dash',       slot:'special', name:'Charge Rush',    damage:12, startup:8,  active:6,  recovery:14, range:120, knockback:10, meterGain:8,  meterCost:0, dashIn:true, desc:'Closes distance fast.' },
  sp_grab:       { id:'sp_grab',       slot:'special', name:'Command Grab',   damage:16, startup:10, active:3,  recovery:20, range:34,  knockback:8,  meterGain:10, meterCost:0, unblockable:true, desc:'Cannot be blocked.' },
  sp_counter:    { id:'sp_counter',    slot:'special', name:'Counter Stance', damage:13, startup:5,  active:14, recovery:20, range:50,  knockback:12, meterGain:8,  meterCost:0, counter:true, desc:'Punishes an incoming attack.' },
  sp_teleport:   { id:'sp_teleport',   slot:'special', name:'Flash Step',     damage:8,  startup:10, active:6,  recovery:16, range:150, knockback:6,  meterGain:6,  meterCost:0, dashIn:true, desc:'Repositions then strikes.' },
  sp_spin:       { id:'sp_spin',       slot:'special', name:'Whirlwind Strike',damage:11, startup:9, active:8,  recovery:16, range:70,  knockback:11, meterGain:8,  meterCost:0, desc:'Hits multiple times.' },
  sp_slam:       { id:'sp_slam',       slot:'special', name:'Ground Slam',    damage:15, startup:12, active:5,  recovery:20, range:45,  knockback:15, meterGain:9,  meterCost:0, desc:'Heavy single hit, big knockback.' },

  // ---- Supers (require full meter) ----
  su_ultra_wave:  { id:'su_ultra_wave',  slot:'super', name:'Ultra Wave Cannon', damage:32, startup:16, active:18, recovery:26, range:999, knockback:20, meterCost:100, desc:'Massive full-screen beam.' },
  su_final_dragon:{ id:'su_final_dragon',slot:'super', name:'Final Ascension',   damage:36, startup:8,  active:10, recovery:24, range:50,  knockback:24, meterCost:100, invuln:true, desc:'Invincible anti-air super.' },
  su_barrage:     { id:'su_barrage',     slot:'super', name:'Relentless Barrage',damage:40, startup:10, active:24, recovery:22, range:60,  knockback:22, meterCost:100, desc:'Long multi-hit combo finisher.' },
  su_annihilate:  { id:'su_annihilate',  slot:'super', name:'Annihilate',        damage:44, startup:14, active:6,  recovery:26, range:38,  knockback:26, meterCost:100, unblockable:true, desc:'Unblockable grab-super, huge damage.' },
};

function movesForSlot(slot) {
  return Object.values(MOVES).filter(m => m.slot === slot);
}

const SLOTS = ['lightPunch', 'heavyPunch', 'lightKick', 'heavyKick', 'special1', 'special2', 'super'];

const SLOT_LABELS = {
  lightPunch: 'Light Punch',
  heavyPunch: 'Heavy Punch',
  lightKick: 'Light Kick',
  heavyKick: 'Heavy Kick',
  special1: 'Special 1',
  special2: 'Special 2',
  super: 'Super',
};
