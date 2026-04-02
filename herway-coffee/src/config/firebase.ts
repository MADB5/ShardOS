import { initializeApp, getApps, getApp } from 'firebase/app';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — firebase/auth resolves to RN bundle at runtime, types use browser bundle
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBUjwAUwivvlbpFDZl_ZwXGtZ-eesA6we4',
  authDomain: 'harway-sales.firebaseapp.com',
  projectId: 'harway-sales',
  storageBucket: 'harway-sales.firebasestorage.app',
  messagingSenderId: '363362566547',
  appId: '1:363362566547:web:2726ece2bd931a2e5aa866',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export const storage = getStorage(app);

export default app;
