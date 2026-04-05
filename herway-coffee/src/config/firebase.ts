import { initializeApp, getApps, getApp } from 'firebase/app';
// The metro.config.js sets "react-native" as a resolver condition so that
// firebase/auth resolves to the RN bundle which exports getReactNativePersistence.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — getReactNativePersistence is only exported by the RN bundle
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Firebase client-side config is intentionally bundled in React Native apps; security
// is enforced via Firestore Security Rules, not by hiding these values.
// Override individual values via app.json "extra" or a .env file at build time.
const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

const firebaseConfig = {
  apiKey: extra.FIREBASE_API_KEY ?? 'AIzaSyBUjwAUwivvlbpFDZl_ZwXGtZ-eesA6we4',
  authDomain: extra.FIREBASE_AUTH_DOMAIN ?? 'harway-sales.firebaseapp.com',
  projectId: extra.FIREBASE_PROJECT_ID ?? 'harway-sales',
  storageBucket: extra.FIREBASE_STORAGE_BUCKET ?? 'harway-sales.firebasestorage.app',
  messagingSenderId: extra.FIREBASE_MESSAGING_SENDER_ID ?? '363362566547',
  appId: extra.FIREBASE_APP_ID ?? '1:363362566547:web:2726ece2bd931a2e5aa866',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize auth with AsyncStorage persistence (React Native bundle provides
// getReactNativePersistence; fall back to getAuth if bundle doesn't have it).
function createAuth() {
  if (typeof getReactNativePersistence === 'function') {
    try {
      return initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch {
      // Auth already initialized — return existing instance
      return getAuth(app);
    }
  }
  return getAuth(app);
}

export const auth = createAuth();

// Initialize Firestore with long-polling for React Native environments
function createFirestore() {
  try {
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch {
    // Firestore already initialized — return existing instance
    return getFirestore(app);
  }
}

export const db = createFirestore();

export const storage = getStorage(app);

export default app;
