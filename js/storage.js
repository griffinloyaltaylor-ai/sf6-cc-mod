const KEY = 'cfa_roster_v1';

function uid() {
  return 'f_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function defaultFighter() {
  return {
    id: uid(),
    name: 'New Fighter',
    styleId: 'custom',
    appearance: {
      skinTone: '#e0ac69',
      hair: { style: 'short', color: '#2b2013' },
      gear: {
        head: { type: 'none', color: '#cc3333' },
        body: { type: 'gi', color: '#3355cc' },
        hands: { type: 'wraps', color: '#dddddd' },
        feet: { type: 'boots', color: '#333333' },
        accessory: { type: 'none', color: '#e0c030' },
      },
    },
    stats: { health: 90, speed: 75, power: 75, defense: 75 },
    moves: {
      lightPunch: 'lp_jab', heavyPunch: 'hp_cross', lightKick: 'lk_snap', heavyKick: 'hk_round',
      special1: 'sp_fireball', special2: 'sp_dash', super: 'su_barrage',
    },
  };
}

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Roster storage corrupted, resetting.', e);
    return [];
  }
}

function writeAll(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function getRoster() {
  return readAll();
}

export function getFighter(id) {
  return readAll().find(f => f.id === id) || null;
}

export function saveFighter(fighter) {
  const list = readAll();
  const idx = list.findIndex(f => f.id === fighter.id);
  if (idx >= 0) list[idx] = fighter;
  else list.push(fighter);
  writeAll(list);
  return fighter;
}

export function deleteFighter(id) {
  const list = readAll().filter(f => f.id !== id);
  writeAll(list);
}

export function duplicateFighter(id) {
  const original = getFighter(id);
  if (!original) return null;
  const copy = JSON.parse(JSON.stringify(original));
  copy.id = uid();
  copy.name = original.name + ' Copy';
  saveFighter(copy);
  return copy;
}
