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

interface SessionIdentity {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
  token: string;
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

function formatFirebaseAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('popup-blocked')) {
    return '브라우저에서 로그인 팝업이 차단되었습니다. 팝업 차단을 허용하거나 새 탭에서 열어 다시 시도해 주세요.';
  }
  if (raw.includes('unauthorized-domain')) {
    return '현재 도메인에서 Google 로그인이 허용되지 않았습니다. Vercel 배포 시 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY 환경 변수를 설정한 뒤 재배포해 주세요.';
  }
  if (raw.includes('popup-closed-by-user') || raw.includes('cancelled-popup-request')) {
    return '로그인 팝업 창이 닫혔습니다. 다시 시도해 주세요.';
  }
  return raw || 'Google 로그인에 실패했습니다.';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionUser, setSessionUser] = useState<SessionIdentity | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const authProviderMode: 'supabase' | 'firebase' = isSupabaseAuthEnabled
    ? 'supabase'
    : 'firebase';

  const isAuthenticated = Boolean(sessionUser);
  const idToken = sessionUser?.token ?? null;

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    if (isSupabaseAuthEnabled && supabase) {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return {};
      return { Authorization: `Bearer ${token}` };
    }

    if (!auth.currentUser) return {};
    const freshToken = await auth.currentUser.getIdToken();
    return { Authorization: `Bearer ${freshToken}` };
  }, []);

  // Listen to auth state changes without awaiting DB queries inside callback
  useEffect(() => {
    if (isSupabaseAuthEnabled && supabase) {
      let mounted = true;

      const applySession = (
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
        if (session?.access_token && session.user) {
          const meta = session.user.user_metadata || {};
          setSessionUser({
            uid: session.user.id,
            email: session.user.email || '',
            name:
              typeof meta.full_name === 'string'
                ? meta.full_name
                : typeof meta.name === 'string'
                  ? meta.name
                  : undefined,
            picture:
              typeof meta.avatar_url === 'string' ? meta.avatar_url : undefined,
            token: session.access_token,
          });
          setLoginModalOpen(false);
        } else {
          setSessionUser(null);
          setProfile(null);
        }
        setLoading(false);
      };

      supabase.auth.getSession().then(({ data }) => {
        applySession(data.session);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        applySession(session);
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          setSessionUser({
            uid: user.uid,
            email: user.email || '',
            name: user.displayName || undefined,
            picture: user.photoURL || undefined,
            token,
          });
          setLoginModalOpen(false);
        } catch (err) {
          setAuthError(formatFirebaseAuthError(err));
        }
      } else {
        setSessionUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync user profile whenever sessionUser changes
  useEffect(() => {
    if (!sessionUser) {
      setProfile(null);
      return;
    }

    let cancelled = false;
    setAuthError(null);

    syncCurrentUserProfile({
      uid: sessionUser.uid,
      email: sessionUser.email,
      name: sessionUser.name,
      picture: sessionUser.picture,
      headers: { Authorization: `Bearer ${sessionUser.token}` },
    })
      .then((synced) => {
        if (!cancelled) {
          setProfile(synced);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Profile sync error:', err);
          setAuthError(
            err instanceof Error
              ? err.message
              : '프로필 정보를 불러오지 못했습니다.'
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sessionUser]);

  const refreshProfile = useCallback(async () => {
    if (!sessionUser) return;
    const headers = await getAuthHeaders();
    const synced = await syncCurrentUserProfile({
      uid: sessionUser.uid,
      email: sessionUser.email,
      name: sessionUser.name,
      picture: sessionUser.picture,
      headers,
    });
    setProfile(synced);
  }, [sessionUser, getAuthHeaders]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    if (isSupabaseAuthEnabled && supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) {
        setAuthError(error.message);
        throw new Error(error.message);
      }
      return;
    }

    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      const msg = formatFirebaseAuthError(err);
      setAuthError(msg);
      throw new Error(msg);
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
        if (error.message.includes('Email not confirmed')) {
          throw new Error(
            '이메일 인증이 필요합니다. 받은 편지함을 확인하거나 Supabase Authentication에서 Confirm email 설정을 꺼주세요.'
          );
        }
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
    setSessionUser(null);
    setProfile(null);
  }, []);

  const openLoginModal = useCallback(() => {
    setAuthError(null);
    setLoginModalOpen(true);
  }, []);

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
