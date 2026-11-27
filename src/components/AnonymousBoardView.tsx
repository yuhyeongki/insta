import { useState } from 'react';
import {
  Heart,
  Lock,
  MessageSquare,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import type { AnonymousPost } from '../types/community.ts';
import { formatRelativeTime } from '../utils/imageUpload.ts';

interface AnonymousBoardViewProps {
  posts: AnonymousPost[];
  loading: boolean;
  isSignedIn: boolean;
  onRequireSignIn: () => void;
  onOpenCreateAnon: () => void;
  onToggleLike: (postId: number) => Promise<void>;
  onAddComment: (postId: number, content: string) => Promise<void>;
  onDeletePost: (postId: number) => Promise<void>;
  onDeleteComment: (commentId: number) => Promise<void>;
}

const TOPICS = ['전체', '고민상담', '건의사항', '칭찬해요', '자유'] as const;

export function AnonymousBoardView({
  posts,
  loading,
  isSignedIn,
  onRequireSignIn,
  onOpenCreateAnon,
  onToggleLike,
  onAddComment,
  onDeletePost,
  onDeleteComment,
}: AnonymousBoardViewProps) {
  const [selectedTopic, setSelectedTopic] = useState<string>('전체');
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const filtered = posts.filter((p) => {
    if (selectedTopic === '전체') return true;
    return p.topic === selectedTopic;
  });

  const handleComment = async (postId: number) => {
    if (!isSignedIn) {
      onRequireSignIn();
      return;
    }
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;
    setSubmittingId(postId);
    try {
      await onAddComment(postId, text);
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Anonymous Space Banner */}
      <section className="bg-gradient-to-r from-[#F3EFFF] via-[#EEF6FF] to-[#FFF2F7] border border-[#E5DDF5] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B5FEF]">
            <Lock className="w-3.5 h-3.5" />
            작성자 정보 비공개 보장
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            우리 반 익명 대나무숲
          </h1>
          <p className="text-sm text-slate-600">
            학급 건의사항, 고민 상담, 친구를 향한 따뜻한 칭찬을 자유롭게 나눠보세요. 작성자 실명은 다른 친구에게 절대 공개되지 않습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => (isSignedIn ? onOpenCreateAnon() : onRequireSignIn())}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#5B5FEF] hover:bg-[#4B4FD8] rounded-xl transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          익명 글쓰기
        </button>
      </section>

      {/* Topic Filter */}
      <div className="flex items-center gap-1 p-1 bg-[#F1EEFA] rounded-xl overflow-x-auto max-w-full w-fit">
        {TOPICS.map((topic) => (
          <button
            key={topic}
            type="button"
            onClick={() => setSelectedTopic(topic)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              selectedTopic === topic
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {topic}
          </button>
        ))}
      </div>

      {/* Anonymous Posts */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white border border-[#EAE5F5] rounded-2xl p-5 animate-pulse space-y-3"
            >
              <div className="h-4 w-40 bg-slate-200 rounded" />
              <div className="h-12 w-full bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#EAE5F5] rounded-2xl p-10 text-center space-y-2">
          <p className="text-sm font-medium text-slate-700">
            아직 등록된 익명 이야기가 없어요.
          </p>
          <p className="text-xs text-slate-500">
            서로 존중하는 말투로 따뜻한 이야기를 시작해 보세요.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((post) => (
            <article
              key={post.id}
              className="bg-white border border-[#EAE5F5] rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <span className="font-semibold text-[#5B5FEF]">
                      {post.anonymousAlias}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-slate-700">
                      {post.topic}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{formatRelativeTime(post.createdAt)}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {post.title}
                  </h3>
                </div>

                {post.isMine && (
                  <button
                    type="button"
                    aria-label="익명 글 삭제"
                    onClick={() => onDeletePost(post.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {post.content}
              </p>

              {/* Action bar */}
              <div className="flex items-center gap-5 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    isSignedIn ? onToggleLike(post.id) : onRequireSignIn()
                  }
                  className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
                    post.isLiked
                      ? 'text-rose-600'
                      : 'text-slate-600 hover:text-rose-600'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      post.isLiked ? 'fill-rose-500 text-rose-500' : ''
                    }`}
                  />
                  <span className="tabular-nums">공감 {post.likesCount}</span>
                </button>

                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 tabular-nums">
                  <MessageSquare className="w-4 h-4" />
                  익명 댓글 {post.comments.length}
                </span>
              </div>

              {/* Anonymous Comments */}
              {post.comments.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  {post.comments.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-start justify-between gap-2 text-sm bg-[#FAF8FE] rounded-xl px-3.5 py-2.5"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <span className="font-semibold text-slate-800">
                            {c.anonymousAlias}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{formatRelativeTime(c.createdAt)}</span>
                        </div>
                        <p className="text-sm text-slate-700 break-words">
                          {c.content}
                        </p>
                      </div>
                      {c.isMine && (
                        <button
                          type="button"
                          onClick={() => onDeleteComment(c.id)}
                          className="text-xs text-slate-400 hover:text-rose-600 shrink-0"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Comment input */}
              <div className="flex items-center gap-2">
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
                      handleComment(post.id);
                    }
                  }}
                  placeholder={
                    isSignedIn
                      ? '익명으로 따뜻한 답글 달기...'
                      : '로그인 후 익명 댓글을 작성할 수 있습니다'
                  }
                  className="flex-1 text-sm bg-[#FAF8FE] border border-[#EAE5F5] rounded-xl px-3.5 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5B5FEF]"
                />
                <button
                  type="button"
                  disabled={submittingId === post.id}
                  onClick={() => handleComment(post.id)}
                  className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-white bg-[#5B5FEF] hover:bg-[#4B4FD8] disabled:opacity-50 rounded-xl transition-colors whitespace-nowrap shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  등록
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
