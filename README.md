# [Play Github Village](https://github-village.web.app)

Github Village is a full-screen, first-person low-poly village that teaches the GitHub workflow through original procedural Three.js geometry. Explore enterable houses, follow the guided route, and learn each command through in-world props, signs, animated couriers, archivists, branch paths, review boards, merge gates, and CI robots.

## Controls

- **Click the game canvas** to capture the mouse.
- **Mouse movement** looks around while captured; press **Escape** to release it.
- **WASD** or **arrow keys** move relative to the camera.
- Press **E** at an aligned front doorway to enter a house, or inside to exit.
- On-screen directional buttons provide an accessible movement fallback. Controls do not capture gameplay keys while a button or form control is focused.

## Guided GitHub route

The active route progresses in this order:

**Clone → Local Repository/status → Branch/switch → Add/Stage → Commit → Push → Pull → Pull Request/Review → Merge → GitHub Actions**

Each building displays an in-world state marker: active, locked, or complete. Completed buildings remain revisitable. Commit House contains a checkpoint timeline and snapshot books; Merge Manor visualizes two branches joining through review into main; Actions Workshop shows a procedural CI pipeline.

## Local development

Requirements: Node.js 20+ and Python 3.11+.

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

The browser game does not require an account. The Python functions in `functions/` can be run with the Firebase emulators after installing `functions/requirements.txt`.

## Firebase Hosting deployment

The deployed site is **https://github-village.web.app**. It uses Firebase project `github-learning-game` and the `village` Hosting target. The original default Hosting site is preserved.

```bash
firebase login
firebase use github-learning-game
npm run build
firebase deploy --only hosting
```

Functions deployment requires the Firebase project’s Blaze plan because Cloud Functions needs Artifact Registry and Cloud Build:

```bash
firebase deploy --only functions
```

Do not commit `.env.local`, credentials, or private keys. `.env.example` contains the client configuration template.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/App.tsx` | First-person Three.js world, movement, pointer lock, progression, houses, and interiors |
| `src/App.css` | Full-screen game HUD, loading screen, and responsive controls |
| `src/lib/firebase.ts` | Firebase Web SDK initialization |
| `functions/main.py` | Python callable and HTTP health functions |
| `firebase.json` / `.firebaserc` | Hosting, Functions, Firestore, emulator, project, and target configuration |
| `public/favicon.svg` | Original Github Village SVG favicon |
