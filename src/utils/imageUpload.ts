export async function compressImageFileToDataUrl(
  file: File,
  maxDimension = 1280,
  quality = 0.82
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일(JPG, PNG, WebP)만 업로드할 수 있습니다.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('올바른 이미지 파일이 아닙니다.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('이미지 처리에 실패했습니다.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function getAvatarTintStyle(tint: string): {
  bg: string;
  text: string;
  ring: string;
} {
  switch (tint) {
    case 'sky':
      return {
        bg: 'bg-[#E3F2FD]',
        text: 'text-[#1E5B94]',
        ring: 'ring-[#BDDDFB]',
      };
    case 'mint':
      return {
        bg: 'bg-[#E2F7F0]',
        text: 'text-[#146C53]',
        ring: 'ring-[#BCEAD9]',
      };
    case 'peach':
      return {
        bg: 'bg-[#FFF0E6]',
        text: 'text-[#9A4B1C]',
        ring: 'ring-[#FAD7BE]',
      };
    case 'rose':
      return {
        bg: 'bg-[#FFEAF1]',
        text: 'text-[#9E2450]',
        ring: 'ring-[#F9C7D8]',
      };
    case 'lavender':
    default:
      return {
        bg: 'bg-[#EFEAFF]',
        text: 'text-[#4B3A99]',
        ring: 'ring-[#D7CCFB]',
      };
  }
}
