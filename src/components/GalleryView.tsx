import { useEffect, useState } from 'react';
import {
  Camera,
  Heart,
  ImageOff,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type { GalleryPhoto } from '../types/community.ts';

interface GalleryViewProps {
  photos: GalleryPhoto[];
  loading: boolean;
  isSignedIn: boolean;
  onRequireSignIn: () => void;
  onOpenUploadGallery: () => void;
  onToggleLike: (photoId: number) => Promise<void>;
  onDeletePhoto: (photoId: number) => Promise<void>;
}

const EVENT_TAGS = [
  '전체',
  '현장체험학습',
  '과학실험',
  '체육대회',
  '우리반일상',
] as const;

export function GalleryView({
  photos,
  loading,
  isSignedIn,
  onRequireSignIn,
  onOpenUploadGallery,
  onToggleLike,
  onDeletePhoto,
}: GalleryViewProps) {
  const [selectedTag, setSelectedTag] = useState<string>('전체');
  const [activePhoto, setActivePhoto] = useState<GalleryPhoto | null>(null);
  const [brokenMap, setBrokenMap] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePhoto(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Keep lightbox photo synced after like/delete
  const currentLightbox = activePhoto
    ? photos.find((p) => p.id === activePhoto.id) || null
    : null;

  const filtered = photos.filter((photo) => {
    if (selectedTag === '전체') return true;
    return photo.eventTag === selectedTag;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="bg-gradient-to-r from-[#EEF7FF] via-[#F4F0FF] to-[#FFF4F0] border border-[#E6E0F5] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B5FEF]">
            <Camera className="w-3.5 h-3.5" />
            추억 아카이브
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            우리 반 활동 사진 갤러리
          </h1>
          <p className="text-sm text-slate-600">
            현장체험학습, 체육대회, 과학실험 등 우리 반의 빛나는 순간을 함께 모아보세요.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            isSignedIn ? onOpenUploadGallery() : onRequireSignIn()
          }
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#5B5FEF] hover:bg-[#4B4FD8] rounded-xl transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          활동 사진 올리기
        </button>
      </section>

      {/* Filter Bar */}
      <div className="flex items-center gap-1 p-1 bg-[#F1EEFA] rounded-xl overflow-x-auto max-w-full w-fit">
        {EVENT_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => setSelectedTag(tag)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              selectedTag === tag
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Bento / Masonry Gallery Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="aspect-[4/3] bg-white border border-[#EAE5F5] rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#EAE5F5] rounded-2xl p-10 text-center space-y-3">
          <p className="text-sm font-medium text-slate-700">
            이 카테고리에 등록된 활동 사진이 아직 없어요.
          </p>
          <button
            type="button"
            onClick={() =>
              isSignedIn ? onOpenUploadGallery() : onRequireSignIn()
            }
            className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-[#5B5FEF] hover:bg-[#4B4FD8] rounded-xl transition-colors"
          >
            첫 사진 업로드하기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-auto">
          {filtered.map((photo, index) => {
            const isFeatured = index === 0 && filtered.length >= 3;
            return (
              <div
                key={photo.id}
                className={`group bg-white border border-[#EAE5F5] rounded-2xl overflow-hidden flex flex-col ${
                  isFeatured ? 'sm:col-span-2 lg:col-span-2 lg:row-span-2' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActivePhoto(photo)}
                  className={`relative w-full overflow-hidden bg-[#F4F1FA] text-left focus:outline-none ${
                    isFeatured ? 'aspect-[16/10] lg:flex-1' : 'aspect-[4/3]'
                  }`}
                >
                  {brokenMap[photo.id] ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400 bg-gradient-to-br from-[#F2EEFF] to-[#EAF5FF]">
                      <ImageOff className="w-7 h-7" />
                      <span className="text-xs text-slate-500">
                        {photo.title}
                      </span>
                    </div>
                  ) : (
                    <img
                      src={photo.imageUrl}
                      alt={photo.title}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setBrokenMap((prev) => ({ ...prev, [photo.id]: true }))
                      }
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/75 via-black/35 to-transparent pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <div className="text-xs text-white/85 flex items-center gap-1.5">
                      <span>{photo.eventTag}</span>
                      {photo.takenDate && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{photo.takenDate}</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-bold leading-snug line-clamp-1">
                      {photo.title}
                    </h3>
                  </div>
                </button>

                <div className="px-4 py-3 flex items-center justify-between gap-2 bg-white">
                  <div className="text-xs text-slate-500 truncate">
                    촬영 {photo.authorName}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        isSignedIn ? onToggleLike(photo.id) : onRequireSignIn()
                      }
                      className={`inline-flex items-center gap-1 text-xs font-medium transition-colors ${
                        photo.isLiked
                          ? 'text-rose-600'
                          : 'text-slate-600 hover:text-rose-600'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          photo.isLiked ? 'fill-rose-500 text-rose-500' : ''
                        }`}
                      />
                      <span className="tabular-nums">{photo.likesCount}</span>
                    </button>

                    {photo.isMine && (
                      <button
                        type="button"
                        aria-label="사진 삭제"
                        onClick={() => onDeletePhoto(photo.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {currentLightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={currentLightbox.title}
          onClick={() => setActivePhoto(null)}
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 sm:p-8"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl"
          >
            <button
              type="button"
              aria-label="닫기"
              onClick={() => setActivePhoto(null)}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-slate-900/80 text-white hover:bg-slate-900 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="bg-slate-950 max-h-[65vh] flex items-center justify-center overflow-hidden">
              <img
                src={currentLightbox.imageUrl}
                alt={currentLightbox.title}
                referrerPolicy="no-referrer"
                className="max-h-[65vh] w-auto object-contain"
              />
            </div>

            <div className="p-5 sm:p-6 space-y-2 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <span className="font-semibold text-[#5B5FEF]">
                    {currentLightbox.eventTag}
                  </span>
                  {currentLightbox.takenDate && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {currentLightbox.takenDate}
                      </span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span>올린 친구 {currentLightbox.authorName}</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      isSignedIn
                        ? onToggleLike(currentLightbox.id)
                        : onRequireSignIn()
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                      currentLightbox.isLiked
                        ? 'bg-rose-50 border-rose-200 text-rose-600'
                        : 'bg-[#FAF8FE] border-[#EAE5F5] text-slate-700 hover:bg-rose-50'
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        currentLightbox.isLiked
                          ? 'fill-rose-500 text-rose-500'
                          : ''
                      }`}
                    />
                    <span className="tabular-nums">
                      좋아요 {currentLightbox.likesCount}
                    </span>
                  </button>

                  {currentLightbox.isMine && (
                    <button
                      type="button"
                      onClick={async () => {
                        await onDeletePhoto(currentLightbox.id);
                        setActivePhoto(null);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      삭제
                    </button>
                  )}
                </div>
              </div>

              <h2 className="text-lg font-bold text-slate-900">
                {currentLightbox.title}
              </h2>
              {currentLightbox.description && (
                <p className="text-sm text-slate-600 leading-relaxed">
                  {currentLightbox.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
