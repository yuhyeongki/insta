import { useState } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Circle,
  Megaphone,
  Pin,
  Plus,
  Trash2,
} from 'lucide-react';
import type { NoticeItem } from '../types/community.ts';
import { formatRelativeTime } from '../utils/imageUpload.ts';

interface NoticeBoardViewProps {
  notices: NoticeItem[];
  loading: boolean;
  isSignedIn: boolean;
  onRequireSignIn: () => void;
  onOpenCreateNotice: () => void;
  onToggleHomework: (noticeId: number) => Promise<void>;
  onDeleteNotice: (noticeId: number) => Promise<void>;
}

export function NoticeBoardView({
  notices,
  loading,
  isSignedIn,
  onRequireSignIn,
  onOpenCreateNotice,
  onToggleHomework,
  onDeleteNotice,
}: NoticeBoardViewProps) {
  const [filterType, setFilterType] = useState<'all' | 'notice' | 'homework'>('all');
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const filtered = notices.filter((item) => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  const homeworkItems = notices.filter((n) => n.type === 'homework');
  const completedHomeworkCount = homeworkItems.filter((n) => n.isCompleted).length;

  const handleToggle = async (id: number) => {
    if (!isSignedIn) {
      onRequireSignIn();
      return;
    }
    setTogglingId(id);
    try {
      await onToggleHomework(id);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Header Card */}
      <section className="bg-gradient-to-r from-[#F4F0FF] via-[#F2F7FF] to-[#FFF6F0] border border-[#E7E1F5] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900">
            학급 공지사항 및 숙제 공유
          </h1>
          <p className="text-sm text-slate-600">
            중요한 일정과 과제를 확인하고, 완료한 숙제는 직접 체크해 보세요.
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="text-xs text-slate-500">내 숙제 완료 현황</div>
            <div className="text-lg font-bold text-slate-900 tabular-nums">
              {completedHomeworkCount} / {homeworkItems.length} 완료
            </div>
          </div>
          <button
            type="button"
            onClick={() => (isSignedIn ? onOpenCreateNotice() : onRequireSignIn())}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#5B5FEF] hover:bg-[#4B4FD8] rounded-xl transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            공지·숙제 등록
          </button>
        </div>
      </section>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[#F1EEFA] rounded-xl w-fit">
        {(
          [
            { key: 'all', label: '전체 보기' },
            { key: 'notice', label: '공지사항' },
            { key: 'homework', label: '숙제·수행평가' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilterType(tab.key)}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              filterType === tab.key
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notices List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-[#EAE5F5] rounded-2xl p-5 animate-pulse space-y-3"
            >
              <div className="h-4 w-48 bg-slate-200 rounded" />
              <div className="h-3 w-full bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#EAE5F5] rounded-2xl p-10 text-center space-y-2">
          <p className="text-sm font-medium text-slate-700">
            등록된 공지사항이나 숙제가 없습니다.
          </p>
          <p className="text-xs text-slate-500">
            새로운 학급 소식이나 과제를 등록해 친구들과 공유해 보세요.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => {
            const isHomework = item.type === 'homework';
            return (
              <article
                key={item.id}
                className={`rounded-2xl border p-5 transition-colors ${
                  item.isPinned
                    ? 'bg-[#FDFBFF] border-[#DDD4F7]'
                    : 'bg-white border-[#EAE5F5]'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    {/* Unboxed Metadata Line */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          isHomework ? 'text-[#0F766E]' : 'text-[#5B5FEF]'
                        }`}
                      >
                        {isHomework ? (
                          <BookOpen className="w-3.5 h-3.5" />
                        ) : (
                          <Megaphone className="w-3.5 h-3.5" />
                        )}
                        {isHomework ? '숙제' : '공지사항'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-slate-700">
                        {item.subject}
                      </span>
                      {item.isPinned && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                            <Pin className="w-3 h-3" />
                            상단 고정
                          </span>
                        </>
                      )}
                      {item.dueDate && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 text-slate-600 tabular-nums">
                            <Calendar className="w-3 h-3" />
                            마감 {item.dueDate}
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {item.title}
                    </h3>

                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {item.content}
                    </p>

                    <div className="pt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>작성자 {item.authorName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatRelativeTime(item.createdAt)}</span>
                      {isHomework && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-500 tabular-nums">
                            {item.completedCount}명 완료 체크
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isHomework && (
                      <button
                        type="button"
                        disabled={togglingId === item.id}
                        onClick={() => handleToggle(item.id)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap shrink-0 ${
                          item.isCompleted
                            ? 'bg-[#E3F7F0] border-[#BCEAD9] text-[#11644C]'
                            : 'bg-[#FAF8FE] border-[#E4DFF2] text-slate-700 hover:bg-[#F2EEFC]'
                        }`}
                      >
                        {item.isCompleted ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                        {item.isCompleted ? '완료함' : '완료 체크'}
                      </button>
                    )}

                    {item.isMine && (
                      <button
                        type="button"
                        aria-label="항목 삭제"
                        onClick={() => onDeleteNotice(item.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
