import JSZip from 'jszip';

// 辅助类型
export interface ImageInfo {
  src: string;
  alt: string;
  naturalWidth: number;
  naturalHeight: number;
  displayWidth: number;
  displayHeight: number;
  format: string;
  size: number;
}

/* ------------------ 格式化与计算 ------------------ */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return 'Unknown';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const getUniqueFormats = (images: ImageInfo[]): string[] => {
  const formats = new Set<string>();
  images.forEach((img) => {
    if (img.format) formats.add(img.format.toLowerCase());
  });
  return Array.from(formats).sort();
};

export const getUniqueSizes = (images: ImageInfo[]): { size: string; count: number }[] => {
  const sizeMap = new Map<string, number>();
  images.forEach((img) => {
    const key = `${img.naturalWidth}x${img.naturalHeight}`;
    sizeMap.set(key, (sizeMap.get(key) || 0) + 1);
  });
  return Array.from(sizeMap.entries()).map(([size, count]) => ({ size, count }));
};

export const getFileSizeRanges = (
  images: ImageInfo[],
): { range: string; count: number }[] => {
  if (images.length === 0) return [];
  const ranges = [
    { min: 0, max: 100 * 1024, label: '≤100KB' },
    { min: 100 * 1024, max: 500 * 1024, label: '100KB-500KB' },
    { min: 500 * 1024, max: 2 * 1024 * 1024, label: '500KB-2MB' },
    { min: 2 * 1024 * 1024, max: 5 * 1024 * 1024, label: '2MB-5MB' },
    { min: 5 * 1024 * 1024, max: Infinity, label: '≥5MB' },
  ];
  return ranges
    .map((r) => ({
      range: r.label,
      count: images.filter(
        (img) => img.size >= r.min && (r.max === Infinity ? true : img.size < r.max),
      ).length,
    }))
    .filter((r) => r.count > 0);
};

/* ------------------ 图片类别 & 展示尺寸 ------------------ */
const IMAGE_CATEGORIES = {
  ICON: { maxSize: 64, displaySize: 24 },
  THUMBNAIL: { maxSize: 300, displaySize: 80 },
  CONTENT: { maxSize: 800, displaySize: 160 },
  LARGE: { minSize: 800, displaySize: 240 },
} as const;

export const getImageCategory = (w: number, h: number): keyof typeof IMAGE_CATEGORIES => {
  const size = Math.max(w, h);
  if (size <= IMAGE_CATEGORIES.ICON.maxSize) return 'ICON';
  if (size <= IMAGE_CATEGORIES.THUMBNAIL.maxSize) return 'THUMBNAIL';
  if (size <= IMAGE_CATEGORIES.CONTENT.maxSize) return 'CONTENT';
  return 'LARGE';
};

export const calculateDisplaySize = (
  naturalWidth: number,
  naturalHeight: number,
): { width: number; height: number } => {
  const cat = getImageCategory(naturalWidth, naturalHeight);
  const { displaySize } = IMAGE_CATEGORIES[cat];
  if (cat === 'ICON') return { width: displaySize, height: displaySize };
  const ratio = naturalHeight / naturalWidth;
  return { width: displaySize, height: Math.round(displaySize * ratio) };
};

/* ------------------ URL & 格式处理 ------------------ */
export const isValidImageUrl = (url: string): boolean => {
  if (url.startsWith('data:') && !url.startsWith('data:image/svg+xml')) return false;
  try {
    new URL(url);
  } catch {
    return false;
  }
  return !['.js', '.css', '.html', '.php'].some((ext) => url.toLowerCase().endsWith(ext));
};

export const normalizeImageFormat = (format: string): string => {
  const map: Record<string, string> = {
    jpeg: 'jpg',
    'svg+xml': 'svg',
  };
  format = format.toLowerCase();
  return map[format] || format;
};

/* ------------------ 生成文件名 ------------------ */
export const generateFilename = (
  pattern: string,
  index: number,
  originalName: string,
): string => {
  const dateStr = new Date().toISOString().slice(0, 10);
  return pattern
    .replace(/\{index\}/g, String(index))
    .replace(/\{date\}/g, dateStr)
    .replace(/\{name\}|\[name\]/g, originalName.split(/[?#]/)[0]);
}; 