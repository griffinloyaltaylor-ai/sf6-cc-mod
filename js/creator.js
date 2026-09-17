let current = null;
let isNew = true;
let previewT = 0;
let previewRafId = null;
let previewScene = null;
let previewDirty = true;

function markPreviewDirty() { previewDirty = true; }

const GEAR_LABELS = { head: 'Head', body: 'Body', hands: 'Hands', feet: 'Feet', accessory: 'Accessory' };
const STAT_LABELS = { health: 'Health', speed: 'Speed', power: 'Power', defense: 'Defense' };

function openCreator(fighterId, onLeave) {
  if (fighterId) {
    const found = getFighter(fighterId);
    current = found ? JSON.parse(JSON.stringify(found)) : defaultFighter();
    isNew = !found;
  } else {
    current = defaultFighter();
    isNew = true;
  }
  if (!current.appearance.build) current.appearance.build = { height: 1, width: 1 };
  document.getElementById('creator-heading').textContent = isNew ? 'Create New Fighter' : 'Edit Fighter';
  document.getElementById('btn-duplicate-fighter').disabled = isNew;
  document.getElementById('btn-delete-fighter').disabled = isNew;
  previewDirty = true;
  renderAll();
  startPreviewLoop();
  bindOnce();
  if (typeof onLeave === 'function') leaveCallback = onLeave;
}

let leaveCallback = null;

function startPreviewLoop() {
  stopPreviewLoop();
  if (!previewScene) {
    const canvas = document.getElementById('preview-canvas');
    previewScene = createPreviewScene(canvas);
  }
  function frame() {
    previewT += 2;
    if (previewDirty) {
      previewScene.rig.build(current);
      previewDirty = false;
    }
    previewScene.rig.root.rotation.y = 0.5 + Math.sin(previewT / 400) * 0.5;
    previewScene.rig.setPose('idle', previewT);
    previewScene.render();
    previewRafId = requestAnimationFrame(frame);
  }
  frame();
}

function stopPreviewLoop() {
  if (previewRafId) cancelAnimationFrame(previewRafId);
  previewRafId = null;
}

function renderAll() {
  document.getElementById('fighter-name').value = current.name;
  renderStyleChips();
  renderStats();
  renderBuild();
  renderGear();
  renderMoves();
}

const BUILD_LABELS = { height: 'Height', width: 'Build' };
const BUILD_RANGE = { height: { min: 0.85, max: 1.18 }, width: { min: 0.8, max: 1.3 } };

function renderBuild() {
  const el = document.getElementById('build-sliders');
  el.innerHTML = '';
  Object.keys(BUILD_LABELS).forEach(key => {
    const row = document.createElement('div');
    row.className = 'stat-row';
    const label = document.createElement('label');
    label.textContent = BUILD_LABELS[key];
    const bgWrap = document.createElement('div');
    bgWrap.className = 'stat-bar-bg';
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(BUILD_RANGE[key].min);
    input.max = String(BUILD_RANGE[key].max);
    input.step = '0.01';
    input.value = String(current.appearance.build[key]);
    input.style.width = '100%';
    const valSpan = document.createElement('span');
    valSpan.className = 'stat-val';
    valSpan.textContent = Math.round(current.appearance.build[key] * 100) + '%';
    input.addEventListener('input', () => {
      current.appearance.build[key] = Number(input.value);
      valSpan.textContent = Math.round(input.value * 100) + '%';
      markPreviewDirty();
    });
    bgWrap.appendChild(input);
    row.appendChild(label);
    row.appendChild(bgWrap);
    row.appendChild(valSpan);
    el.appendChild(row);
  });
}

function renderStyleChips() {
  const el = document.getElementById('style-list');
  el.innerHTML = '';
  STYLE_LIST.forEach(style => {
    const chip = document.createElement('div');
    chip.className = 'chip' + (current.styleId === style.id ? ' active' : '');
    chip.textContent = style.name;
    chip.title = style.desc;
    chip.addEventListener('click', () => {
      current.styleId = style.id;
      current.stats = { ...style.stats };
      current.moves = { ...style.moves };
      markPreviewDirty();
      renderAll();
    });
    el.appendChild(chip);
  });
}

function renderStats() {
  const el = document.getElementById('stats-bars');
  el.innerHTML = '';
  Object.keys(STAT_LABELS).forEach(key => {
    const row = document.createElement('div');
    row.className = 'stat-row';
    const label = document.createElement('label');
    label.textContent = STAT_LABELS[key];
    const bgWrap = document.createElement('div');
    bgWrap.className = 'stat-bar-bg';
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '40'; input.max = '120'; input.value = String(current.stats[key]);
    input.style.width = '100%';
    const valSpan = document.createElement('span');
    valSpan.className = 'stat-val';
    valSpan.textContent = current.stats[key];
    input.addEventListener('input', () => {
      current.stats[key] = Number(input.value);
      valSpan.textContent = input.value;
    });
    bgWrap.appendChild(input);
    row.appendChild(label);
    row.appendChild(bgWrap);
    row.appendChild(valSpan);
    el.appendChild(row);
  });
}

function renderGear() {
  const el = document.getElementById('gear-editor');
  el.innerHTML = '';
  Object.keys(GEAR_OPTIONS).forEach(slot => {
    const row = document.createElement('div');
    row.className = 'gear-row';

    const label = document.createElement('label');
    label.textContent = GEAR_LABELS[slot];

    const select = document.createElement('select');
    GEAR_OPTIONS[slot].forEach(opt => {
      const o = document.createElement('option');
      o.value = opt; o.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
      if (current.appearance.gear[slot].type === opt) o.selected = true;
      select.appendChild(o);
    });
    select.addEventListener('change', () => {
      current.appearance.gear[slot].type = select.value;
      markPreviewDirty();
    });

    const color = document.createElement('input');
    color.type = 'color';
    color.value = current.appearance.gear[slot].color;
    color.addEventListener('input', () => {
      current.appearance.gear[slot].color = color.value;
      markPreviewDirty();
    });

    row.appendChild(label);
    row.appendChild(select);
    row.appendChild(color);
    el.appendChild(row);
  });

  // Skin tone + hair color as extra rows
  const skinRow = document.createElement('div');
  skinRow.className = 'gear-row';
  skinRow.innerHTML = `<label>Skin Tone</label>`;
  const skinSelectPlaceholder = document.createElement('div');
  const skinColor = document.createElement('input');
  skinColor.type = 'color';
  skinColor.value = current.appearance.skinTone;
  skinColor.addEventListener('input', () => { current.appearance.skinTone = skinColor.value; markPreviewDirty(); });
  skinRow.appendChild(skinSelectPlaceholder);
  skinRow.appendChild(skinColor);
  el.appendChild(skinRow);

  const hairRow = document.createElement('div');
  hairRow.className = 'gear-row';
  hairRow.innerHTML = `<label>Hair</label>`;
  const hairPlaceholder = document.createElement('div');
  const hairColor = document.createElement('input');
  hairColor.type = 'color';
  hairColor.value = current.appearance.hair.color;
  hairColor.addEventListener('input', () => { current.appearance.hair.color = hairColor.value; markPreviewDirty(); });
  hairRow.appendChild(hairPlaceholder);
  hairRow.appendChild(hairColor);
  el.appendChild(hairRow);
}

function baseSlotFor(slot) {
  if (slot === 'special1' || slot === 'special2') return 'special';
  if (slot === 'super') return 'super';
  return slot;
}

function renderMoves() {
  const el = document.getElementById('move-editor');
  el.innerHTML = '';
  SLOTS.forEach(slot => {
    const wrap = document.createElement('div');
    wrap.className = 'move-slot';
    const label = document.createElement('label');
    label.textContent = SLOT_LABELS[slot];
    const select = document.createElement('select');
    movesForSlot(baseSlotFor(slot)).forEach(move => {
      const o = document.createElement('option');
      o.value = move.id; o.textContent = move.name;
      if (current.moves[slot] === move.id) o.selected = true;
      select.appendChild(o);
    });
    const desc = document.createElement('div');
    desc.className = 'move-desc';
    desc.textContent = MOVES[current.moves[slot]] ? MOVES[current.moves[slot]].desc : '';

    select.addEventListener('change', () => {
      current.moves[slot] = select.value;
      desc.textContent = MOVES[select.value].desc;
      current.styleId = 'custom'; // any manual override marks it custom
      renderStyleChips();
    });

    wrap.appendChild(label);
    wrap.appendChild(select);
    wrap.appendChild(desc);
    el.appendChild(wrap);
  });
}

let bound = false;
function bindOnce() {
  if (bound) return;
  bound = true;

  document.getElementById('fighter-name').addEventListener('input', e => {
    current.name = e.target.value || 'Unnamed Fighter';
  });

  document.getElementById('btn-save-fighter').addEventListener('click', () => {
    if (!current.name.trim()) current.name = 'Unnamed Fighter';
    saveFighter(current);
    isNew = false;
    document.getElementById('btn-duplicate-fighter').disabled = false;
    document.getElementById('btn-delete-fighter').disabled = false;
    document.getElementById('creator-heading').textContent = 'Edit Fighter';
    flashSaved();
  });

  document.getElementById('btn-duplicate-fighter').addEventListener('click', () => {
    if (isNew) return;
    const copy = duplicateFighter(current.id);
    if (copy) openCreator(copy.id, leaveCallback);
  });

  document.getElementById('btn-delete-fighter').addEventListener('click', () => {
    if (isNew) return;
    if (confirm(`Delete "${current.name}"? This can't be undone.`)) {
      deleteFighter(current.id);
      if (leaveCallback) leaveCallback();
    }
  });
}

function flashSaved() {
  const btn = document.getElementById('btn-save-fighter');
  const original = btn.textContent;
  btn.textContent = 'Saved!';
  setTimeout(() => { btn.textContent = original; }, 900);
}

function getCurrentFighter() {
  return current;
}
