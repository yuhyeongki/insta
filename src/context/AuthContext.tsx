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
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { isSupabaseAuthEnabled, supabase } from '../lib/supabase.ts';
import { syncCurrentUserProfile } from '../services/classroomApi.ts';

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
  isAuthenticated: boolean;
  authProviderMode: 'supabase' | 'firebase';
  profile: UserProfile | null;
  idToken: string | null;
  loading: boolean;
  authError: string | null;
  loginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  getAuthHeaders: () => Promise<Record<string, string>>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const authProviderMode: 'supabase' | 'firebase' = isSupabaseAuthEnabled
    ? 'supabase'
    : 'firebase';

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    if (isSupabaseAuthEnabled && supabase) {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return {};
      setIdToken(token);
      return { Authorization: `Bearer ${token}` };
    }

    if (!auth.currentUser) return {};
    const freshToken = await auth.currentUser.getIdToken();
    setIdToken(freshToken);
    return { Authorization: `Bearer ${freshToken}` };
  }, []);

  useEffect(() => {
    if (isSupabaseAuthEnabled && supabase) {
      let mounted = true;

      const handleSupabaseSession = async (
        session: {
          access_token?: string;
          user?: {
            id: string;
            email?: string;
            user_metadata?: Record<string, unknown>;
          };
        } | null
      ) => {
        if (!mounted) return;
        setAuthError(null);
        if (session?.access_token && session.user) {
          setIsAuthenticated(true);
          setIdToken(session.access_token);
          setLoginModalOpen(false);
          try {
            const meta = session.user.user_metadata || {};
            const synced = await syncCurrentUserProfile({
              uid: session.user.id,
              email: session.user.email || '',
              name:
                typeof meta.full_name === 'string'
                  ? meta.full_name
                  : typeof meta.name === 'string'
                    ? meta.name
                    : undefined,
              picture:
                typeof meta.avatar_url === 'string'
                  ? meta.avatar_url
                  : undefined,
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (mounted) setProfile(synced);
          } catch (err) {
            if (mounted) {
              setAuthError(
                err instanceof Error ? err.message : '프로필 연동 실패'
              );
            }
          }
        } else {
          setIsAuthenticated(false);
          setIdToken(null);
          setProfile(null);
        }
        if (mounted) setLoading(false);
      };

      supabase.auth.getSession().then(({ data }) => {
        handleSupabaseSession(data.session);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        handleSupabaseSession(session);
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthError(null);
      if (user) {
        setIsAuthenticated(true);
        setLoginModalOpen(false);
        try {
          const token = await user.getIdToken();
          setIdToken(token);
          const synced = await syncCurrentUserProfile({
            uid: user.uid,
            email: user.email || '',
            name: user.displayName || undefined,
            picture: user.photoURL || undefined,
            headers: { Authorization: `Bearer ${token}` },
          });
          setProfile(synced);
        } catch (err) {
          console.error('Auth sync error:', err);
          setAuthError(
            err instanceof Error
              ? err.message
              : '로그인 연동 중 오류가 발생했습니다.'
          );
        }
      } else {
        setIsAuthenticated(false);
        setIdToken(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (isSupabaseAuthEnabled && supabase) {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session?.user) return;
      const meta = session.user.user_metadata || {};
      const synced = await syncCurrentUserProfile({
        uid: session.user.id,
        email: session.user.email || '',
        name:
          typeof meta.full_name === 'string' ? meta.full_name : undefined,
        picture:
          typeof meta.avatar_url === 'string' ? meta.avatar_url : undefined,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setProfile(synced);
      return;
    }

    if (!auth.currentUser) return;
    const token = await auth.currentUser.getIdToken();
    const synced = await syncCurrentUserProfile({
      uid: auth.currentUser.uid,
      email: auth.currentUser.email || '',
      headers: { Authorization: `Bearer ${token}` },
    });
    setProfile(synced);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    if (isSupabaseAuthEnabled && supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) setAuthError(error.message);
      return;
    }

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

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!supabase) return;
      setAuthError(null);
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
      }
    },
    []
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName: string) => {
      if (!supabase) return { needsEmailConfirmation: false };
      setAuthError(null);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: displayName.trim(),
          },
        },
      });
      if (error) {
        throw new Error(error.message || '회원가입에 실패했습니다.');
      }
      return { needsEmailConfirmation: !data.session };
    },
    []
  );

  const signOut = useCallback(async () => {
    if (isSupabaseAuthEnabled && supabase) {
      await supabase.auth.signOut();
    } else {
      await firebaseSignOut(auth);
    }
    setIsAuthenticated(false);
    setProfile(null);
    setIdToken(null);
  }, []);

  const openLoginModal = useCallback(() => {
    setAuthError(null);
    if (!isSupabaseAuthEnabled) {
      signInWithGoogle();
      return;
    }
    setLoginModalOpen(true);
  }, [signInWithGoogle]);

  const closeLoginModal = useCallback(() => {
    setLoginModalOpen(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        authProviderMode,
        profile,
        idToken,
        loading,
        authError,
        loginModalOpen,
        openLoginModal,
        closeLoginModal,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
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
