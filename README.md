# Commit Village 🏘️

A voxel village where Git & GitHub come to life. Every command is something you watch happen:
parchments on the workbench (edits) get packed (`git add`), sealed into crates (`git commit`),
carted over the bridge to the Town Hall (`git push`), reviewed at the Petition Hall (PRs),
checked by the mill pipeline (CI) and shipped from the harbour (deploy).

## Play
- **Story mode**: 9 short guided chapters (tour → commit → push → pull → branch → PR → failing CI → fix → merge & deploy)
- **Sandbox**: every command unlocked, including a teammate (Alice) to cause rejected pushes

Controls: drag to orbit, right-drag or WASD to pan, scroll to zoom, click buildings to inspect them, and press `/` to type real git commands.

## Run locally
No build step. Three.js is vendored in `lib/`.
```bash
python -m http.server 5173
```
Then open http://localhost:5173 (add `?speed=3` to fast-forward animations).

## Structure
| File | What |
|---|---|
| `js/voxel.js` | Voxel mesher (face culling + ambient occlusion), noise, tweens, particles, sfx |
| `js/world.js` | Island terrain, river, roads, buildings, trees, villagers, ambient life |
| `js/git.js` | Mini Git model (commit DAG, refs, PR, CI) and the animated scene for each command |
| `js/ui.js` | Story chapters, terminal parser, HUD, labels |
| `js/main.js` | Renderer, day/night sky, camera, main loop |
| `docs/DESIGN.md` | The analogy map, UX flow and world layout |
