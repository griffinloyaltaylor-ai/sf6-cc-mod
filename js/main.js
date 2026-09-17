let currentScreen = 'menu';
let vsSelection = { p1: null, p2: null, arena: ARENA_LIST[0].id };

function showScreen(name) {
  if (currentScreen === 'creator' && name !== 'creator') stopPreviewLoop();
  if (currentScreen === 'fight' && name !== 'fight') stopFight();

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  currentScreen = name;

  if (name === 'roster') refreshRoster();
  if (name === 'versus-select') refreshVersusSelect();
}

function refreshRoster() {
  const grid = document.getElementById('roster-grid');
  renderRosterEditGrid(grid, fighterId => {
    openCreator(fighterId, () => showScreen('roster'));
    showScreen('creator');
  });
}

function refreshVersusSelect() {
  const p1grid = document.getElementById('p1-select');
  const p2grid = document.getElementById('p2-select');
  renderVersusSelectGrid(p1grid, id => { vsSelection.p1 = id; refreshVersusSelect(); }, vsSelection.p1);
  renderVersusSelectGrid(p2grid, id => { vsSelection.p2 = id; refreshVersusSelect(); }, vsSelection.p2);

  const arenaList = document.getElementById('arena-list');
  arenaList.innerHTML = '';
  ARENA_LIST.forEach(arena => {
    const chip = document.createElement('div');
    chip.className = 'chip' + (vsSelection.arena === arena.id ? ' active' : '');
    chip.textContent = arena.name;
    chip.addEventListener('click', () => { vsSelection.arena = arena.id; refreshVersusSelect(); });
    arenaList.appendChild(chip);
  });

  const startBtn = document.getElementById('btn-start-fight');
  startBtn.disabled = !(vsSelection.p1 && vsSelection.p2);
}

function startFightFromSelection() {
  const f1 = getFighter(vsSelection.p1);
  const f2 = getFighter(vsSelection.p2);
  if (!f1 || !f2) return;
  showScreen('fight');
  const domEls = {
    canvas: document.getElementById('fight-canvas'),
    p1Name: document.getElementById('p1-name'),
    p2Name: document.getElementById('p2-name'),
    p1Mode: document.getElementById('p1-mode'),
    p2Mode: document.getElementById('p2-mode'),
    p1Health: document.getElementById('p1-health'),
    p2Health: document.getElementById('p2-health'),
    p1Meter: document.getElementById('p1-meter'),
    p2Meter: document.getElementById('p2-meter'),
    p1Wins: document.getElementById('p1-wins'),
    p2Wins: document.getElementById('p2-wins'),
    timer: document.getElementById('round-timer'),
    message: document.getElementById('fight-message'),
    rematchBtn: document.getElementById('btn-fight-rematch'),
  };
  initFight(f1, f2, domEls, vsSelection.arena);
}

function bindNav() {
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.nav;
      if (target === 'creator') {
        openCreator(null, () => showScreen('roster'));
      }
      showScreen(target);
    });
  });

  document.getElementById('btn-how-to-play').addEventListener('click', () => {
    document.getElementById('howto-modal').classList.remove('hidden');
  });
  document.getElementById('btn-close-howto').addEventListener('click', () => {
    document.getElementById('howto-modal').classList.add('hidden');
  });

  document.getElementById('btn-start-fight').addEventListener('click', startFightFromSelection);

  document.getElementById('btn-fight-rematch').addEventListener('click', () => {
    document.getElementById('btn-fight-rematch').classList.add('hidden');
    rematch();
  });
  document.getElementById('btn-fight-quit').addEventListener('click', () => {
    showScreen('menu');
  });
}

bindNav();
showScreen('menu');
