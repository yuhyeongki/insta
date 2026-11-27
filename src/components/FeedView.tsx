import { useState } from 'react';
import {
  Bookmark,
  Heart,
  ImageOff,
  MapPin,
  MessageCircle,
  Send,
  Trash2,
} from 'lucide-react';
import type { Classmate, FeedPost } from '../types/community.ts';
import { formatRelativeTime } from '../utils/imageUpload.ts';
import { Avatar } from './Avatar.tsx';

interface FeedViewProps {
  posts: FeedPost[];
  classmates: Classmate[];
  loading: boolean;
  isSignedIn: boolean;
  onRequireSignIn: () => void;
  onOpenCreate: () => void;
  onToggleLike: (postId: number) => Promise<void>;
  onToggleBookmark: (postId: number) => Promise<void>;
  onAddComment: (postId: number, content: string) => Promise<void>;
  onDeletePost: (postId: number) => Promise<void>;
  onDeleteComment: (commentId: number) => Promise<void>;
}

const CATEGORIES = ['전체', '일상', '공부인증', '동아리', '질문', '저장됨'] as const;

export function FeedView({
  posts,
  classmates,
  loading,
  isSignedIn,
  onRequireSignIn,
  onOpenCreate,
  onToggleLike,
  onToggleBookmark,
  onAddComment,
  onDeletePost,
  onDeleteComment,
}: FeedViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});
  const [brokenImages, setBrokenImages] = useState<Record<number, boolean>>({});
  const [submittingComment, setSubmittingComment] = useState<number | null>(null);

  const filteredPosts = posts.filter((post) => {
    if (selectedAuthor && post.authorName !== selectedAuthor) return false;
    if (selectedCategory === '전체') return true;
    if (selectedCategory === '저장됨') return post.isBookmarked;
    return post.category === selectedCategory;
  });

  const handleCommentSubmit = async (postId: number) => {
    if (!isSignedIn) {
      onRequireSignIn();
      return;
    }
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;
    setSubmittingComment(postId);
    try {
      await onAddComment(postId, text);
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      setExpandedComments((prev) => ({ ...prev, [postId]: true }));
    } finally {
      setSubmittingComment(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Classmate Story Strip */}
      <section
        aria-label="우리 반 친구들"
        className="bg-white/90 border border-[#EAE5F5] rounded-2xl p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-800">
            우리 반 친구들
          </h2>
          {selectedAuthor ? (
            <button
              type="button"
              onClick={() => setSelectedAuthor(null)}
              className="text-xs font-medium text-[#5B5FEF] hover:underline whitespace-nowrap shrink-0"
            >
              전체 친구 보기
            </button>
          ) : (
            <span className="text-xs text-slate-500 tabular-nums">
              {classmates.length}명 참여 중
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 overflow-x-auto pb-1">
          {classmates.map((mate) => {
            const isActive = selectedAuthor === mate.displayName;
            return (
              <button
                key={mate.id}
                type="button"
                onClick={() =>
                  setSelectedAuthor((prev) =>
                    prev === mate.displayName ? null : mate.displayName
                  )
                }
                className={`flex flex-col items-center gap-1.5 min-w-[64px] shrink-0 rounded-xl p-1.5 transition-colors ${
                  isActive
                    ? 'bg-[#F1EDFF]'
                    : 'hover:bg-[#F7F5FD]'
                }`}
              >
                <Avatar
                  name={mate.displayName}
                  imageUrl={mate.avatarUrl}
                  tint={mate.avatarTint}
                  size="lg"
                />
                <span className="text-xs font-medium text-slate-800 max-w-[68px] truncate">
                  {mate.displayName}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Filter Segmented Control + Quick Post Prompt */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="피드 카테고리 필터"
          className="flex items-center gap-1 p-1 bg-[#F1EEFA] rounded-xl overflow-x-auto max-w-full"
        >
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => (isSignedIn ? onOpenCreate() : onRequireSignIn())}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#5B5FEF] hover:bg-[#4B4FD8] rounded-xl transition-colors whitespace-nowrap shrink-0"
        >
          사진·이야기 올리기
        </button>
      </div>

      {/* Posts Feed */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="bg-white border border-[#EAE5F5] rounded-2xl p-5 animate-pulse space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200" />
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 w-32 bg-slate-200 rounded" />
                  <div className="h-3 w-24 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="h-64 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="bg-white border border-[#EAE5F5] rounded-2xl p-10 text-center space-y-3">
          <p className="text-sm font-medium text-slate-700">
            선택한 조건에 맞는 피드 게시물이 아직 없어요.
          </p>
          <p className="text-xs text-slate-500">
            오늘의 교실 이야기나 공부 인증 사진을 첫 번째로 공유해 보세요.
          </p>
          <button
            type="button"
            onClick={() => (isSignedIn ? onOpenCreate() : onRequireSignIn())}
            className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-[#5B5FEF] hover:bg-[#4B4FD8] rounded-xl transition-colors"
          >
            새 게시글 작성하기
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredPosts.map((post) => {
            const isCommentsOpen =
              expandedComments[post.id] ?? post.comments.length <= 2;
            const visibleComments = isCommentsOpen
              ? post.comments
              : post.comments.slice(-2);

            return (
              <article
                key={post.id}
                className="bg-white border border-[#EAE5F5] rounded-2xl overflow-hidden"
              >
                {/* Post Header */}
                <div className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      name={post.authorName}
                      imageUrl={post.authorAvatarUrl}
                      tint={post.authorAvatarTint}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 truncate">
                        <span className="truncate">{post.authorName}</span>
                        {post.authorRole === 'teacher' && (
                          <span className="text-xs font-medium text-[#5B5FEF]">
                            · 담임선생님
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                        {post.authorStudentNumber && (
                          <>
                            <span>{post.authorStudentNumber}</span>
                            <span aria-hidden="true">·</span>
                          </>
                        )}
                        <span>{post.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />
                          {post.locationLabel}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{formatRelativeTime(post.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {post.isMine && (
                    <button
                      type="button"
                      aria-label="게시글 삭제"
                      onClick={() => onDeletePost(post.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Post Media */}
                {post.imageUrl && (
                  <div className="bg-[#F6F4FB] border-y border-[#F0ECF8]">
                    {brokenImages[post.id] ? (
                      <div className="aspect-[4/3] flex flex-col items-center justify-center gap-2 text-slate-400 bg-gradient-to-br from-[#F4F0FF] to-[#EEF7FF]">
                        <ImageOff className="w-7 h-7" />
                        <span className="text-xs font-medium text-slate-500">
                          이미지를 불러올 수 없습니다
                        </span>
                      </div>
                    ) : (
                      <img
                        src={post.imageUrl}
                        alt={`${post.authorName}님의 ${post.category} 사진`}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setBrokenImages((prev) => ({ ...prev, [post.id]: true }))
                        }
                        className="w-full max-h-[520px] object-cover"
                      />
                    )}
                  </div>
                )}

                {/* Action Bar & Caption */}
                <div className="px-5 py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() =>
                          isSignedIn ? onToggleLike(post.id) : onRequireSignIn()
                        }
                        className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors py-1 px-1.5 -ml-1.5 rounded-lg ${
                          post.isLiked
                            ? 'text-rose-600'
                            : 'text-slate-700 hover:text-rose-600'
                        }`}
                      >
                        <Heart
                          className={`w-5 h-5 ${
                            post.isLiked ? 'fill-rose-500 text-rose-500' : ''
                          }`}
                        />
                        <span className="tabular-nums text-xs">
                          좋아요 {post.likesCount}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedComments((prev) => ({
                            ...prev,
                            [post.id]: !isCommentsOpen,
                          }))
                        }
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-[#5B5FEF] transition-colors py-1 px-1.5 rounded-lg"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span className="tabular-nums text-xs">
                          댓글 {post.comments.length}
                        </span>
                      </button>
                    </div>

                    <button
                      type="button"
                      aria-label="게시글 저장"
                      onClick={() =>
                        isSignedIn ? onToggleBookmark(post.id) : onRequireSignIn()
                      }
                      className={`p-1.5 rounded-lg transition-colors ${
                        post.isBookmarked
                          ? 'text-[#5B5FEF]'
                          : 'text-slate-600 hover:text-[#5B5FEF]'
                      }`}
                    >
                      <Bookmark
                        className={`w-5 h-5 ${
                          post.isBookmarked ? 'fill-[#5B5FEF]' : ''
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-[15px] leading-relaxed text-slate-800 whitespace-pre-wrap">
                    <span className="font-semibold text-slate-900 mr-2">
                      {post.authorName}
                    </span>
                    {post.caption}
                  </p>

                  {/* Comments */}
                  {post.comments.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      {post.comments.length > 2 && !isCommentsOpen && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedComments((prev) => ({
                              ...prev,
                              [post.id]: true,
                            }))
                          }
                          className="text-xs font-medium text-slate-500 hover:text-slate-800"
                        >
                          댓글 {post.comments.length}개 모두 보기
                        </button>
                      )}
                      {visibleComments.map((comment) => (
                        <div
                          key={comment.id}
                          className="flex items-start justify-between gap-2 text-sm"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 mr-1.5">
                              {comment.authorName}
                            </span>
                            <span className="text-slate-700 break-words">
                              {comment.content}
                            </span>
                            <span className="ml-2 text-xs text-slate-400">
                              {formatRelativeTime(comment.createdAt)}
                            </span>
                          </div>
                          {comment.isMine && (
                            <button
                              type="button"
                              aria-label="댓글 삭제"
                              onClick={() => onDeleteComment(comment.id)}
                              className="text-xs text-slate-400 hover:text-rose-600 shrink-0 px-1"
                            >
                              삭제
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Comment Composer */}
                  <div className="pt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={commentInputs[post.id] || ''}
                      onChange={(e) =>
                        setCommentInputs((prev) => ({
                          ...prev,
                          [post.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleCommentSubmit(post.id);
                        }
                      }}
                      placeholder={
                        isSignedIn
                          ? '따뜻한 댓글을 남겨보세요...'
                          : '로그인 후 댓글을 작성할 수 있습니다'
                      }
                      className="flex-1 text-sm bg-[#FAF8FE] border border-[#EAE5F5] rounded-xl px-3.5 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5B5FEF]"
                    />
                    <button
                      type="button"
                      disabled={submittingComment === post.id}
                      onClick={() => handleCommentSubmit(post.id)}
                      className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-white bg-[#5B5FEF] hover:bg-[#4B4FD8] disabled:opacity-50 rounded-xl transition-colors whitespace-nowrap shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      등록
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
