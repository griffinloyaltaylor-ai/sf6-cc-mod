# Custom Fighter Arena

An original browser-based 2-player fighting game with a full character
creator: pick a premade fighting style or mix-and-match individual attacks,
customize gear/colors, and save as many fighters as you like to a roster you
can edit, duplicate, or delete. Then take them into local same-screen Versus
mode.

This is an original game (own art, own characters, own move data) — it does
not use or depend on Street Fighter 6 or any Capcom assets.

## Running it

No build step, no dependencies, no server required — just double-click
`index.html` (or open it via your browser's File > Open) and play.

If you'd rather serve it (e.g. for testing on another device on your
network), any static file server works, for example `python3 -m http.server
8080` or `npx serve .`, then visit the printed URL. This is optional.

## Features

- **Fighter Creator** — choose a premade fighting style (Rushdown, Grappler,
  Zoner, Brawler, Technical) as a starting point, then override any
  individual move (light/heavy punch/kick, 2 specials, 1 super) from the
  full move pool. Customize gear (head/body/hands/feet/accessory + colors),
  skin tone, and hair color. Adjust stat sliders (health/speed/power/defense).
- **Roster** — fighters are saved to the browser's local storage. Create,
  edit, duplicate, or delete any fighter from the roster screen.
- **Versus Mode** — pick any two saved fighters (including a mirror match)
  for a local, same-screen 2-player fight. Best of 3 rounds.

## Controls (shared keyboard, local versus)

| Action | Player 1 | Player 2 |
|---|---|---|
| Move | A / D | Left / Right |
| Jump | W | Up |
| Block | S (hold) | Down (hold) |
| Light Punch | J | 1 |
| Heavy Punch | K | 2 |
| Light Kick | U | 3 |
| Heavy Kick | I | 4 |
| Special 1 | H | 5 |
| Special 2 | Y | 6 |
| Super (needs full meter) | T | 7 |

## Project structure

```
index.html          Screens: menu, roster, creator, versus select, fight
css/style.css        All styling
js/data/moves.js      The move pool (normals, specials, supers)
js/data/styles.js     Premade fighting style presets
js/storage.js         Roster persistence (localStorage CRUD)
js/render.js           Procedural canvas rendering of fighters + gear
js/creator.js          Fighter Creator screen logic
js/roster.js            Roster grid + versus-select grid rendering
js/game.js              Fight engine: input, physics, hit detection, rounds
js/main.js              Screen navigation / app bootstrap
```
