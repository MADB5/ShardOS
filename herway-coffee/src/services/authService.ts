import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { AppUser, UserRole } from '../types';

export async function signIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export async function getUserProfile(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid,
    email: data.email,
    role: data.role as UserRole,
    marketId: data.marketId,
    displayName: data.displayName,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
  };
}

export async function createUser(
  email: string,
  password: string,
  role: UserRole,
  marketId: string,
  displayName: string,
): Promise<AppUser> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = credential.user.uid;
  const profile: Omit<AppUser, 'createdAt'> & { createdAt: any } = {
    uid,
    email,
    role,
    marketId,
    displayName,
    createdAt: serverTimestamp(),
  };
  await setDoc(doc(db, 'users', uid), profile);
  return { ...profile, createdAt: new Date() };
}
