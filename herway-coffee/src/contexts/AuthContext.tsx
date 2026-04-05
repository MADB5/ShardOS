import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { AppUser } from '../types';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  isOnline: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isOnline: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? '',
              role: data.role,
              marketId: data.marketId,
              displayName: data.displayName,
              createdAt: data.createdAt?.toDate?.() ?? new Date(),
            });
          } else {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? '',
              role: 'sales',
              marketId: '',
              displayName: firebaseUser.displayName ?? firebaseUser.email ?? '',
              createdAt: new Date(),
            });
          }
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isOnline }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
