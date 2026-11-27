import { useCallback, useEffect, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Circle,
  Home,
  Lock,
  LogIn,
  Megaphone,
  User,
  X,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import type {
  ActiveTab,
  AnonymousPost,
  Classmate,
  FeedPost,
  GalleryPhoto,
  NoticeItem,
} from './types/community.ts';
import { Avatar } from './components/Avatar.tsx';
import { FeedView } from './components/FeedView.tsx';
import { NoticeBoardView } from './components/NoticeBoardView.tsx';
import { AnonymousBoardView } from './components/AnonymousBoardView.tsx';
import { GalleryView } from './components/GalleryView.tsx';
import { ProfileView } from './components/ProfileView.tsx';
import { CreateModal, type ComposerMode } from './components/CreateModal.tsx';

function ClassroomCommunityApp() {
  const {
    firebaseUser,
    profile,
    idToken,
    loading: authLoading,
    signIn,
    getAuthHeaders,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('feed');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [anonPosts, setAnonPosts] = useState<AnonymousPost[]>([]);
  const [gallery, setGallery] = useState<GalleryPhoto[]>([]);
  const [classmates, setClassmates] = useState<Classmate[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<ComposerMode>('post');

  const fetchAllData = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const [postsRes, noticesRes, anonRes, galleryRes, matesRes] =
        await Promise.all([
          fetch('/api/posts', { headers }),
          fetch('/api/notices', { headers }),
          fetch('/api/anonymous', { headers }),
          fetch('/api/gallery', { headers }),
          fetch('/api/classmates', { headers }),
        ]);

      if (postsRes.ok) setPosts(await postsRes.json());
      if (noticesRes.ok) setNotices(await noticesRes.json());
      if (anonRes.ok) setAnonPosts(await anonRes.json());
      if (galleryRes.ok) setGallery(await galleryRes.json());
      if (matesRes.ok) setClassmates(await matesRes.json());
    } catch (err) {
      console.error('Data fetch failed:', err);
      setBannerError('학급 데이터를 불러오는 중 문제가 발생했습니다.');
    } finally {
      setLoadingData(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    if (!authLoading) {
      fetchAllData();
    }
  }, [authLoading, idToken, fetchAllData]);

  const apiMutate = async (
    url: string,
    method: 'POST' | 'DELETE',
    body?: unknown
  ) => {
    setBannerError(null);
    const headers: Record<string, string> = {
      ...(await getAuthHeaders()),
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data.error || '요청을 처리하지 못했습니다.';
      setBannerError(msg);
      throw new Error(msg);
    }
    return res.json();
  };

  const openComposer = (mode: ComposerMode) => {
    if (!firebaseUser) {
      signIn();
      return;
    }
    setCreateMode(mode);
    setCreateOpen(true);
  };

  const primaryAction = () => {
    if (!firebaseUser) {
      signIn();
      return;
    }
    if (activeTab === 'notices') openComposer('notice');
    else if (activeTab === 'anonymous') openComposer('anonymous');
    else if (activeTab === 'gallery') openComposer('gallery');
    else openComposer('post');
  };

  const pinnedNotices = notices.filter((n) => n.isPinned).slice(0, 2);
  const upcomingHomework = notices
    .filter((n) => n.type === 'homework')
    .slice(0, 3);
  const recentGallery = gallery.slice(0, 4);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FBF8FF] via-[#F6F9FF] to-[#FFF8F4] text-slate-900 pb-20 md:pb-10">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-[#EAE5F5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand wordmark (single text element) */}
          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            우리반그램
          </button>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav
            aria-label="주요 메뉴"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            {(
              [
                { key: 'feed', label: '피드' },
                { key: 'notices', label: '공지·숙제' },
                { key: 'anonymous', label: '익명게시판' },
                { key: 'gallery', label: '학급갤러리' },
                { key: 'profile', label: '내 프로필' },
              ] as const
            ).map((item) => {
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'border-[#5B5FEF] text-slate-900 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={primaryAction}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#5B5FEF] hover:bg-[#4B4FD8] rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              {firebaseUser ? '새 글 올리기' : '로그인'}
            </button>
          </div>
        </div>
      </header>

      {/* Inline Error Banner */}
      {bannerError && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-4 py-3 text-xs font-medium flex items-center justify-between gap-3">
            <span>{bannerError}</span>
            <button
              type="button"
              aria-label="알림 닫기"
              onClick={() => setBannerError(null)}
              className="text-rose-500 hover:text-rose-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Primary Column */}
          <div className="lg:col-span-8 min-w-0">
            {activeTab === 'feed' && (
              <FeedView
                posts={posts}
                classmates={classmates}
                loading={loadingData}
                isSignedIn={Boolean(firebaseUser)}
                onRequireSignIn={signIn}
                onOpenCreate={() => openComposer('post')}
                onToggleLike={async (postId) => {
                  await apiMutate(`/api/posts/${postId}/like`, 'POST');
                  await fetchAllData();
                }}
                onToggleBookmark={async (postId) => {
                  await apiMutate(`/api/posts/${postId}/bookmark`, 'POST');
                  await fetchAllData();
                }}
                onAddComment={async (postId, content) => {
                  await apiMutate(`/api/posts/${postId}/comments`, 'POST', {
                    content,
                  });
                  await fetchAllData();
                }}
                onDeletePost={async (postId) => {
                  await apiMutate(`/api/posts/${postId}`, 'DELETE');
                  await fetchAllData();
                }}
                onDeleteComment={async (commentId) => {
                  await apiMutate(`/api/comments/${commentId}`, 'DELETE');
                  await fetchAllData();
                }}
              />
            )}

            {activeTab === 'notices' && (
              <NoticeBoardView
                notices={notices}
                loading={loadingData}
                isSignedIn={Boolean(firebaseUser)}
                onRequireSignIn={signIn}
                onOpenCreateNotice={() => openComposer('notice')}
                onToggleHomework={async (noticeId) => {
                  await apiMutate(
                    `/api/notices/${noticeId}/toggle-complete`,
                    'POST'
                  );
                  await fetchAllData();
                }}
                onDeleteNotice={async (noticeId) => {
                  await apiMutate(`/api/notices/${noticeId}`, 'DELETE');
                  await fetchAllData();
                }}
              />
            )}

            {activeTab === 'anonymous' && (
              <AnonymousBoardView
                posts={anonPosts}
                loading={loadingData}
                isSignedIn={Boolean(firebaseUser)}
                onRequireSignIn={signIn}
                onOpenCreateAnon={() => openComposer('anonymous')}
                onToggleLike={async (postId) => {
                  await apiMutate(`/api/anonymous/${postId}/like`, 'POST');
                  await fetchAllData();
                }}
                onAddComment={async (postId, content) => {
                  await apiMutate(`/api/anonymous/${postId}/comments`, 'POST', {
                    content,
                  });
                  await fetchAllData();
                }}
                onDeletePost={async (postId) => {
                  await apiMutate(`/api/anonymous/${postId}`, 'DELETE');
                  await fetchAllData();
                }}
                onDeleteComment={async (commentId) => {
                  await apiMutate(
                    `/api/anonymous/comments/${commentId}`,
                    'DELETE'
                  );
                  await fetchAllData();
                }}
              />
            )}

            {activeTab === 'gallery' && (
              <GalleryView
                photos={gallery}
                loading={loadingData}
                isSignedIn={Boolean(firebaseUser)}
                onRequireSignIn={signIn}
                onOpenUploadGallery={() => openComposer('gallery')}
                onToggleLike={async (photoId) => {
                  await apiMutate(`/api/gallery/${photoId}/like`, 'POST');
                  await fetchAllData();
                }}
                onDeletePhoto={async (photoId) => {
                  await apiMutate(`/api/gallery/${photoId}`, 'DELETE');
                  await fetchAllData();
                }}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileView
                classmates={classmates}
                onProfileSaved={fetchAllData}
              />
            )}
          </div>

          {/* Right Classroom Editorial Sidebar (Desktop) */}
          <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">
            {/* Student Account Card */}
            <div className="bg-white border border-[#EAE5F5] rounded-2xl p-5">
              {firebaseUser && profile ? (
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className="flex items-center gap-3 min-w-0 text-left group"
                  >
                    <Avatar
                      name={profile.displayName}
                      imageUrl={profile.avatarUrl}
                      tint={profile.avatarTint}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 group-hover:text-[#5B5FEF] truncate">
                        {profile.displayName}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {profile.studentNumber || '2학년 3반'} ·{' '}
                        {profile.role === 'teacher' ? '선생님' : '학생'}
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className="text-xs font-semibold text-[#5B5FEF] hover:underline whitespace-nowrap shrink-0"
                  >
                    프로필 관리
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm font-bold text-slate-900">
                    개별 로그인
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Google 계정으로 로그인하면 게시글 작성, 숙제 체크, 익명 글쓰기, 사진 업로드를 할 수 있어요.
                  </p>
                  <button
                    type="button"
                    onClick={signIn}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#5B5FEF] hover:bg-[#4B4FD8] rounded-xl transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Google 계정으로 로그인
                  </button>
                </div>
              )}
            </div>

            {/* Pinned Notices & Homework Quick Check */}
            <div className="bg-white border border-[#EAE5F5] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">
                  이번 주 공지·숙제
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('notices')}
                  className="text-xs font-medium text-[#5B5FEF] hover:underline whitespace-nowrap"
                >
                  전체 보기
                </button>
              </div>

              {pinnedNotices.length > 0 && (
                <div className="space-y-2 pb-3 border-b border-slate-100">
                  {pinnedNotices.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => setActiveTab('notices')}
                      className="w-full text-left rounded-xl bg-[#FAF8FE] hover:bg-[#F3EEFC] p-3 transition-colors space-y-1"
                    >
                      <div className="text-xs text-[#5B5FEF] font-semibold">
                        {n.type === 'homework' ? '숙제' : '중요 공지'} ·{' '}
                        {n.subject}
                      </div>
                      <div className="text-xs font-semibold text-slate-900 line-clamp-1">
                        {n.title}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-slate-500">
                  숙제 체크리스트
                </div>
                {upcomingHomework.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    등록된 숙제가 없습니다.
                  </p>
                ) : (
                  upcomingHomework.map((hw) => (
                    <button
                      key={hw.id}
                      type="button"
                      onClick={async () => {
                        if (!firebaseUser) {
                          signIn();
                          return;
                        }
                        await apiMutate(
                          `/api/notices/${hw.id}/toggle-complete`,
                          'POST'
                        );
                        await fetchAllData();
                      }}
                      className="w-full flex items-start gap-2.5 text-left group py-1"
                    >
                      {hw.isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-[#147A5E] shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300 group-hover:text-[#5B5FEF] shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-xs font-medium line-clamp-1 ${
                            hw.isCompleted
                              ? 'line-through text-slate-400'
                              : 'text-slate-800'
                          }`}
                        >
                          {hw.title}
                        </div>
                        <div className="text-[11px] text-slate-400 tabular-nums">
                          {hw.subject}
                          {hw.dueDate ? ` · ${hw.dueDate}까지` : ''}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Gallery Preview Card */}
            <div className="bg-white border border-[#EAE5F5] rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">
                  학급 활동 갤러리
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('gallery')}
                  className="text-xs font-medium text-[#5B5FEF] hover:underline whitespace-nowrap"
                >
                  더 보기
                </button>
              </div>
              {recentGallery.length === 0 ? (
                <p className="text-xs text-slate-400">
                  등록된 활동 사진이 없습니다.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {recentGallery.map((photo) => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => setActiveTab('gallery')}
                      className="aspect-[4/3] rounded-xl overflow-hidden bg-[#F4F1FA] group"
                    >
                      <img
                        src={photo.imageUrl}
                        alt={photo.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile Bottom Navigation (<= 15% mobile height) */}
      <nav
        aria-label="모바일 메뉴"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 h-14 bg-white/95 backdrop-blur-md border-t border-[#EAE5F5] grid grid-cols-5"
      >
        {(
          [
            { key: 'feed', label: '피드', Icon: Home },
            { key: 'notices', label: '공지·숙제', Icon: Megaphone },
            { key: 'anonymous', label: '익명', Icon: Lock },
            { key: 'gallery', label: '갤러리', Icon: Camera },
            { key: 'profile', label: '프로필', Icon: User },
          ] as const
        ).map(({ key, label, Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                active ? 'text-[#5B5FEF]' : 'text-slate-500'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="whitespace-nowrap">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Unified Creation Modal */}
      <CreateModal
        open={createOpen}
        initialMode={createMode}
        onClose={() => setCreateOpen(false)}
        onCreatePost={async (payload) => {
          await apiMutate('/api/posts', 'POST', payload);
          setActiveTab('feed');
          await fetchAllData();
        }}
        onCreateNotice={async (payload) => {
          await apiMutate('/api/notices', 'POST', payload);
          setActiveTab('notices');
          await fetchAllData();
        }}
        onCreateAnonymous={async (payload) => {
          await apiMutate('/api/anonymous', 'POST', payload);
          setActiveTab('anonymous');
          await fetchAllData();
        }}
        onCreateGallery={async (payload) => {
          await apiMutate('/api/gallery', 'POST', payload);
          setActiveTab('gallery');
          await fetchAllData();
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ClassroomCommunityApp />
    </AuthProvider>
  );
}
