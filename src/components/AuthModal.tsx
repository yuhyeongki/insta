import React, { useEffect, useState } from 'react';
import { LogIn, Mail, UserPlus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export function AuthModal() {
  const {
    loginModalOpen,
    closeLoginModal,
    authProviderMode,
    authError,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (loginModalOpen) {
      setError(null);
      setInfoMessage(null);
    }
  }, [loginModalOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && loginModalOpen) closeLoginModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [loginModalOpen, closeLoginModal]);

  if (!loginModalOpen) return null;

  const displayError = error || authError;

  const handleGoogleClick = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Google 로그인에 실패했습니다.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    if (mode === 'signup' && !displayName.trim()) {
      setError('이름을 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
        closeLoginModal();
      } else {
        const result = await signUpWithEmail(email, password, displayName);
        if (result.needsEmailConfirmation) {
          setInfoMessage(
            '인증 메일이 전송되었습니다. 이메일 확인 후 로그인해 주세요.'
          );
          setMode('login');
        } else {
          closeLoginModal();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="우리반그램 로그인"
      onClick={closeLoginModal}
      className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white border border-[#EAE5F5] rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            우리반그램 개별 로그인
          </h2>
          <button
            type="button"
            aria-label="닫기"
            onClick={closeLoginModal}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {authProviderMode === 'supabase' ? (
            <>
              <div className="grid grid-cols-2 gap-1 p-1 bg-[#F1EEFA] rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                    mode === 'login'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  로그인
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                    mode === 'signup'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  회원가입
                </button>
              </div>

              {displayError && (
                <div className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 leading-relaxed">
                  {displayError}
                </div>
              )}
              {infoMessage && (
                <div className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5 leading-relaxed">
                  {infoMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {mode === 'signup' && (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      이름
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="예: 김하늘"
                      className="w-full text-sm bg-[#FAF8FE] border border-[#EAE5F5] rounded-xl px-3.5 py-2.5 text-slate-900"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    이메일
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@school.ac.kr"
                    className="w-full text-sm bg-[#FAF8FE] border border-[#EAE5F5] rounded-xl px-3.5 py-2.5 text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    비밀번호
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="6자 이상 입력"
                    className="w-full text-sm bg-[#FAF8FE] border border-[#EAE5F5] rounded-xl px-3.5 py-2.5 text-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#5B5FEF] hover:bg-[#4B4FD8] disabled:opacity-50 rounded-xl transition-colors"
                >
                  {mode === 'login' ? (
                    <Mail className="w-4 h-4" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  {submitting
                    ? '처리 중...'
                    : mode === 'login'
                      ? '이메일로 로그인'
                      : '계정 만들기'}
                </button>
              </form>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center text-[11px] text-slate-400">
                  <span className="bg-white px-2">또는</span>
                </div>
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={handleGoogleClick}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-[#F7F5FD] hover:bg-[#EEE9FA] border border-[#E4DFF5] rounded-xl transition-colors"
              >
                <LogIn className="w-4 h-4 text-[#5B5FEF]" />
                Google 계정으로 계속하기
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Google 계정으로 로그인하면 게시글 작성, 댓글, 숙제 체크, 익명 글쓰기 및 학급 사진 업로드를 이용할 수 있습니다.
              </p>

              {displayError && (
                <div className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 leading-relaxed">
                  {displayError}
                </div>
              )}

              <button
                type="button"
                disabled={submitting}
                onClick={handleGoogleClick}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold text-white bg-[#5B5FEF] hover:bg-[#4B4FD8] disabled:opacity-50 rounded-xl transition-colors"
              >
                <LogIn className="w-4 h-4" />
                {submitting ? '로그인 창 여는 중...' : 'Google 계정으로 로그인'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
