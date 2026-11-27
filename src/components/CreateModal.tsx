import React, { useEffect, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { compressImageFileToDataUrl } from '../utils/imageUpload.ts';

export type ComposerMode = 'post' | 'notice' | 'anonymous' | 'gallery';

interface CreateModalProps {
  open: boolean;
  initialMode: ComposerMode;
  onClose: () => void;
  onCreatePost: (payload: {
    category: string;
    caption: string;
    imageUrl: string;
    locationLabel: string;
  }) => Promise<void>;
  onCreateNotice: (payload: {
    type: 'notice' | 'homework';
    subject: string;
    title: string;
    content: string;
    dueDate: string;
    isPinned: boolean;
  }) => Promise<void>;
  onCreateAnonymous: (payload: {
    topic: string;
    title: string;
    content: string;
    alias: string;
  }) => Promise<void>;
  onCreateGallery: (payload: {
    title: string;
    description: string;
    eventTag: string;
    imageUrl: string;
    takenDate: string;
  }) => Promise<void>;
}

const ANON_ALIAS_PRESETS = [
  '익명의 벚꽃',
  '익명의 구름',
  '익명의 수달',
  '익명의 별빛',
  '익명의 딸기우유',
  '익명의 고양이',
];

export function CreateModal({
  open,
  initialMode,
  onClose,
  onCreatePost,
  onCreateNotice,
  onCreateAnonymous,
  onCreateGallery,
}: CreateModalProps) {
  const [mode, setMode] = useState<ComposerMode>(initialMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Feed Post fields
  const [postCategory, setPostCategory] = useState('일상');
  const [postCaption, setPostCaption] = useState('');
  const [postLocation, setPostLocation] = useState('2학년 3반 교실');
  const [postImageUrl, setPostImageUrl] = useState('');

  // Notice/Homework fields
  const [noticeType, setNoticeType] = useState<'notice' | 'homework'>('homework');
  const [noticeSubject, setNoticeSubject] = useState('수학');
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticeDueDate, setNoticeDueDate] = useState('');
  const [noticePinned, setNoticePinned] = useState(false);

  // Anonymous fields
  const [anonTopic, setAnonTopic] = useState('고민상담');
  const [anonTitle, setAnonTitle] = useState('');
  const [anonContent, setAnonContent] = useState('');
  const [anonAlias, setAnonAlias] = useState('익명의 벚꽃');

  // Gallery fields
  const [galleryTitle, setGalleryTitle] = useState('');
  const [galleryDescription, setGalleryDescription] = useState('');
  const [galleryTag, setGalleryTag] = useState('우리반일상');
  const [galleryImageUrl, setGalleryImageUrl] = useState('');
  const [galleryDate, setGalleryDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
    }
  }, [open, initialMode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'post' | 'gallery'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 1280, 0.82);
      if (target === 'post') setPostImageUrl(dataUrl);
      else setGalleryImageUrl(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 로드 실패');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'post') {
        if (!postCaption.trim()) {
          throw new Error('게시글 내용을 입력해 주세요.');
        }
        await onCreatePost({
          category: postCategory,
          caption: postCaption,
          imageUrl: postImageUrl,
          locationLabel: postLocation,
        });
        setPostCaption('');
        setPostImageUrl('');
      } else if (mode === 'notice') {
        if (!noticeTitle.trim() || !noticeContent.trim()) {
          throw new Error('제목과 내용을 모두 입력해 주세요.');
        }
        await onCreateNotice({
          type: noticeType,
          subject: noticeSubject,
          title: noticeTitle,
          content: noticeContent,
          dueDate: noticeDueDate,
          isPinned: noticePinned,
        });
        setNoticeTitle('');
        setNoticeContent('');
      } else if (mode === 'anonymous') {
        if (!anonTitle.trim() || !anonContent.trim()) {
          throw new Error('제목과 내용을 모두 입력해 주세요.');
        }
        await onCreateAnonymous({
          topic: anonTopic,
          title: anonTitle,
          content: anonContent,
          alias: anonAlias,
        });
        setAnonTitle('');
        setAnonContent('');
      } else if (mode === 'gallery') {
        if (!galleryTitle.trim() || !galleryImageUrl.trim()) {
          throw new Error('사진 제목과 이미지를 선택해 주세요.');
        }
        await onCreateGallery({
          title: galleryTitle,
          description: galleryDescription,
          eventTag: galleryTag,
          imageUrl: galleryImageUrl,
          takenDate: galleryDate,
        });
        setGalleryTitle('');
        setGalleryDescription('');
        setGalleryImageUrl('');
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '등록 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="새 콘텐츠 작성"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white border border-[#EAE5F5] rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">새 글 올리기</h2>
          <button
            type="button"
            aria-label="창 닫기"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-4 gap-1 p-1 bg-[#F1EEFA] rounded-xl">
            {(
              [
                { key: 'post', label: '인스타 피드' },
                { key: 'notice', label: '공지·숙제' },
                { key: 'anonymous', label: '익명 글' },
                { key: 'gallery', label: '학급 갤러리' },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setMode(item.key);
                  setError(null);
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  mode === item.key
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="p-5 space-y-4 overflow-y-auto"
        >
          {error && (
            <div className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5">
              {error}
            </div>
          )}

          {mode === 'post' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    카테고리
                  </label>
                  <select
                    value={postCategory}
                    onChange={(e) => setPostCategory(e.target.value)}
                    className="w-full text-sm bg-[#FAF8FE] border border-[#EAE5F5] rounded-xl px-3 py-2 text-slate-900"
                  >
                    <option value="일상">일상</option>
                    <option value="공부인증">공부인증</option>
                    <option value="동아리">동아리</option>
                    <option value="질문">질문</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    장소
                  </label>
                  <input
                    type="text"
                    value={postLocation}
                    onChange={(e) => setPostLocation(e.target.value)}
                    placeholder="2학년 3반 교실"
                    className="w-full text-sm bg-[#FAF8FE] border border-[#EAE5F5] rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  사진 첨부 (선택)
                </label>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#5B5FEF] bg-[#F2EEFC] hover:bg-[#E7E0FA] rounded-xl cursor-pointer transition-colors shrink-0">
                    <ImagePlus className="w-4 h-4" />
                    내 사진 선택
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'post')}
                      className="sr-only"
                    />
                  </label>
                  <input
                    type="text"
                    value={
                      postImageUrl.startsWith('data:')
                        ? '이미지 파일 선택됨'
                        : postImageUrl
                    }
                    onChange={(e) => setPostImageUrl(e.target.value)}
                    placeholder="또는 이미지 주소(https://...)"
                    className="flex-1 text-xs bg-[#FAF8FE] border border-[#EAE5F5] rounded-xl px-3 py-2 text-slate-700"
                  />
                  {postImageUrl && (
                    <button
                      type="button"
                      onClick={() => setPostImageUrl('')}
                      className="text-xs text-slate-500 hover:text-rose-600 px-1"
                    >
                      지우기
                    </button>
                  )}
                </div>
                {postImageUrl && (
                  <img
                    src={postImageUrl}
                    alt="미리보기"
                    className="w-full max-h-48 object-cover rounded-xl border border-[#EAE5F5]"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  이야기
                </label>
                <textarea
                  rows={4}
                  value={postCaption}
                  onChange={(e) => setPostCaption(e.target.value)}
                  placeholder="오늘 교실에서 있었던 일이나 친구들과 나누고 싶은 이야기를 적어보세요."
                  className="w-full text-sm bg-[#FAF8FE] border border-[#EAE5F5] rounded-xl px-3.5 py-2.5 text-slate-900"
                />
              </div>
            </>
          )}

          {mode === 'notice' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    분류
                  </label>
                  <select
                    value={noticeType}
                    onChange={(e) =>
                      setNoticeType(
                        e.target.value === 'homework' ? 'homework' : 'notice'
                      )
                    }
                    className="w-full text-sm bg-[#FAF8FE] border border-[#EAE5F5] rounded-xl px-3 py-2 text-slate-900"
                  >
                    <option value="homework">숙제·수행평가</option>
                    <option value="notice">공지사항</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    과목 / 영역
                  </label>
                  <input
                    type="text"
                    value={noticeSubject}
                    onChange={(e) => setNoticeSubject(e.target.value)}
                    placeholder="수학, 국어, 학급일반"
                    className="w-full text-sm bg-[#FAF8FE] border border-[#EAE5F5] rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  제목
                </label>
                <input
                  type="text"
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  placeholder="예: 수학 II 워크북 32~38쪽 제출 안내"
                  className="w-full text-sm bg-[#FAF8FE] border border-[#EAE5F5] rounded-xl px-3.5 py-2 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    마감일 (선택)
                  </label>
                  <input
                    type="date"
                    value={noticeDueDate}
                    onChange={(e) => setNoticeDueDate(e.target.value)}
                    className="w-full text-sm bg-[#FAF8FE] border border-[#EAE5F5] rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
                <label className="flex items-center gap-2 pt-5 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noticePinned}
                    onChange={(e) => setNoticePinned(e.target.checked)}
                    className="rounded border-slate-300 text-[#5B5FEF]"
                  />
                  상단에 고정하기
                </label>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  상세 안내
                </label>
                <textarea
                  rows={4}
                  value={noticeContent}
                  onChange={(e) => setNoticeContent(e.target.value)}
                  placeholder="준비물, 제출 방법, 주의사항 등을 적어주세요."
                  className="w-full text-sm bg-[#FAF8FE] border border-[#EAE5F5] rounded-xl px-3.5 py-2.5 text-slate-900"
                />
              </div>
            </>
          )}

          {mode === 'anonymous' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    주제
                  </label>
                  <select
                    value={anonTopic}
                    onChange={(e) => setAnonTopic(e.target.value)}
                    className="w-full text-sm bg-[#FAF8FE] border border-[#EAE5F5] rounded-xl px-3 py-2 text-slate-900"
                  >
                    <option value="고민상담">고민상담</option>
                    <option value="건의사항">건의사항</option>
                    <option value="칭찬해요">칭찬해요</option>
                    <option value="자유">자유</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    익명 닉네임
                  </label>
                  <select
                    value={anonAlias}
                    onChange={(e) => setAnonAlias(e.target.value)}
                    className="w-full text-sm bg-[#FAF8FE] border border-[#EAE5F5] rounded-xl px-3 py-2 text-slate-900"
                  >
                    {ANON_ALIAS_PRESETS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  제목
                </label>
                <input
                  type="text"
                  value={anonTitle}
                  onChange={(e) => setAnonTitle(e.target.value)}
                  placeholder="익명 글 제목을 입력해 주세요"
                  className="w-full text-sm bg-[#FAF8FE] border border-[#EAE5F5] rounded-xl px-3.5 py-2 text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  내용 (실명은 공개되지 않습니다)
                </label>
                <textarea
                  rows={4}
                  value={anonContent}
                  onChange={(e) => setAnonContent(e.target.value)}
                  placeholder="친구들에게 전하고 싶은 솔직한 이야기나 칭찬을 적어보세요."
                  className="w-full text-sm bg-[#FAF8FE] border border-[#EAE5F5] rounded-xl px-3.5 py-2.5 text-slate-900"
                />
              </div>
            </>
          )}

          {mode === 'gallery' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    활동 분류
                  </label>
                  <select
                    value={galleryTag}
                    onChange={(e) => setGalleryTag(e.target.value)}
                    className="w-full text-sm bg-[#FAF8FE] border border-[#EAE5F5] rounded-xl px-3 py-2 text-slate-900"
                  >
                    <option value="현장체험학습">현장체험학습</option>
                    <option value="과학실험">과학실험</option>
                    <option value="체육대회">체육대회</option>
                    <option value="우리반일상">우리반일상</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    촬영 날짜
                  </label>
                  <input
                    type="date"
                    value={galleryDate}
                    onChange={(e) => setGalleryDate(e.target.value)}
                    className="w-full text-sm bg-[#FAF8FE] border border-[#EAE5F5] rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  활동 사진 선택 (필수)
                </label>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#5B5FEF] bg-[#F2EEFC] hover:bg-[#E7E0FA] rounded-xl cursor-pointer transition-colors shrink-0">
                    <ImagePlus className="w-4 h-4" />
                    사진 파일 선택
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'gallery')}
                      className="sr-only"
                    />
                  </label>
                  <input
                    type="text"
                    value={
                      galleryImageUrl.startsWith('data:')
                        ? '이미지 파일 선택됨'
                        : galleryImageUrl
                    }
                    onChange={(e) => setGalleryImageUrl(e.target.value)}
                    placeholder="또는 이미지 주소(https://...)"
                    className="flex-1 text-xs bg-[#FAF8FE] border border-[#EAE5F5] rounded-xl px-3 py-2 text-slate-700"
                  />
                </div>
                {galleryImageUrl && (
                  <img
                    src={galleryImageUrl}
                    alt="갤러리 미리보기"
                    className="w-full max-h-48 object-cover rounded-xl border border-[#EAE5F5]"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  사진 제목
                </label>
                <input
                  type="text"
                  value={galleryTitle}
                  onChange={(e) => setGalleryTitle(e.target.value)}
                  placeholder="예: 2학년 3반 가을 체육대회 응원전"
                  className="w-full text-sm bg-[#FAF8FE] border border-[#EAE5F5] rounded-xl px-3.5 py-2 text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  사진 설명 (선택)
                </label>
                <textarea
                  rows={2}
                  value={galleryDescription}
                  onChange={(e) => setGalleryDescription(e.target.value)}
                  placeholder="사진 속 추억을 간단히 적어주세요."
                  className="w-full text-sm bg-[#FAF8FE] border border-[#EAE5F5] rounded-xl px-3.5 py-2 text-slate-900"
                />
              </div>
            </>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-[#5B5FEF] hover:bg-[#4B4FD8] disabled:opacity-50 rounded-xl transition-colors"
            >
              {submitting ? '올리는 중...' : '등록하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
