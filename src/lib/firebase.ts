import { getApp, getApps, initializeApp } from 'firebase/app'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'placeholder-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'placeholder.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'your-firebase-project-id',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'your-firebase-project-id.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:000000000000:web:placeholder',
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

export const functions = getFunctions(app)
