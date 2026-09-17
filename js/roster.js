function buildCard(fighter) {
  const card = document.createElement('div');
  card.className = 'fighter-card';
  card.dataset.id = fighter.id;

  const canvas = document.createElement('canvas');
  canvas.width = 140; canvas.height = 170;
  const ctx = canvas.getContext('2d');
  drawFighter(ctx, fighter, canvas.width / 2, canvas.height - 10, { scale: 0.9, facing: 1, poseName: 'idle', t: 0 });

  const name = document.createElement('div');
  name.className = 'fname';
  name.textContent = fighter.name;

  const styleName = document.createElement('div');
  styleName.className = 'fstyle';
  styleName.textContent = STYLES[fighter.styleId] ? STYLES[fighter.styleId].name : 'Custom';

  card.appendChild(canvas);
  card.appendChild(name);
  card.appendChild(styleName);
  return card;
}

function renderRosterEditGrid(container, onPick) {
  container.innerHTML = '';
  const roster = getRoster();
  if (roster.length === 0) {
    const note = document.createElement('div');
    note.className = 'empty-note';
    note.textContent = 'No fighters yet. Create one to get started!';
    container.appendChild(note);
    return;
  }
  roster.forEach(fighter => {
    const card = buildCard(fighter);
    card.addEventListener('click', () => onPick(fighter.id));
    container.appendChild(card);
  });
}

function renderVersusSelectGrid(container, onPick, selectedId) {
  container.innerHTML = '';
  const roster = getRoster();
  if (roster.length === 0) {
    const note = document.createElement('div');
    note.className = 'empty-note';
    note.textContent = 'No fighters yet.';
    container.appendChild(note);
    return;
  }
  roster.forEach(fighter => {
    const card = buildCard(fighter);
    if (fighter.id === selectedId) card.classList.add('selected');
    card.addEventListener('click', () => onPick(fighter.id));
    container.appendChild(card);
  });
}
