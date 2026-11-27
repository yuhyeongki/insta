import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';

export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  studentNumber: string;
  role: 'student' | 'teacher';
  bio: string;
  avatarUrl: string;
  avatarTint: string;
}

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  idToken: string | null;
  loading: boolean;
  authError: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  getAuthHeaders: () => Promise<Record<string, string>>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const syncProfileWithToken = useCallback(async (token: string) => {
    const res = await fetch('/api/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || '프로필 동기화에 실패했습니다.');
    }
    const data = (await res.json()) as UserProfile;
    setProfile(data);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthError(null);
      if (user) {
        try {
          const token = await user.getIdToken();
          setIdToken(token);
          await syncProfileWithToken(token);
        } catch (err) {
          console.error('Auth sync error:', err);
          setAuthError(
            err instanceof Error ? err.message : '로그인 연동 중 오류가 발생했습니다.'
          );
        }
      } else {
        setIdToken(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [syncProfileWithToken]);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    if (!auth.currentUser) return {};
    const freshToken = await auth.currentUser.getIdToken();
    setIdToken(freshToken);
    return { Authorization: `Bearer ${freshToken}` };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) return;
    const token = await auth.currentUser.getIdToken();
    setIdToken(token);
    await syncProfileWithToken(token);
  }, [syncProfileWithToken]);

  const signIn = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Google 로그인에 실패했습니다.';
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError(msg);
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setProfile(null);
    setIdToken(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        idToken,
        loading,
        authError,
        signIn,
        signOut,
        refreshProfile,
        getAuthHeaders,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
