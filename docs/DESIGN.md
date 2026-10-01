# Commit Village — Design Plan

A voxel diorama village where every part of the Git / GitHub workflow is a real place,
and every command is something you *watch happen*: crates get packed, sealed, carted
over the bridge, inspected by the mill, and shipped out of the harbour.

---

## 1. Visual reference (real villages → voxel rules)

Reference cues taken from real European villages (Cotswolds, Alsace, Bavarian and
Normandy hamlets, Dutch polder windmills, Cornish harbours):

| Real-world cue | How it shows up in the voxels |
|---|---|
| Timber-framed houses (dark oak beams, cream plaster) | Plaster walls with dark posts at the corners, a beam at each floor line, and diagonal braces |
| Steep tile / slate / thatch roofs with overhangs | Stepped gable roofs that overhang the walls by one voxel, with darker ridge tiles, in terracotta, slate or thatch |
| Stone foundations & chimneys | A grey cobble plinth with noise-jittered stone colours, chimneys that puff smoke |
| Warm windows at dusk | Windows are emissive voxels, blue-grey by day and amber at night |
| Village green with well, market stalls | A central plaza with a stone well, awning stalls, barrels and crates |
| Arched stone bridges over a slow river | Arched stone bridges with parapets, and an animated river that flows into the sea |
| Patchwork fields, hay bales, fences | Wheat strips, crop rows, fences, hay bales and sheep |
| Windmill on the rise | A turning windmill as the "Actions Mill" that starts the CI pipeline |
| Harbour with wooden pier & sailing ship | A deploy harbour: wooden pier, lighthouse, a ship that sails away on deploy |
| Mixed woodland (oak, pine, birch) | Three tree species, clustered by noise, plus bushes and wildflowers |
| Golden-hour light, long shadows | A day/night cycle (starts at golden hour) with soft shadows, fog, stars and fireflies |

---

## 2. The analogy (the heart of the game)

| Village place / event | Git / GitHub concept | Why it fits |
|---|---|---|
| **Your Workshop** | Working directory | Where you craft and change things freely. Nothing is recorded yet |
| Parchments on the workbench | Modified / untracked files | Work in progress lying around |
| **Packing Shed** | Staging area (index) | You choose which goods go into the next crate |
| `git add` | Packing goods into a crate | Selecting, not yet sealed |
| **Archive Cellar** | Local repository (`.git`) | Sealed crates are kept safely at *your* home |
| `git commit` | Sealing + labelling a crate with a wax seal (hash) | Permanent snapshot with a message |
| **The River** | The network / internet | Separates your village from the town |
| **Stone Bridge** | The connection to `origin` | Every push and pull crosses it |
| **Town Hall** | GitHub (the remote, `origin`) | The shared place everyone trusts |
| **Granary** | Remote branches (`origin/main`) | Where the shared crates are stored |
| `git push` | Horse cart carries your sealed crates to the Granary | Upload commits |
| `git fetch` | A messenger pigeon brings news of new crates | Download info, don't change your work |
| `git pull` | Cart brings the new crates home and stacks them | fetch + merge |
| Rejected push | The cart is turned back at the gate | Remote has commits you don't have yet |
| **Alice's Cottage** | A teammate's clone | Others push to the same Town Hall |
| **Feature Road** (a forked lane) | A branch | A side road that leaves `main` and rejoins later |
| `git switch -c` | Raising a signpost at a new fork | Creating and moving onto a branch |
| **Petition Hall** | Pull Request | You ask the town to accept your road |
| Reviewer stamps the petition | Code review / approval | A second pair of eyes |
| **Actions Mill → Lint Inspector → Test Watchtower → Build Forge** | CI pipeline (GitHub Actions) | An assembly line every crate must pass |
| Red lamp + bell | A failed check | Must fix, commit, and push again |
| Roads joining at the Granary | Merge | The feature road flows into main |
| **Harbour + ship** | CD / deploy to production | The ship carries the finished goods to the world |
| Fireworks | A successful release | 🎉 |

---

## 3. UX flow

```
Title screen ─┬─► Story Mode (9 chapters, guided)
              └─► Sandbox (all commands, free play)

Each chapter:
  1. Camera flies to the place in question (the beacon arrow appears above it)
  2. Mission card: "In the village…" (the analogy) + "In Git…" (the real command)
  3. The player acts in one of three ways:
       a) click an action button          (fast)
       b) click the building → info card → action
       c) type the real git command in the terminal   (builds muscle memory)
  4. A cinematic animation plays (villager walks, cart drives, pigeon flies)
  5. Status panel updates (branch, working, staged, ahead/behind, PR, CI)
  6. A checklist ticks → next chapter, with a progress bar
```

Chapters:
1. **Welcome**: a guided flyover of the four districts (Local · River · Town · Pipeline)
2. **Craft**: `edit` files in the Workshop
3. **Stage**: `git add .` at the Packing Shed
4. **Commit**: `git commit -m` in the Archive
5. **Push**: the cart crosses the bridge to the Town Hall
6. **Teammates**: Alice pushes → you `git fetch` → you `git pull`
7. **Branch**: `git switch -c feature/lanterns` → craft, add, commit on the new road
8. **Pull Request & CI**: push, open the PR, the mill pipeline runs, a **test fails**, you fix it and push again, the checks go green
9. **Review, Merge & Deploy**: request a review, Alice approves, you merge, the ship sails and the fireworks go off

Always available: the Codex (the full analogy table), the hint button, a building
inspector, labels on/off, a day/night slider, camera fly-to, and reset.

---

## 4. World layout (top view, +x east, +z south)

```
            N
   [Feature Hut]~~~~bridge2~~~~[Petition Hall]   [Lint]──[Test Tower]
        |              ║            |          /              |
 [Workshop] ─ Plaza ─ bridge ─ [Town Hall]─[Actions Mill]  [Build Forge]
 [Shed] [Archive]      ║       [Granary]                       |
   [Home]   fields   river      [Alice]   fields           [Harbour ⛵]
            S
```

## 5. Tech

- Three.js r149, vendored under `lib/`. No build step, works offline. Open `index.html`
- Custom voxel mesher: hidden-face culling, per-vertex ambient occlusion, per-voxel colour
  jitter, and a separate emissive layer for windows and lanterns
- A promise-based tween / choreography system (`await walk(); await cart()`)
- A small Git model: commits DAG, local/remote/tracking refs, fast-forward checks,
  merge commits, PR + CI state
