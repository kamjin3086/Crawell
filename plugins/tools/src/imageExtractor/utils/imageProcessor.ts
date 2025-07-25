import type { DownloadConfig } from '../components/DownloadDialog';

interface ProcessedImageResult {
  blob: Blob;
  filename: string;
  format: string;
}

export interface ProcessOptions {
  format?: {
    enabled: boolean;
    type: string;
  };
  compress?: {
    enabled: boolean;
    quality: number;
  };
  resize?: {
    enabled: boolean;
    width: number;
    height: number;
    keepRatio: boolean;
  };
}

// 支持处理的图片格式
const PROCESSABLE_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];
const SUPPORTED_OUTPUT_FORMATS = ['jpeg', 'png', 'webp'];

/**
 * 检查格式是否可以进行高级处理（压缩、转换等）
 */
function canProcessFormat(format: string): boolean {
  return PROCESSABLE_FORMATS.includes(format.toLowerCase());
}

/**
 * 检查输出格式是否受支持
 */
function isSupportedOutputFormat(format: string): boolean {
  return SUPPORTED_OUTPUT_FORMATS.includes(format.toLowerCase());
}

/**
 * 处理单张图片
 */
async function processImage(
  imageUrl: string,
  originalFormat: string,
  options: ProcessOptions
): Promise<ProcessedImageResult> {
  // 检查是否需要进行高级处理
  const needsProcessing = (
    (options.format?.enabled && options.format.type !== originalFormat) ||
    (options.compress?.enabled) ||
    (options.resize?.enabled)
  );

  // 如果不需要处理，或者格式不支持处理，直接返回原图
  if (!needsProcessing || !canProcessFormat(originalFormat)) {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      return {
        blob,
        filename: '',
        format: originalFormat
      };
    } catch (error) {
      throw new Error(`Failed to get original image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Failed to create Canvas context');
        }

        // 计算目标尺寸
        let { width: targetWidth, height: targetHeight } = calculateTargetSize(
          img.naturalWidth,
          img.naturalHeight,
          options.resize
        );

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // 绘制图片
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // 确定输出格式 - 如果目标格式不支持，保持原格式
        let outputFormat = `image/${originalFormat}`;
        let finalFormat = originalFormat;
        
        if (options.format?.enabled && isSupportedOutputFormat(options.format.type)) {
          outputFormat = `image/${options.format.type}`;
          finalFormat = options.format.type;
        }

        // 确定质量设置 - 只对支持质量参数的格式生效
        const quality = options.compress?.enabled && ['jpeg', 'jpg', 'webp'].includes(finalFormat.toLowerCase())
          ? options.compress.quality / 100 
          : 0.92;

        // 转换为 Blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              // 如果处理失败，回退到原图
              fallbackToOriginal();
              return;
            }

            resolve({
              blob,
              filename: '',
              format: finalFormat
            });
          },
          outputFormat,
          quality
        );
      } catch (error) {
        fallbackToOriginal();
      }
    };

    img.onerror = () => {
      fallbackToOriginal();
    };

    // 回退到原图的函数
    const fallbackToOriginal = async () => {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        resolve({
          blob,
          filename: '',
          format: originalFormat
        });
      } catch (fetchError) {
        reject(new Error(`Image processing failed, original image retrieval also failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`));
      }
    };

    img.src = imageUrl;
  });
}

/**
 * 计算目标尺寸
 */
function calculateTargetSize(
  originalWidth: number,
  originalHeight: number,
  resizeOptions?: {
    enabled: boolean;
    width: number;
    height: number;
    keepRatio: boolean;
  }
): { width: number; height: number } {
  if (!resizeOptions?.enabled) {
    return { width: originalWidth, height: originalHeight };
  }

  const { width: targetWidth, height: targetHeight, keepRatio } = resizeOptions;

  if (!keepRatio) {
    return { width: targetWidth, height: targetHeight };
  }

  // 保持比例的情况下，计算合适的尺寸
  const originalRatio = originalWidth / originalHeight;
  const targetRatio = targetWidth / targetHeight;

  if (originalRatio > targetRatio) {
    // 原图更宽，以宽度为准
    return {
      width: targetWidth,
      height: Math.round(targetWidth / originalRatio)
    };
  } else {
    // 原图更高，以高度为准
    return {
      width: Math.round(targetHeight * originalRatio),
      height: targetHeight
    };
  }
}

/**
 * 批量处理图片
 */
export async function processBatchImages(
  images: Array<{ url: string; format: string; filename: string }>,
  options: ProcessOptions,
  onProgress?: (current: number, total: number) => void
): Promise<ProcessedImageResult[]> {
  const results: ProcessedImageResult[] = [];
  
  for (let i = 0; i < images.length; i++) {
    const { url, format, filename } = images[i];
    
    try {
      const result = await processImage(url, format, options);
      result.filename = filename;
      results.push(result);
      
      onProgress?.(i + 1, images.length);
    } catch (error) {
      console.error(`Failed to process image: ${url}`, error);
      // 如果处理失败，使用原始图片
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        results.push({
          blob,
          filename,
          format
        });
      } catch (fetchError) {
        console.error(`Failed to get original image: ${url}`, fetchError);
      }
      
      onProgress?.(i + 1, images.length);
    }
  }
  
  return results;
} 