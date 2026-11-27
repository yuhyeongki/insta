import React, { useEffect, useState } from 'react';
import { Check, LogIn, LogOut, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { updateMyProfile } from '../services/classroomApi.ts';
import type { Classmate } from '../types/community.ts';
import { compressImageFileToDataUrl } from '../utils/imageUpload.ts';
import { Avatar } from './Avatar.tsx';

interface ProfileViewProps {
  classmates: Classmate[];
  onProfileSaved: () => Promise<void>;
}

const TINT_OPTIONS = [
  { key: 'lavender', label: '라벤더', swatch: 'bg-[#DDD4FB]' },
  { key: 'sky', label: '스카이', swatch: 'bg-[#C4E2FC]' },
  { key: 'mint', label: '민트', swatch: 'bg-[#BCEAD9]' },
  { key: 'peach', label: '피치', swatch: 'bg-[#FAD7BE]' },
  { key: 'rose', label: '로즈', swatch: 'bg-[#F9C7D8]' },
] as const;

export function ProfileView({ classmates, onProfileSaved }: ProfileViewProps) {
  const {
    isAuthenticated,
    authProviderMode,
    profile,
    loading,
    authError,
    openLoginModal,
    signOut,
    refreshProfile,
    getAuthHeaders,
  } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [bio, setBio] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [avatarTint, setAvatarTint] = useState('lavender');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setStudentNumber(profile.studentNumber);
      setBio(profile.bio);
      setRole(profile.role === 'teacher' ? 'teacher' : 'student');
      setAvatarTint(profile.avatarTint || 'lavender');
      setAvatarUrl(profile.avatarUrl || '');
    }
  }, [profile]);

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaveError(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 480, 0.85);
      setAvatarUrl(dataUrl);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : '프로필 사진 처리에 실패했습니다.'
      );
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!displayName.trim()) {
      setSaveError('이름을 입력해 주세요.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      const headers = await getAuthHeaders();
      await updateMyProfile({
        uid: profile.uid,
        displayName,
        studentNumber,
        bio,
        role,
        avatarTint,
        avatarUrl,
        headers,
      });
      await refreshProfile();
      await onProfileSaved();
      setSaveMessage('프로필이 저장되었습니다.');
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : '프로필 저장에 실패했습니다.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Personal Login / Profile Card */}
      <section className="bg-white border border-[#EAE5F5] rounded-2xl p-6 sm:p-8">
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-500">
            계정 정보를 확인하고 있습니다...
          </div>
        ) : !isAuthenticated || !profile ? (
          <div className="max-w-md mx-auto text-center space-y-4 py-4">
            <h1 className="text-xl font-bold text-slate-900">
              개별 로그인으로 우리반그램 시작하기
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              {authProviderMode === 'supabase'
                ? '이메일 또는 Google 계정으로 간편하게 개별 로그인하면 피드 글쓰기, 숙제 완료 체크, 익명 게시판 글 작성, 학급 갤러리 사진 업로드를 이용할 수 있습니다.'
                : 'Google 계정으로 간편하게 개별 로그인하면 피드 글쓰기, 숙제 완료 체크, 익명 게시판 글 작성, 학급 갤러리 사진 업로드를 이용할 수 있습니다.'}
            </p>
            {authError && (
              <p className="text-xs text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
                {authError}
              </p>
            )}
            <button
              type="button"
              onClick={openLoginModal}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#5B5FEF] hover:bg-[#4B4FD8] rounded-xl transition-colors"
            >
              <LogIn className="w-4 h-4" />
              {authProviderMode === 'supabase'
                ? '로그인 / 회원가입'
                : 'Google 계정으로 로그인'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <Avatar
                  name={displayName || profile.displayName}
                  imageUrl={avatarUrl}
                  tint={avatarTint}
                  size="xl"
                />
                <div className="space-y-1">
                  <h1 className="text-lg font-bold text-slate-900">
                    {profile.displayName}
                  </h1>
                  <p className="text-xs text-slate-500">
                    {profile.email} ·{' '}
                    {profile.role === 'teacher' ? '선생님' : '학생'}
                  </p>
                  <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5B5FEF] hover:underline cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    프로필 사진 변경
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFile}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              <button
                type="button"
                onClick={signOut}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-[#F4F1FA] hover:bg-[#EAE5F5] rounded-xl transition-colors self-start sm:self-center whitespace-nowrap shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                로그아웃
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="profile-name"
                  className="block text-xs font-semibold text-slate-700"
                >
                  이름 (표시 이름)
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={30}
                  className="w-full text-sm bg-[#FAF8FE] border border-[#EAE5F5] rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-[#5B5FEF]"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="profile-number"
                  className="block text-xs font-semibold text-slate-700"
                >
                  학번 / 반 번호
                </label>
                <input
                  id="profile-number"
                  type="text"
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  placeholder="예: 2-3 14번"
                  maxLength={24}
                  className="w-full text-sm bg-[#FAF8FE] border border-[#EAE5F5] rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-[#5B5FEF]"
                />
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-slate-700">
                  구분
                </span>
                <div className="flex items-center gap-2 p-1 bg-[#F1EEFA] rounded-xl w-fit">
                  {(
                    [
                      { key: 'student', label: '학생' },
                      { key: 'teacher', label: '담임선생님' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setRole(item.key)}
                      className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        role === item.key
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-slate-700">
                  파스텔 아바타 색상
                </span>
                <div className="flex items-center gap-2 pt-1">
                  {TINT_OPTIONS.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setAvatarTint(t.key)}
                      aria-label={t.label}
                      className={`w-8 h-8 rounded-full ${t.swatch} flex items-center justify-center transition-transform ${
                        avatarTint === t.key
                          ? 'ring-2 ring-[#5B5FEF] ring-offset-2 scale-105'
                          : 'hover:scale-105'
                      }`}
                    >
                      {avatarTint === t.key && (
                        <Check className="w-4 h-4 text-slate-800" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="profile-bio"
                className="block text-xs font-semibold text-slate-700"
              >
                한 줄 자기소개
              </label>
              <input
                id="profile-bio"
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                placeholder="동아리, 관심사, 친구들에게 전하고 싶은 말을 적어보세요"
                className="w-full text-sm bg-[#FAF8FE] border border-[#EAE5F5] rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-[#5B5FEF]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-xs">
                {saveError && <span className="text-rose-600">{saveError}</span>}
                {saveMessage && (
                  <span className="text-emerald-700 font-medium">
                    {saveMessage}
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#5B5FEF] hover:bg-[#4B4FD8] disabled:opacity-50 rounded-xl transition-colors"
              >
                {saving ? '저장 중...' : '프로필 저장'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Classmate Directory (3-column grid) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            우리 반 멤버 디렉토리
          </h2>
          <span className="text-xs text-slate-500 tabular-nums">
            총 {classmates.length}명
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classmates.map((mate) => (
            <div
              key={mate.id}
              className="bg-white border border-[#EAE5F5] rounded-2xl p-5 flex items-start gap-3.5"
            >
              <Avatar
                name={mate.displayName}
                imageUrl={mate.avatarUrl}
                tint={mate.avatarTint}
                size="lg"
              />
              <div className="min-w-0 space-y-1">
                <div className="text-sm font-bold text-slate-900 truncate">
                  {mate.displayName}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <span>{mate.studentNumber || '2학년 3반'}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {mate.role === 'teacher' ? '선생님' : '학생'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">게시글 {mate.postCount}</span>
                </div>
                {mate.bio && (
                  <p className="text-xs text-slate-600 line-clamp-2 pt-0.5">
                    {mate.bio}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
