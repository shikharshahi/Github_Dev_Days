# Github Village — Firebase React starter

Github Village is a browser Minecraft-inspired low-poly Three.js world that teaches clone, status, branch, switch, add, commit, push, pull, pull request, review, merge, and GitHub Actions through simple game analogies. It includes a React + TypeScript + Vite frontend with Firebase Hosting and Python Cloud Functions.

## Local development

1. Install Node.js 20+ and Python 3.11+.
2. Copy `.env.example` to `.env.local` and replace every placeholder with the Firebase Web App configuration from the Firebase console.
3. Install dependencies and start the frontend:

   ```bash
   npm install
   npm run dev
   ```

The callable `healthCheck` button requires Firebase Functions to be deployed or the Firebase emulators to be running. To use emulators, install Python dependencies in `functions` and run `firebase emulators:start`.

The game itself runs entirely in the browser and does not require an account.

## Game controls

Click the world to focus it, then use **WASD** or the arrow keys to move. Drag to orbit the follow camera, scroll to zoom, and press **E** near a labeled station to open its learning panel. The on-screen directional buttons provide an accessible keyboard-free fallback. Movement shortcuts ignore focused buttons, links, and text fields.

## Firebase project setup and deployment

The Firebase project is `github-learning-game`, with the Github Village Hosting site at `https://github-village.web.app`. The original default site at `https://github-learning-game.web.app` is preserved. The remaining Web App values in `.env.local` must come from the Firebase console; do not commit credentials or private keys.

```bash
firebase login
firebase use github-learning-game
npm run build
firebase deploy --only hosting:village
firebase deploy --only functions
```

Deploy Firestore rules separately when needed:

```bash
firebase deploy --only firestore
```

`firebase --version` should report an installed Firebase CLI. Deployment must be run only after replacing the placeholder project ID and confirming the Firebase CLI is logged in:

```bash
npm run build
firebase deploy --only hosting,functions,firestore
```

Github Village Hosting is deployed. Python Functions require the Blaze (pay-as-you-go) plan because Firebase must enable Artifact Registry and Cloud Build; after upgrading the project, run `firebase deploy --only functions`.

## Firebase configuration

The browser SDK reads `VITE_FIREBASE_*` variables at build time. Firebase Hosting serves the generated `dist` directory, while the Python functions in `functions/main.py` expose `healthCheck` (callable) and `health` (HTTP). Keep `.env.local` out of version control; only `.env.example` belongs in the repository.
