// Premade fighting styles: a starting point (default moveset + stat spread).
// Selecting a style just pre-fills the creator; every move can still be
// individually overridden afterwards ("mix and match").

export const STYLES = {
  rushdown: {
    id: 'rushdown',
    name: 'Rushdown',
    desc: 'Fast, aggressive, low health. Wins by never letting go.',
    stats: { health: 85, speed: 95, power: 65, defense: 55 },
    moves: {
      lightPunch: 'lp_snap', heavyPunch: 'hp_cross', lightKick: 'lk_snap', heavyKick: 'hk_spin',
      special1: 'sp_dash', special2: 'sp_spin', super: 'su_barrage',
    },
  },
  grappler: {
    id: 'grappler',
    name: 'Grappler',
    desc: 'Slow but devastating up close. High health, huge damage.',
    stats: { health: 115, speed: 55, power: 95, defense: 80 },
    moves: {
      lightPunch: 'lp_elbow', heavyPunch: 'hp_haymaker', lightKick: 'lk_knee', heavyKick: 'hk_axe',
      special1: 'sp_grab', special2: 'sp_slam', super: 'su_annihilate',
    },
  },
  zoner: {
    id: 'zoner',
    name: 'Zoner',
    desc: 'Keeps distance and controls space with projectiles.',
    stats: { health: 80, speed: 70, power: 60, defense: 60 },
    moves: {
      lightPunch: 'lp_jab', heavyPunch: 'hp_palm', lightKick: 'lk_low', heavyKick: 'hk_round',
      special1: 'sp_fireball', special2: 'sp_teleport', super: 'su_ultra_wave',
    },
  },
  brawler: {
    id: 'brawler',
    name: 'Brawler',
    desc: 'Well-rounded, no glaring weaknesses. Great for beginners.',
    stats: { health: 100, speed: 75, power: 75, defense: 75 },
    moves: {
      lightPunch: 'lp_jab', heavyPunch: 'hp_cross', lightKick: 'lk_snap', heavyKick: 'hk_round',
      special1: 'sp_dragon', special2: 'sp_dash', super: 'su_barrage',
    },
  },
  technical: {
    id: 'technical',
    name: 'Technical',
    desc: 'Rewards precision: counters, anti-airs, and punishes.',
    stats: { health: 90, speed: 80, power: 70, defense: 70 },
    moves: {
      lightPunch: 'lp_hook', heavyPunch: 'hp_uppercut', lightKick: 'lk_axe', heavyKick: 'hk_sweep',
      special1: 'sp_counter', special2: 'sp_dragon', super: 'su_final_dragon',
    },
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    desc: 'Build entirely from scratch, no preset defaults.',
    stats: { health: 90, speed: 75, power: 75, defense: 75 },
    moves: {
      lightPunch: 'lp_jab', heavyPunch: 'hp_cross', lightKick: 'lk_snap', heavyKick: 'hk_round',
      special1: 'sp_fireball', special2: 'sp_dash', super: 'su_barrage',
    },
  },
};

export const STYLE_LIST = Object.values(STYLES);
