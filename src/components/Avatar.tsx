import { useState } from 'react';
import { getAvatarTintStyle } from '../utils/imageUpload.ts';

interface AvatarProps {
  name: string;
  imageUrl?: string;
  tint?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
};

export function Avatar({
  name,
  imageUrl,
  tint = 'lavender',
  size = 'md',
}: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const style = getAvatarTintStyle(tint);
  const initial = (name || '반').trim().slice(0, 1);

  if (imageUrl && !imgFailed) {
    return (
      <img
        src={imageUrl}
        alt={`${name} 프로필`}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`${SIZE_CLASSES[size]} rounded-full object-cover ring-2 ${style.ring} shrink-0`}
      />
    );
  }

  return (
    <div
      aria-label={`${name} 아바타`}
      className={`${SIZE_CLASSES[size]} ${style.bg} ${style.text} ring-2 ${style.ring} rounded-full flex items-center justify-center font-semibold shrink-0 select-none`}
    >
      {initial}
    </div>
  );
}
